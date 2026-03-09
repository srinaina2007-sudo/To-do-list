import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize SQLite Database
const db = new Database('tasks.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    deadline TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    title TEXT NOT NULL,
    is_completed INTEGER DEFAULT 0,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_stats (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    points INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    last_claim_date TEXT
  );
  
  INSERT OR IGNORE INTO user_stats (id, points, current_streak) VALUES (1, 0, 0);
`);

try {
  db.exec('ALTER TABLE tasks ADD COLUMN position INTEGER DEFAULT 0');
} catch (e) {
  // Column might already exist
}

try {
  db.exec('ALTER TABLE subtasks ADD COLUMN position INTEGER DEFAULT 0');
} catch (e) {
  // Column might already exist
}

try {
  db.exec('ALTER TABLE tasks ADD COLUMN points_claimed INTEGER DEFAULT 0');
} catch (e) {
  // Column might already exist
}

try {
  db.exec('ALTER TABLE tasks ADD COLUMN image_url TEXT');
} catch (e) {
  // Column might already exist
}

// API Routes
app.get('/api/stats', (req, res) => {
  try {
    const stats = db.prepare('SELECT * FROM user_stats WHERE id = 1').get() as any;
    
    if (stats && stats.last_claim_date) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (stats.last_claim_date !== today && stats.last_claim_date !== yesterdayStr) {
        // Missed a day, reset streak
        db.prepare('UPDATE user_stats SET current_streak = 0 WHERE id = 1').run();
        stats.current_streak = 0;
      }
    }
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.post('/api/tasks/:id/claim', (req, res) => {
  const { id } = req.params;
  
  try {
    const task = db.prepare('SELECT status, points_claimed FROM tasks WHERE id = ?').get(id) as any;
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    if (task.status !== 'completed') {
      return res.status(400).json({ error: 'Task is not completed' });
    }
    
    if (task.points_claimed) {
      return res.status(400).json({ error: 'Points already claimed for this task' });
    }

    const stats = db.prepare('SELECT * FROM user_stats WHERE id = 1').get() as any;
    const pointsToAward = 10 + (stats.current_streak * 2); // Base 10 points + 2 for each streak day

    const updateStats = db.prepare('UPDATE user_stats SET points = points + ? WHERE id = 1');
    const updateTask = db.prepare('UPDATE tasks SET points_claimed = 1 WHERE id = ?');
    
    const transaction = db.transaction(() => {
      updateStats.run(pointsToAward);
      updateTask.run(id);
    });
    
    transaction();
    
    const updatedStats = db.prepare('SELECT * FROM user_stats WHERE id = 1').get();
    res.json({ success: true, awarded: pointsToAward, stats: updatedStats });
  } catch (error) {
    console.error('Error claiming points:', error);
    res.status(500).json({ error: 'Failed to claim points' });
  }
});

app.get('/api/tasks', (req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY position ASC, created_at DESC').all();
    const subtasks = db.prepare('SELECT * FROM subtasks ORDER BY position ASC').all();

    const tasksWithSubtasks = tasks.map((task: any) => ({
      ...task,
      position: task.position,
      pointsClaimed: task.points_claimed === 1,
      imageUrl: task.image_url,
      subtasks: subtasks.filter((st: any) => st.task_id === task.id).map((st: any) => ({
        id: st.id,
        title: st.title,
        isCompleted: st.is_completed === 1,
        position: st.position
      }))
    }));

    res.json(tasksWithSubtasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.post('/api/tasks', (req, res) => {
  const { id, title, description, deadline, status, createdAt, subtasks, position, imageUrl } = req.body;
  
  try {
    const insertTask = db.prepare('INSERT INTO tasks (id, title, description, deadline, status, created_at, position, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    insertTask.run(id, title, description, deadline, status, createdAt, position || 0, imageUrl || null);

    if (subtasks && subtasks.length > 0) {
      const insertSubtask = db.prepare('INSERT INTO subtasks (id, task_id, title, is_completed, position) VALUES (?, ?, ?, ?, ?)');
      const insertMany = db.transaction((sts) => {
        for (let i = 0; i < sts.length; i++) {
          const st = sts[i];
          insertSubtask.run(st.id, id, st.title, st.isCompleted ? 1 : 0, st.position ?? i);
        }
      });
      insertMany(subtasks);
    }

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, deadline, status, subtasks, position, imageUrl } = req.body;

  try {
    const oldTask = db.prepare('SELECT status, points_claimed FROM tasks WHERE id = ?').get(id) as any;

    const updateTask = db.prepare('UPDATE tasks SET title = ?, description = ?, deadline = ?, status = ?, position = ?, image_url = ? WHERE id = ?');
    updateTask.run(title, description, deadline, status, position || 0, imageUrl || null, id);

    // Update subtasks: delete existing and insert new ones
    db.prepare('DELETE FROM subtasks WHERE task_id = ?').run(id);
    
    if (subtasks && subtasks.length > 0) {
      const insertSubtask = db.prepare('INSERT INTO subtasks (id, task_id, title, is_completed, position) VALUES (?, ?, ?, ?, ?)');
      const insertMany = db.transaction((sts) => {
        for (let i = 0; i < sts.length; i++) {
          const st = sts[i];
          insertSubtask.run(st.id, id, st.title, st.isCompleted ? 1 : 0, st.position ?? i);
        }
      });
      insertMany(subtasks);
    }

    // Streak logic and automatic points
    if (oldTask && oldTask.status !== 'completed' && status === 'completed') {
      const today = new Date().toISOString().split('T')[0];
      const stats = db.prepare('SELECT * FROM user_stats WHERE id = 1').get() as any;
      
      let newStreak = stats.current_streak;
      const lastClaimDate = stats.last_claim_date;
      
      if (lastClaimDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (lastClaimDate === yesterdayStr) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
      }

      let pointsToAdd = 0;
      if (!oldTask.points_claimed) {
        pointsToAdd = 10 + (newStreak * 2);
        db.prepare('UPDATE tasks SET points_claimed = 1 WHERE id = ?').run(id);
      }
      
      db.prepare('UPDATE user_stats SET current_streak = ?, last_claim_date = ?, points = points + ? WHERE id = 1').run(newStreak, today, pointsToAdd);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.post('/api/tasks/reorder', (req, res) => {
  const { tasks } = req.body; // array of { id, position }
  try {
    const updatePosition = db.prepare('UPDATE tasks SET position = ? WHERE id = ?');
    const updateMany = db.transaction((items) => {
      for (const item of items) {
        updatePosition.run(item.position, item.id);
      }
    });
    updateMany(tasks);
    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering tasks:', error);
    res.status(500).json({ error: 'Failed to reorder tasks' });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

app.post('/api/tasks/bulk-action', (req, res) => {
  const { ids, action } = req.body; // action: 'delete' | 'complete'
  
  try {
    if (action === 'delete') {
      const deleteMany = db.transaction((taskIds) => {
        for (const id of taskIds) {
          db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
        }
      });
      deleteMany(ids);
    } else if (action === 'complete') {
      const completeMany = db.transaction((taskIds) => {
        const today = new Date().toISOString().split('T')[0];
        const stats = db.prepare('SELECT * FROM user_stats WHERE id = 1').get() as any;
        
        let newStreak = stats.current_streak;
        const lastClaimDate = stats.last_claim_date;
        
        if (lastClaimDate !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          
          if (lastClaimDate === yesterdayStr) {
            newStreak += 1;
          } else {
            newStreak = 1;
          }
        }

        let totalPointsToAdd = 0;

        for (const id of taskIds) {
          const oldTask = db.prepare('SELECT status, points_claimed FROM tasks WHERE id = ?').get(id) as any;
          if (oldTask && oldTask.status !== 'completed') {
            db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run('completed', id);
            
            if (!oldTask.points_claimed) {
              totalPointsToAdd += 10 + (newStreak * 2);
              db.prepare('UPDATE tasks SET points_claimed = 1 WHERE id = ?').run(id);
            }
          }
        }

        if (totalPointsToAdd > 0 || lastClaimDate !== today) {
          db.prepare('UPDATE user_stats SET current_streak = ?, last_claim_date = ?, points = points + ? WHERE id = 1').run(newStreak, today, totalPointsToAdd);
        }
      });
      completeMany(ids);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    res.status(500).json({ error: 'Failed to perform bulk action' });
  }
});

app.post('/api/suggest-subtasks', async (req, res) => {
  const { title, description } = req.body;
  
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key is not configured' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `Break down the following task into 3 to 5 actionable subtasks.
Task Title: ${title}
Task Description: ${description || 'No description provided.'}

Return ONLY a JSON array of strings representing the subtasks. Do not include markdown formatting like \`\`\`json.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '[]';
    const subtasks = JSON.parse(text);
    res.json({ subtasks });
  } catch (error) {
    console.error('Error suggesting subtasks:', error);
    res.status(500).json({ error: 'Failed to suggest subtasks' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

import { useState, useEffect, useCallback } from 'react';
import { Task, Subtask, UserStats } from '../types';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<UserStats>({ points: 0, current_streak: 0, last_claim_date: null });
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        if (data) setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchStats();
  }, [fetchTasks, fetchStats]);

  const addTask = async (task: Task) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      if (res.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const updateTask = async (task: Task) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      if (res.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const bulkAction = async (ids: string[], action: 'delete' | 'complete') => {
    try {
      const res = await fetch('/api/tasks/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action }),
      });
      if (res.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error('Failed to perform bulk action:', error);
    }
  };

  const reorderTasks = async (reorderedTasks: { id: string; position: number }[]) => {
    // Optimistically update local state
    setTasks(prev => {
      const newTasks = [...prev];
      reorderedTasks.forEach(rt => {
        const task = newTasks.find(t => t.id === rt.id);
        if (task) {
          task.position = rt.position;
        }
      });
      return newTasks.sort((a, b) => (a.position || 0) - (b.position || 0));
    });

    try {
      await fetch('/api/tasks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: reorderedTasks }),
      });
    } catch (error) {
      console.error('Failed to reorder tasks:', error);
      await fetchTasks(); // Revert on error
    }
  };

  const claimPoints = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}/claim`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        await fetchTasks();
        return data.awarded;
      }
    } catch (error) {
      console.error('Failed to claim points:', error);
    }
    return 0;
  };

  const suggestSubtasks = async (title: string, description: string): Promise<string[]> => {
    try {
      const res = await fetch('/api/suggest-subtasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.subtasks || [];
      }
    } catch (error) {
      console.error('Failed to suggest subtasks:', error);
    }
    return [];
  };

  return { tasks, stats, loading, addTask, updateTask, deleteTask, bulkAction, reorderTasks, claimPoints, suggestSubtasks, refreshTasks: fetchTasks };
}

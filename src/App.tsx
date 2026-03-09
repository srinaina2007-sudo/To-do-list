import { useState, useMemo } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { Header } from './components/Header';
import { TaskList } from './components/TaskList';
import { BottomNav } from './components/BottomNav';
import { TaskModal } from './components/TaskModal';
import { ActionBar } from './components/ActionBar';
import { SettingsModal } from './components/SettingsModal';
import { useTasks } from './hooks/useTasks';
import { useNotifications } from './hooks/useNotifications';
import { Task } from './types';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [category, setCategory] = useState<'pending' | 'completed' | 'overdue'>('pending');
  const [sortBy, setSortBy] = useState<'custom' | 'deadline' | 'createdAt' | 'title'>('custom');
  
  const { tasks, stats, loading, addTask, updateTask, deleteTask, bulkAction, reorderTasks, suggestSubtasks } = useTasks();
  useNotifications(tasks, stats);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const filteredTasks = useMemo(() => {
    const now = new Date().getTime();
    
    return tasks.filter(task => {
      const deadlineTime = new Date(task.deadline).getTime();
      const isOverdue = deadlineTime < now && task.status !== 'completed';
      
      if (category === 'completed') return task.status === 'completed';
      if (category === 'overdue') return isOverdue;
      if (category === 'pending') return task.status === 'pending' && !isOverdue;
      return false;
    }).sort((a, b) => {
      if (sortBy === 'deadline') {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (sortBy === 'createdAt') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return (a.position || 0) - (b.position || 0);
    });
  }, [tasks, category, sortBy]);

  const handleReorder = (reorderedTasks: Task[]) => {
    if (sortBy !== 'custom') {
      setSortBy('custom');
    }
    
    // Calculate new positions
    const updates = reorderedTasks.map((t, index) => ({
      id: t.id,
      position: index
    }));
    
    reorderTasks(updates);
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleTaskClick = (task: Task) => {
    if (selectedIds.size > 0) {
      handleSelect(task.id);
    } else {
      setEditingTask(task);
      setIsModalOpen(true);
    }
  };

  const handleSaveTask = (task: Task) => {
    if (editingTask) {
      updateTask(task);
    } else {
      addTask(task);
    }
    setEditingTask(null);
  };

  const handleCompleteTask = (task: Task) => {
    updateTask({ ...task, status: 'completed' });
  };

  const handleDeleteSelected = () => {
    bulkAction(Array.from(selectedIds), 'delete');
    setSelectedIds(new Set());
  };

  const handleCompleteSelected = () => {
    bulkAction(Array.from(selectedIds), 'complete');
    setSelectedIds(new Set());
  };

  const handleEditSelected = () => {
    if (selectedIds.size === 1) {
      const id = Array.from(selectedIds)[0];
      const task = tasks.find(t => t.id === id);
      if (task) {
        setEditingTask(task);
        setIsModalOpen(true);
        setSelectedIds(new Set());
      }
    }
  };

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <Header 
          category={category} 
          setCategory={(c) => {
            setCategory(c);
            setSelectedIds(new Set());
          }}
          sortBy={sortBy}
          setSortBy={setSortBy}
          stats={stats}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          </div>
        ) : (
          <TaskList
            tasks={filteredTasks}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onTaskClick={handleTaskClick}
            onReorder={handleReorder}
          />
        )}

        <BottomNav onAdd={() => {
          setEditingTask(null);
          setIsModalOpen(true);
        }} />

        <ActionBar
          selectedCount={selectedIds.size}
          category={category}
          onDelete={handleDeleteSelected}
          onEdit={handleEditSelected}
          onComplete={handleCompleteSelected}
          onClear={() => setSelectedIds(new Set())}
        />

        <TaskModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTask(null);
          }}
          onSave={handleSaveTask}
          onComplete={handleCompleteTask}
          initialTask={editingTask}
          suggestSubtasks={suggestSubtasks}
        />

        <SettingsModal 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </div>
    </div>
  );
}

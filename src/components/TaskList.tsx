import { Task } from '../types';
import { TaskCard } from './TaskCard';
import { motion, AnimatePresence } from 'motion/react';
import { Inbox } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface TaskListProps {
  tasks: Task[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onReorder: (tasks: Task[]) => void;
}

export function TaskList({ tasks, selectedIds, onSelect, onTaskClick, onReorder }: TaskListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);
      
      onReorder(arrayMove(tasks, oldIndex, newIndex));
    }
  };

  if (tasks.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="mb-4 rounded-full bg-slate-100 p-4 text-slate-400">
          <Inbox size={48} strokeWidth={1.5} />
        </div>
        <h3 className="font-heading text-xl font-medium text-slate-800">All caught up!</h3>
        <p className="mt-2 max-w-xs text-sm text-slate-500">
          No items to display. Please press "Add" to add new items.
        </p>
      </motion.div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3 pb-32 pt-4">
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isSelected={selectedIds.has(task.id)}
                onSelect={onSelect}
                onClick={onTaskClick}
              />
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>
    </DndContext>
  );
}

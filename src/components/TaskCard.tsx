import { motion } from 'motion/react';
import { Calendar, CheckCircle2, Circle, GripVertical } from 'lucide-react';
import { Task } from '../types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskCardProps {
  task: Task;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onClick: (task: Task) => void;
}

export function TaskCard({ task, isSelected, onSelect, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  const completedSubtasks = task.subtasks?.filter(st => st.isCompleted).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const deadlineDate = new Date(task.deadline);
  const isOverdue = task.status !== 'completed' && deadlineDate.getTime() < new Date().getTime();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      ref={setNodeRef}
      style={style}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border transition-all ${
        isSelected
          ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
      } ${isDragging ? 'shadow-xl opacity-80' : ''}`}
      onClick={() => onClick(task)}
    >
      {task.imageUrl && (
        <div className="h-32 w-full overflow-hidden border-b border-slate-100">
          <img src={task.imageUrl} alt={task.title} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        </div>
      )}
      
      <div className="flex items-start gap-3 p-4">
        <div 
          className="mt-1 cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={20} />
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(task.id);
          }}
          className="mt-0.5 shrink-0 text-slate-400 hover:text-indigo-600 focus:outline-none"
        >
          {isSelected ? (
            <CheckCircle2 className="fill-indigo-600 text-white" size={24} />
          ) : (
            <Circle size={24} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <h3 className={`truncate font-heading text-lg font-medium ${
            task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'
          }`}>
            {task.title}
          </h3>
          
          {task.description && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
              {task.description}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className={`flex items-center gap-1.5 text-xs font-medium ${
              task.status === 'completed' ? 'text-emerald-600' :
              isOverdue ? 'text-red-600' : 'text-slate-500'
            }`}>
              <Calendar size={14} />
              <span>
                {deadlineDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at{' '}
                {deadlineDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              {totalSubtasks > 0 && (
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span>{completedSubtasks}/{totalSubtasks}</span>
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

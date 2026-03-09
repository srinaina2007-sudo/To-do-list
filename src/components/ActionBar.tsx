import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Edit2, CheckCircle } from 'lucide-react';

interface ActionBarProps {
  selectedCount: number;
  category: 'pending' | 'completed' | 'overdue';
  onDelete: () => void;
  onEdit: () => void;
  onComplete: () => void;
  onClear: () => void;
}

export function ActionBar({ selectedCount, category, onDelete, onEdit, onComplete, onClear }: ActionBarProps) {
  if (selectedCount === 0) return null;

  const showEdit = selectedCount === 1;
  const showComplete = category !== 'completed';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-slate-800 p-2 text-white shadow-2xl"
      >
        <div className="flex items-center px-4 py-2 text-sm font-medium">
          <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-xs">
            {selectedCount}
          </span>
          Selected
        </div>
        
        <div className="h-6 w-px bg-slate-600" />

        <div className="flex items-center gap-1 px-2">
          {showEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-2 rounded-xl p-3 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
              title="Edit"
            >
              <Edit2 size={18} />
            </button>
          )}
          
          {showComplete && (
            <button
              onClick={onComplete}
              className="flex items-center gap-2 rounded-xl p-3 text-emerald-400 transition-colors hover:bg-slate-700 hover:text-emerald-300"
              title="Complete"
            >
              <CheckCircle size={18} />
            </button>
          )}

          <button
            onClick={onDelete}
            className="flex items-center gap-2 rounded-xl p-3 text-red-400 transition-colors hover:bg-slate-700 hover:text-red-300"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        </div>

        <div className="h-6 w-px bg-slate-600" />

        <button
          onClick={onClear}
          className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white"
        >
          Cancel
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

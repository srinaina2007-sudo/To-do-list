import { Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface BottomNavProps {
  onAdd: () => void;
}

export function BottomNav({ onAdd }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-center pb-8 pt-4 bg-gradient-to-t from-white via-white/80 to-transparent">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onAdd}
        className="flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-4 font-medium text-white shadow-lg shadow-indigo-600/30 transition-colors hover:bg-indigo-700"
      >
        <Plus size={24} />
        <span className="font-heading text-lg">Add Task</span>
      </motion.button>
    </div>
  );
}

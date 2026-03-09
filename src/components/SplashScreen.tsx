import { motion } from 'motion/react';
import { CheckCircle } from 'lucide-react';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.8, delay: 2 }}
      onAnimationComplete={onComplete}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-indigo-600 text-white"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.5, duration: 1 }}
        className="flex flex-col items-center"
      >
        <CheckCircle size={80} className="mb-4 text-white" />
        <h1 className="text-4xl font-bold tracking-tight">TaskMaster</h1>
        <p className="mt-2 text-indigo-200">Manage your day, effortlessly.</p>
      </motion.div>
    </motion.div>
  );
}

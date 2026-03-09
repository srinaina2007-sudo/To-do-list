import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState('18:00');

  useEffect(() => {
    if (isOpen) {
      setEnabled(localStorage.getItem('streakReminderEnabled') === 'true');
      setTime(localStorage.getItem('streakReminderTime') || '18:00');
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('streakReminderEnabled', enabled.toString());
    localStorage.setItem('streakReminderTime', time);
    
    if (enabled && 'Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <Bell size={20} className="text-indigo-600" />
            Settings
          </h2>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-900">Daily Streak Reminder</h3>
              <p className="text-xs text-slate-500 mt-1">Get notified to complete a task</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300"></div>
            </label>
          </div>

          <AnimatePresence>
            {enabled && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                <label className="block text-sm font-medium text-slate-700">Reminder Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="border-t border-slate-100 p-4 bg-slate-50 flex justify-end">
          <button
            onClick={handleSave}
            className="rounded-xl bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-700"
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}

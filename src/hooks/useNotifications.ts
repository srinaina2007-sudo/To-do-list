import { useEffect, useRef } from 'react';
import { Task, UserStats } from '../types';

export function useNotifications(tasks: Task[], stats: UserStats) {
  const notifiedTasks = useRef<Set<string>>(new Set());

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const checkDeadlinesAndStreak = () => {
      const now = new Date();
      const nowTime = now.getTime();
      
      tasks.forEach(task => {
        if (task.status === 'completed') return;
        
        const deadlineTime = new Date(task.deadline).getTime();
        const timeDiff = deadlineTime - nowTime;
        
        // 10 minutes = 600,000 ms
        if (timeDiff > 0 && timeDiff <= 600000 && !notifiedTasks.current.has(task.id)) {
          notifiedTasks.current.add(task.id);
          
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Task Reminder', {
              body: `Your task "${task.title}" is due in less than 10 minutes!`,
            });
          } else {
            // Fallback to alert if notifications are not permitted
            alert(`Reminder: Your task "${task.title}" is due in less than 10 minutes!`);
          }
        }
      });

      // Streak Reminder
      const enabled = localStorage.getItem('streakReminderEnabled') === 'true';
      if (enabled && stats) {
        const time = localStorage.getItem('streakReminderTime') || '18:00';
        const lastReminder = localStorage.getItem('lastStreakReminderDate');
        
        const today = now.toISOString().split('T')[0];
        
        if (lastReminder !== today) {
          const [hours, minutes] = time.split(':').map(Number);
          const reminderTime = new Date();
          reminderTime.setHours(hours, minutes, 0, 0);

          if (now >= reminderTime) {
            // Check if task completed today
            if (stats.last_claim_date !== today) {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Streak Reminder', {
                  body: 'Keep your streak alive! Complete a task today.',
                });
              } else {
                alert('Keep your streak alive! Complete a task today.');
              }
              localStorage.setItem('lastStreakReminderDate', today);
            }
          }
        }
      }
    };

    const interval = setInterval(checkDeadlinesAndStreak, 60000); // Check every minute
    checkDeadlinesAndStreak(); // Initial check

    return () => clearInterval(interval);
  }, [tasks, stats]);
}

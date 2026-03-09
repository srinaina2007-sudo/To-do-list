import { motion } from 'motion/react';
import { ArrowDownUp, Flame, Star, Settings } from 'lucide-react';
import { UserStats } from '../types';

interface HeaderProps {
  category: 'pending' | 'completed' | 'overdue';
  setCategory: (c: 'pending' | 'completed' | 'overdue') => void;
  sortBy: 'custom' | 'deadline' | 'createdAt' | 'title';
  setSortBy: (s: 'custom' | 'deadline' | 'createdAt' | 'title') => void;
  stats: UserStats;
  onOpenSettings: () => void;
}

export function Header({ category, setCategory, sortBy, setSortBy, stats, onOpenSettings }: HeaderProps) {
  const categories = ['pending', 'completed', 'overdue'] as const;

  return (
    <header className="sticky top-0 z-30 bg-white/80 px-6 pb-4 pt-8 backdrop-blur-md">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl font-bold text-slate-900">Tasks</h1>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium">
            <div className="flex items-center gap-1 text-amber-500">
              <Star size={16} className="fill-amber-500" />
              <span>{stats.points}</span>
            </div>
            <div className="h-4 w-px bg-slate-300" />
            <div className="flex items-center gap-1 text-orange-500">
              <Flame size={16} className={stats.current_streak > 0 ? "fill-orange-500" : ""} />
              <span>{stats.current_streak}</span>
            </div>
          </div>

          <button 
            onClick={onOpenSettings}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Settings size={20} />
          </button>

          <div className="relative flex items-center gap-2">
            <ArrowDownUp size={16} className="text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none bg-transparent py-1 pr-6 text-sm font-medium text-slate-600 outline-none focus:text-indigo-600"
            >
              <option value="custom">Custom</option>
              <option value="deadline">Deadline</option>
              <option value="createdAt">Creation Date</option>
              <option value="title">Title</option>
            </select>
            <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              category === c ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {category === c && (
              <motion.div
                layoutId="activeCategory"
                className="absolute inset-0 rounded-full bg-indigo-50"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10 capitalize">{c}</span>
          </button>
        ))}
      </div>
    </header>
  );
}

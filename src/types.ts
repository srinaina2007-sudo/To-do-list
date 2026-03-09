export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  position?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: 'pending' | 'completed' | 'overdue';
  createdAt: string;
  subtasks: Subtask[];
  position?: number;
  pointsClaimed?: boolean;
  imageUrl?: string;
}

export interface UserStats {
  points: number;
  current_streak: number;
  last_claim_date: string | null;
}

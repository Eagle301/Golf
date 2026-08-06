import type { TrainingCategory } from '@/types/database';

export const TRAINING_CATEGORIES: TrainingCategory[] = ['putts', 'short_game', 'full_swing', 'strategy'];

export const TRAINING_CATEGORY_LABELS: Record<TrainingCategory, string> = {
  putts: 'Putts',
  short_game: 'Short Game',
  full_swing: 'Full Swing',
  strategy: 'Strategy',
};

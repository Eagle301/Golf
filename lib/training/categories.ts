import type { Ionicons } from '@expo/vector-icons';
import type { TrainingCategory } from '@/types/database';

type IconName = keyof typeof Ionicons.glyphMap;

export const TRAINING_CATEGORIES: TrainingCategory[] = ['putts', 'short_game', 'full_swing', 'strategy'];

export const TRAINING_CATEGORY_LABELS: Record<TrainingCategory, string> = {
  putts: 'Putts',
  short_game: 'Short Game',
  full_swing: 'Full Swing',
  strategy: 'Strategy',
};

/** Shared so a category looks the same everywhere it appears - tab grid, routine editor, pickers. */
export const CATEGORY_ICONS: Record<TrainingCategory, IconName> = {
  putts: 'radio-button-on-outline',
  short_game: 'flag-outline',
  full_swing: 'golf-outline',
  strategy: 'bulb-outline',
};

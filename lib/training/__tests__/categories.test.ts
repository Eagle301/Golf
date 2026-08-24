import { TRAINING_CATEGORIES, TRAINING_CATEGORY_LABELS, CATEGORY_ICONS } from '../categories';

describe('training categories', () => {
  it('gives every category a label and an icon', () => {
    for (const category of TRAINING_CATEGORIES) {
      expect(TRAINING_CATEGORY_LABELS[category]).toBeTruthy();
      expect(CATEGORY_ICONS[category]).toBeTruthy();
    }
  });

  it('uses a distinct icon per category so screens stay visually distinguishable', () => {
    const icons = TRAINING_CATEGORIES.map((c) => CATEGORY_ICONS[c]);
    expect(new Set(icons).size).toBe(TRAINING_CATEGORIES.length);
  });
});

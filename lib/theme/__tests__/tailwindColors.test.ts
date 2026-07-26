import tailwindConfig from '../../../tailwind.config.js';
import { colors } from '../colors';

describe('tailwind color tokens', () => {
  it('enables class-based dark mode', () => {
    expect(tailwindConfig.darkMode).toBe('class');
  });

  it('matches the semantic color tokens defined in lib/theme/colors.ts', () => {
    expect(tailwindConfig.theme.extend.colors).toEqual({
      brand: colors.brand,
      background: colors.light.background,
      'background-dark': colors.dark.background,
      surface: colors.light.surface,
      'surface-dark': colors.dark.surface,
      'text-primary': colors.light.textPrimary,
      'text-primary-dark': colors.dark.textPrimary,
      'text-secondary': colors.light.textSecondary,
      'text-secondary-dark': colors.dark.textSecondary,
      accent: colors.light.accent,
      'accent-blue': colors.light.accentBlue,
      'accent-gold': colors.light.accentGold,
      'accent-gold-dark': colors.dark.accentGold,
      'border-dark': colors.dark.border,
    });
  });
});

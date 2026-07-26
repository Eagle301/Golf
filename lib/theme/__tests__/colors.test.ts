import { colors } from '../colors';

describe('colors', () => {
  it('defines the brand color once for both themes', () => {
    expect(colors.brand).toBe('#1B3B2B');
  });

  it('defines all required light-mode tokens', () => {
    expect(colors.light).toEqual({
      background: '#EBF0E6',
      surface: '#F5F7F2',
      textPrimary: '#111827',
      textSecondary: '#4B5563',
      accent: '#34D399',
      accentBlue: '#1D4ED8',
      accentGold: '#EAB308',
    });
  });

  it('defines all required dark-mode tokens', () => {
    expect(colors.dark).toEqual({
      background: '#121614',
      surface: '#1E2621',
      textPrimary: '#F3F4F6',
      textSecondary: '#9CA3AF',
      accent: '#34D399',
      accentBlue: '#1D4ED8',
      accentGold: '#F59E0B',
      border: '#2D3A32',
    });
  });
});

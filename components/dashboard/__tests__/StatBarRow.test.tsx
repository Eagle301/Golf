import { render, screen } from '@testing-library/react-native';
import { StatBarRow, toneForHigherBetter, toneForLowerBetter } from '../StatBarRow';

describe('StatBarRow', () => {
  it('renders the label, value, and a fill sized to fillPct', () => {
    render(<StatBarRow label="GIR Par 3" valueLabel="45%" fillPct={45} tone="good" testID="row-par3" />);

    expect(screen.getByText('GIR Par 3')).toBeTruthy();
    expect(screen.getByTestId('row-par3').props.children).toBe('45%');
    expect(screen.getByTestId('row-par3-bar').props.style).toEqual(
      expect.objectContaining({ width: '45%' })
    );
  });

  it('colors the fill and value by tone', () => {
    render(<StatBarRow label="Scrambling" valueLabel="4%" fillPct={4} tone="bad" testID="row-scr" />);

    expect(screen.getByTestId('row-scr-bar').props.style).toEqual(
      expect.objectContaining({ backgroundColor: '#DC2626' })
    );
  });

  it('shows no fill bar when there is no data', () => {
    render(<StatBarRow label="GIR Par 5" valueLabel="—" fillPct={null} tone="neutral" testID="row-par5" />);

    expect(screen.getByTestId('row-par5').props.children).toBe('—');
    expect(screen.queryByTestId('row-par5-bar')).toBeNull();
  });
});

describe('tone helpers', () => {
  it('grades higher-is-better stats against good/ok thresholds', () => {
    expect(toneForHigherBetter(40, { good: 30, ok: 15 })).toBe('good');
    expect(toneForHigherBetter(20, { good: 30, ok: 15 })).toBe('ok');
    expect(toneForHigherBetter(4, { good: 30, ok: 15 })).toBe('bad');
    expect(toneForHigherBetter(null, { good: 30, ok: 15 })).toBe('neutral');
  });

  it('grades lower-is-better stats against good/ok thresholds', () => {
    expect(toneForLowerBetter(5, { good: 7, ok: 12 })).toBe('good');
    expect(toneForLowerBetter(10, { good: 7, ok: 12 })).toBe('ok');
    expect(toneForLowerBetter(15, { good: 7, ok: 12 })).toBe('bad');
    expect(toneForLowerBetter(null, { good: 7, ok: 12 })).toBe('neutral');
  });
});

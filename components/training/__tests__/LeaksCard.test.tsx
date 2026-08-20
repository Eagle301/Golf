import { render, screen, fireEvent } from '@testing-library/react-native';
import { LeaksCard } from '../LeaksCard';
import type { Leak } from '@/lib/training/leaks';

const LEAKS: Leak[] = [
  { kind: 'three_putts', strokesPerRound: 2.14, category: 'putts', perRound: 1.8 },
  { kind: 'penalties', strokesPerRound: 1.5, category: 'strategy', perRound: 1.5 },
  {
    kind: 'up_and_down',
    strokesPerRound: 1.24,
    category: 'short_game',
    upAndDownPct: 37.5,
    upAndDownOppsPerRound: 3.2,
  },
  { kind: 'chips', strokesPerRound: 0.8, category: 'short_game', perRound: 4.2 },
  { kind: 'tee_shots', strokesPerRound: 0, category: 'full_swing', hitAvgVsPar: 0.3, missAvgVsPar: 1.1 },
  { kind: 'approach', strokesPerRound: null, category: 'full_swing', hitAvgVsPar: null, missAvgVsPar: 1.2 },
];

describe('LeaksCard', () => {
  it('renders every leak in the given order', () => {
    render(<LeaksCard leaks={LEAKS} onPractice={jest.fn()} />);

    const rows = screen.getAllByTestId(/^leak-row-/);
    expect(rows.map((r) => r.props.testID)).toEqual([
      'leak-row-three_putts',
      'leak-row-penalties',
      'leak-row-up_and_down',
      'leak-row-chips',
      'leak-row-tee_shots',
      'leak-row-approach',
    ]);
  });

  it('labels each leak and shows its strokes per round', () => {
    render(<LeaksCard leaks={LEAKS} onPractice={jest.fn()} />);

    expect(screen.getByTestId('leak-label-three_putts').props.children).toBe('3-putts');
    expect(screen.getByTestId('leak-value-three_putts').props.children).toBe('~2.1 strokes/round');
    expect(screen.getByTestId('leak-label-penalties').props.children).toBe('Penalty strokes');
    expect(screen.getByTestId('leak-label-chips').props.children).toBe('Extra chip shots');
    expect(screen.getByTestId('leak-label-up_and_down').props.children).toBe('Up & downs');
    expect(screen.getByTestId('leak-value-up_and_down').props.children).toBe('~1.2 strokes/round');
    expect(screen.getByTestId('leak-label-tee_shots').props.children).toBe('Missed fairways');
    expect(screen.getByTestId('leak-label-approach').props.children).toBe('Missed greens');
  });

  it('shows a placeholder for a leak without enough data', () => {
    render(<LeaksCard leaks={LEAKS} onPractice={jest.fn()} />);

    expect(screen.getByTestId('leak-value-approach').props.children).toBe('Not enough data');
  });

  it('shows the per-round frequency for the count-based leaks', () => {
    render(<LeaksCard leaks={LEAKS} onPractice={jest.fn()} />);

    expect(screen.getByTestId('leak-detail-three_putts').props.children).toBe('1.8 per round');
    expect(screen.getByTestId('leak-detail-penalties').props.children).toBe('1.5 per round');
    expect(screen.getByTestId('leak-detail-chips').props.children).toBe('4.2 chips per round');
  });

  it('shows chances per round and save rate under the up & down row', () => {
    render(<LeaksCard leaks={LEAKS} onPractice={jest.fn()} />);

    expect(screen.getByTestId('leak-detail-up_and_down').props.children).toBe(
      '3.2 chances per round (38% saved)'
    );
    expect(screen.queryByTestId('leak-putts-after-chip')).toBeNull();
  });

  it('hides the up & down detail line without chip data', () => {
    const bare: Leak[] = [
      {
        kind: 'up_and_down',
        strokesPerRound: null,
        category: 'short_game',
        upAndDownPct: null,
        upAndDownOppsPerRound: 0,
      },
    ];
    render(<LeaksCard leaks={bare} onPractice={jest.fn()} />);

    expect(screen.getByTestId('leak-value-up_and_down').props.children).toBe('Not enough data');
    expect(screen.queryByTestId('leak-detail-up_and_down')).toBeNull();
  });

  it('shows the missed-vs-hit scoring averages for the gap-based leaks', () => {
    render(<LeaksCard leaks={LEAKS} onPractice={jest.fn()} />);

    expect(screen.getByTestId('leak-detail-tee_shots').props.children).toBe('+1.1 vs +0.3 when hit');
  });

  it('omits the detail line when one side of the gap has no data yet', () => {
    render(<LeaksCard leaks={LEAKS} onPractice={jest.fn()} />);

    expect(screen.queryByTestId('leak-detail-approach')).toBeNull();
  });

  it('reports the pressed leak\'s training category', () => {
    const onPractice = jest.fn();
    render(<LeaksCard leaks={LEAKS} onPractice={onPractice} />);

    fireEvent.press(screen.getByTestId('leak-row-chips'));
    expect(onPractice).toHaveBeenCalledWith('short_game');
  });
});

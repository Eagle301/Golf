import { render, screen } from '@testing-library/react-native';
import { PuttsDistributionChart } from '../PuttsDistributionChart';

const DISTRIBUTION = { putts0Pct: 5, putts1Pct: 15, putts2Pct: 50, putts3Pct: 25, putts4PlusPct: 5 };

describe('PuttsDistributionChart', () => {
  it('shows the average putts per round', () => {
    render(<PuttsDistributionChart distribution={DISTRIBUTION} averagePerRound={31.4} />);
    expect(screen.getByTestId('putts-average-per-round').props.children).toBe('Avg. 31.4 / round');
  });

  it('shows a placeholder average when there is no data', () => {
    render(
      <PuttsDistributionChart
        distribution={{ putts0Pct: 0, putts1Pct: 0, putts2Pct: 0, putts3Pct: 0, putts4PlusPct: 0 }}
        averagePerRound={null}
      />
    );
    expect(screen.getByTestId('putts-average-per-round').props.children).toBe('—');
  });

  it('renders a segment for each non-zero putts bucket', () => {
    render(<PuttsDistributionChart distribution={DISTRIBUTION} averagePerRound={31.4} />);

    expect(screen.getByTestId('putts-segment-0')).toBeTruthy();
    expect(screen.getByTestId('putts-segment-1')).toBeTruthy();
    expect(screen.getByTestId('putts-segment-2')).toBeTruthy();
    expect(screen.getByTestId('putts-segment-3')).toBeTruthy();
    expect(screen.getByTestId('putts-segment-4+')).toBeTruthy();
  });

  it('shows an empty state when there is no putts data', () => {
    render(
      <PuttsDistributionChart
        distribution={{ putts0Pct: 0, putts1Pct: 0, putts2Pct: 0, putts3Pct: 0, putts4PlusPct: 0 }}
        averagePerRound={null}
      />
    );
    expect(screen.getByTestId('putts-distribution-empty')).toBeTruthy();
  });

  it('shows just the number, with no per-bucket legend, in compact mode', () => {
    render(<PuttsDistributionChart distribution={DISTRIBUTION} averagePerRound={31.4} compact />);

    expect(screen.getByTestId('putts-average-per-round').props.children).toBe('Avg. 31.4');
    expect(screen.getByTestId('putts-segment-0')).toBeTruthy();
    expect(screen.queryByText('0: 5%')).toBeNull();
  });
});

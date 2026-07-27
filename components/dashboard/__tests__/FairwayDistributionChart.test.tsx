import { render, screen } from '@testing-library/react-native';
import { FairwayDistributionChart } from '../FairwayDistributionChart';

describe('FairwayDistributionChart', () => {
  it('renders left/hit/right percentages', () => {
    render(<FairwayDistributionChart distribution={{ leftPct: 20, hitPct: 60, rightPct: 20, naPct: 10 }} />);

    expect(screen.getByText('Left 20%')).toBeTruthy();
    expect(screen.getByText('Hit 60%')).toBeTruthy();
    expect(screen.getByText('Right 20%')).toBeTruthy();
  });

  it('shows the N/A percentage in greyed-out text', () => {
    render(<FairwayDistributionChart distribution={{ leftPct: 20, hitPct: 60, rightPct: 20, naPct: 10 }} />);

    expect(screen.getByTestId('fairway-na-stat').props.children.join('')).toBe('N/A 10%');
  });

  it('shows an empty state when there is no fairway data', () => {
    render(<FairwayDistributionChart distribution={{ leftPct: 0, hitPct: 0, rightPct: 0, naPct: 0 }} />);

    expect(screen.getByTestId('fairway-distribution-empty')).toBeTruthy();
  });

  it('themes the title with the primary text token', () => {
    const { toJSON } = render(
      <FairwayDistributionChart distribution={{ leftPct: 20, hitPct: 60, rightPct: 20, naPct: 0 }} />
    );
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('text-text-primary');
    expect(tree).toContain('dark:text-text-primary-dark');
  });
});

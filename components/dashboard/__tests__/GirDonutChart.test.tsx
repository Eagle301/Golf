import { render, screen } from '@testing-library/react-native';
import { GirDonutChart } from '../GirDonutChart';

describe('GirDonutChart', () => {
  it('shows the rounded percentage in the center', () => {
    render(<GirDonutChart percentage={42.6} />);
    expect(screen.getByTestId('gir-donut-value').props.children).toBe('43%');
  });

  it('renders the filled arc', () => {
    render(<GirDonutChart percentage={50} />);
    expect(screen.getByTestId('gir-donut-arc')).toBeTruthy();
  });

  it('themes the value text with the primary text token', () => {
    const { toJSON } = render(<GirDonutChart percentage={42} />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('text-text-primary');
    expect(tree).toContain('dark:text-text-primary-dark');
  });
});

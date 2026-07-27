import { render, screen } from '@testing-library/react-native';
import { ScoringByParChart } from '../ScoringByParChart';

describe('ScoringByParChart', () => {
  it('shows average score values for each par type', () => {
    render(<ScoringByParChart scoreByPar={{ par3: 3.5, par4: 4.8, par5: 5.2 }} />);

    expect(screen.getByTestId('scoring-by-par-value-par3').props.children).toBe('3.5');
    expect(screen.getByTestId('scoring-by-par-value-par4').props.children).toBe('4.8');
    expect(screen.getByTestId('scoring-by-par-value-par5').props.children).toBe('5.2');
  });

  it('shows an empty state when there is no scored data', () => {
    render(<ScoringByParChart scoreByPar={{ par3: null, par4: null, par5: null }} />);
    expect(screen.getByTestId('scoring-by-par-empty')).toBeTruthy();
  });

  it('themes the title with the primary text token', () => {
    const { toJSON } = render(<ScoringByParChart scoreByPar={{ par3: 3.5, par4: 4.8, par5: 5.2 }} />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('text-text-primary');
    expect(tree).toContain('dark:text-text-primary-dark');
  });
});

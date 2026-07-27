import { render, screen } from '@testing-library/react-native';
import { ScoringCategoryBreakdown } from '../ScoringCategoryBreakdown';

describe('ScoringCategoryBreakdown', () => {
  it('shows average holes per round for each scoring category', () => {
    render(
      <ScoringCategoryBreakdown
        averages={{ eagle: 0.1, birdie: 1.2, par: 8.5, bogey: 5.4, double: 2.1, doubleOrWorse: 0.7 }}
      />
    );

    expect(screen.queryByTestId('scoring-category-eagle')).toBeNull();
    expect(screen.getByTestId('scoring-category-birdie').props.children).toBe('1.2');
    expect(screen.getByTestId('scoring-category-par').props.children).toBe('8.5');
    expect(screen.getByTestId('scoring-category-bogey').props.children).toBe('5.4');
    expect(screen.getByTestId('scoring-category-double').props.children).toBe('2.1');
    expect(screen.getByTestId('scoring-category-doubleOrWorse').props.children).toBe('0.7');
  });

  it('themes the border and value text with semantic tokens', () => {
    const { toJSON } = render(
      <ScoringCategoryBreakdown
        averages={{ eagle: 0, birdie: 1.2, par: 8.5, bogey: 5.4, double: 2.1, doubleOrWorse: 0.7 }}
      />
    );
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('dark:border-border-dark');
    expect(tree).toContain('text-text-primary');
  });
});

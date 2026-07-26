import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Card } from '../Card';

describe('Card', () => {
  it('renders its children', () => {
    render(
      <Card testID="my-card">
        <Text>Hole 4</Text>
      </Card>
    );
    expect(screen.getByText('Hole 4')).toBeTruthy();
  });

  it('applies the themed surface and radius classes', () => {
    render(<Card testID="my-card" />);
    expect(screen.getByTestId('my-card').props.className).toEqual(
      expect.stringContaining('bg-surface')
    );
    expect(screen.getByTestId('my-card').props.className).toEqual(
      expect.stringContaining('dark:bg-surface-dark')
    );
  });

  it('merges a passed-in className with the default classes', () => {
    render(<Card testID="my-card" className="mt-4" />);
    expect(screen.getByTestId('my-card').props.className).toEqual(
      expect.stringContaining('mt-4')
    );
  });
});

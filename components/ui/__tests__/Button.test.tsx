import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('renders its label and fires onPress', () => {
    const onPress = jest.fn();
    render(<Button testID="my-button" label="Continue" onPress={onPress} />);

    expect(screen.getByText('Continue')).toBeTruthy();
    fireEvent.press(screen.getByTestId('my-button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress when disabled', () => {
    const onPress = jest.fn();
    render(<Button testID="my-button" label="Continue" onPress={onPress} disabled />);

    fireEvent.press(screen.getByTestId('my-button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Button theming', () => {
  // Button's testID lives on the outer Pressable (a composite component whose
  // children is a pressed-state render-prop function), not on the styled
  // inner View - so we assert against the full rendered JSON tree rather than
  // reading `.props.className` off a single queried instance.
  it('styles the primary variant as a brand-green pill with a dark-mode gold fill', () => {
    const { toJSON } = render(<Button testID="btn" label="Continue" onPress={() => {}} variant="primary" />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('bg-brand');
    expect(tree).toContain('dark:bg-accent-gold-dark');
    expect(tree).toContain('rounded-full');
  });

  it('styles the secondary variant as an outlined pill', () => {
    const { toJSON } = render(<Button testID="btn" label="Cancel" onPress={() => {}} variant="secondary" />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('border-brand');
    expect(tree).toContain('rounded-full');
  });
});

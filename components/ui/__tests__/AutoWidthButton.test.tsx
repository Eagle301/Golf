import { render, screen, fireEvent } from '@testing-library/react-native';
import { AutoWidthButton } from '../AutoWidthButton';

function layoutMeasuringNode(testId: string, width: number) {
  // The invisible measuring node has no testID of its own - it's the first
  // rendered node, a sibling before the Button. We find it by locating the
  // hidden View via its absolute+opacity style rather than a testID, since
  // adding a testID to an invisible measurement-only node isn't useful
  // elsewhere and the button's own testID must stay on the Button itself.
  const hidden = screen.UNSAFE_getAllByProps({ pointerEvents: 'none' })[0];
  fireEvent(hidden, 'layout', { nativeEvent: { layout: { width, height: 20 } } });
}

describe('AutoWidthButton', () => {
  it('renders the label via the underlying Button', () => {
    render(<AutoWidthButton testID="my-button" label="Mýrin" onPress={() => {}} />);
    expect(screen.getAllByText('Mýrin').length).toBeGreaterThan(0);
  });

  it('sizes the button to 1.3x the measured label width by default', () => {
    render(<AutoWidthButton testID="my-button" label="Mýrin" onPress={() => {}} />);

    layoutMeasuringNode('my-button', 100);

    const button = screen.getByTestId('my-button');
    const flatStyle = Array.isArray(button.props.style)
      ? Object.assign({}, ...button.props.style.filter(Boolean))
      : button.props.style;
    expect(flatStyle.width).toBeCloseTo(130);
  });

  it('supports a custom width multiplier', () => {
    render(
      <AutoWidthButton testID="my-button" label="Mýrin" onPress={() => {}} widthMultiplier={2} />
    );

    layoutMeasuringNode('my-button', 50);

    const button = screen.getByTestId('my-button');
    const flatStyle = Array.isArray(button.props.style)
      ? Object.assign({}, ...button.props.style.filter(Boolean))
      : button.props.style;
    expect(flatStyle.width).toBeCloseTo(100);
  });
});

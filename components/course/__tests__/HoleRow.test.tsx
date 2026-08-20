import { render, fireEvent } from '@testing-library/react-native';
import { HoleRow } from '../HoleRow';

describe('HoleRow', () => {
  const baseHole = { hole_number: 1, par: null, stroke_index: null };

  it('renders the hole number', () => {
    const { getByText } = render(<HoleRow hole={baseHole} onChange={jest.fn()} />);
    expect(getByText('1')).toBeTruthy();
  });

  it('calls onChange with the selected par', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<HoleRow hole={baseHole} onChange={onChange} />);
    fireEvent.press(getByTestId('par-1-4'));
    expect(onChange).toHaveBeenCalledWith({ ...baseHole, par: 4 });
  });

  it('does not render a length input (lengths are edited per tee box)', () => {
    const { queryByTestId } = render(<HoleRow hole={baseHole} onChange={jest.fn()} />);
    expect(queryByTestId('length-1')).toBeNull();
  });

  it('calls onChange with a parsed stroke index', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<HoleRow hole={baseHole} onChange={onChange} />);
    fireEvent.changeText(getByTestId('stroke-index-1'), '7');
    expect(onChange).toHaveBeenCalledWith({ ...baseHole, stroke_index: 7 });
  });
});

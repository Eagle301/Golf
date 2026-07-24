import { render, fireEvent } from '@testing-library/react-native';
import { HoleRow } from '../HoleRow';

describe('HoleRow', () => {
  const baseHole = { hole_number: 1, par: null, length_meters: null };

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

  it('calls onChange with a parsed length in meters', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<HoleRow hole={baseHole} onChange={onChange} />);
    fireEvent.changeText(getByTestId('length-1'), '350');
    expect(onChange).toHaveBeenCalledWith({ ...baseHole, length_meters: 350 });
  });
});

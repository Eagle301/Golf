import { render, fireEvent, screen } from '@testing-library/react-native';
import { SegmentedControl } from '../SegmentedControl';

describe('SegmentedControl', () => {
  const options = [
    { value: 'check', label: 'Done' },
    { value: 'target', label: 'Out of' },
    { value: 'count', label: 'Count' },
  ];

  it('renders every option', () => {
    render(<SegmentedControl options={options} value="check" onChange={jest.fn()} testIDPrefix="type" />);
    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.getByText('Out of')).toBeTruthy();
    expect(screen.getByText('Count')).toBeTruthy();
  });

  it('addresses each segment by its value', () => {
    render(<SegmentedControl options={options} value="check" onChange={jest.fn()} testIDPrefix="type" />);
    expect(screen.getByTestId('type-check')).toBeTruthy();
    expect(screen.getByTestId('type-target')).toBeTruthy();
    expect(screen.getByTestId('type-count')).toBeTruthy();
  });

  it('reports the picked value', () => {
    const onChange = jest.fn();
    render(<SegmentedControl options={options} value="check" onChange={onChange} testIDPrefix="type" />);
    fireEvent.press(screen.getByTestId('type-target'));
    expect(onChange).toHaveBeenCalledWith('target');
  });

  it('marks the selected segment for accessibility', () => {
    render(<SegmentedControl options={options} value="target" onChange={jest.fn()} testIDPrefix="type" />);
    expect(screen.getByTestId('type-target').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('type-check').props.accessibilityState.selected).toBe(false);
  });

  it('still reports a press on the already-selected segment', () => {
    const onChange = jest.fn();
    render(<SegmentedControl options={options} value="check" onChange={onChange} testIDPrefix="type" />);
    fireEvent.press(screen.getByTestId('type-check'));
    expect(onChange).toHaveBeenCalledWith('check');
  });
});

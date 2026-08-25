import { render, fireEvent, screen } from '@testing-library/react-native';
import { StepperInput } from '../StepperInput';

describe('StepperInput', () => {
  it('increments from the current value', () => {
    const onChange = jest.fn();
    render(<StepperInput value="7" onChange={onChange} testID="stepper" />);
    fireEvent.press(screen.getByTestId('stepper-increment'));
    expect(onChange).toHaveBeenCalledWith('8');
  });

  it('increments from zero when empty', () => {
    const onChange = jest.fn();
    render(<StepperInput value="" onChange={onChange} testID="stepper" />);
    fireEvent.press(screen.getByTestId('stepper-increment'));
    expect(onChange).toHaveBeenCalledWith('1');
  });

  it('decrements but never below zero', () => {
    const onChange = jest.fn();
    render(<StepperInput value="1" onChange={onChange} testID="stepper" />);
    fireEvent.press(screen.getByTestId('stepper-decrement'));
    expect(onChange).toHaveBeenCalledWith('0');

    onChange.mockClear();
    render(<StepperInput value="0" onChange={onChange} testID="stepper2" />);
    fireEvent.press(screen.getByTestId('stepper2-decrement'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps decimals when stepping', () => {
    const onChange = jest.fn();
    render(<StepperInput value="7.5" onChange={onChange} testID="stepper" />);
    fireEvent.press(screen.getByTestId('stepper-increment'));
    expect(onChange).toHaveBeenCalledWith('8.5');
  });

  it('lets the value be typed directly', () => {
    const onChange = jest.fn();
    render(<StepperInput value="" onChange={onChange} testID="stepper" />);
    fireEvent.changeText(screen.getByTestId('stepper-value'), '12');
    expect(onChange).toHaveBeenCalledWith('12');
  });
});

describe('StepperInput layout', () => {
  it('keeps an explicit width on the value field', () => {
    // On web a TextInput is an <input>, which otherwise claims the browser's
    // default 20-character width (~400px at this font size) and pushes the
    // - and + buttons off both edges of a phone screen. Measured at 375px:
    // the row was 496px wide inside a 311px card.
    render(<StepperInput value="7" onChange={jest.fn()} testID="stepper" />);

    expect(screen.getByTestId('stepper-value').props.className).toContain('w-24');
  });
});

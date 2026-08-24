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

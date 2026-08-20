import { render, fireEvent } from '@testing-library/react-native';
import { TeeBoxCard } from '../TeeBoxCard';
import type { TeeBoxInput } from '@/lib/hooks/useCourses';

describe('TeeBoxCard', () => {
  const baseTee: TeeBoxInput = {
    name: 'Gulur',
    course_rating: 70.9,
    slope_rating: 127,
    lengths: Array(9).fill(null),
  };

  it('renders name, course rating and slope inputs with current values', () => {
    const { getByTestId } = render(
      <TeeBoxCard tee={baseTee} index={0} onChange={jest.fn()} onRemove={jest.fn()} removable />
    );
    expect(getByTestId('tee-name-0').props.value).toBe('Gulur');
    expect(getByTestId('tee-cr-0').props.value).toBe('70.9');
    expect(getByTestId('tee-slope-0').props.value).toBe('127');
  });

  it('calls onChange when the name is edited', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <TeeBoxCard tee={baseTee} index={0} onChange={onChange} onRemove={jest.fn()} removable />
    );
    fireEvent.changeText(getByTestId('tee-name-0'), 'Rauður');
    expect(onChange).toHaveBeenCalledWith({ ...baseTee, name: 'Rauður' });
  });

  it('parses a length edit into the right hole slot', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <TeeBoxCard tee={baseTee} index={0} onChange={onChange} onRemove={jest.fn()} removable />
    );
    fireEvent.changeText(getByTestId('tee-length-0-3'), '385');
    const expectedLengths = Array(9).fill(null);
    expectedLengths[2] = 385;
    expect(onChange).toHaveBeenCalledWith({ ...baseTee, lengths: expectedLengths });
  });

  it('maps a back-nine length edit to the right hole on an 18-hole tee', () => {
    const onChange = jest.fn();
    const eighteenTee = { ...baseTee, lengths: Array(18).fill(null) };
    const { getByTestId } = render(
      <TeeBoxCard tee={eighteenTee} index={0} onChange={onChange} onRemove={jest.fn()} removable />
    );
    fireEvent.changeText(getByTestId('tee-length-0-12'), '410');
    const expectedLengths = Array(18).fill(null);
    expectedLengths[11] = 410;
    expect(onChange).toHaveBeenCalledWith({ ...eighteenTee, lengths: expectedLengths });
  });

  it('renders one length input per hole', () => {
    const { getByTestId, queryByTestId } = render(
      <TeeBoxCard tee={baseTee} index={0} onChange={jest.fn()} onRemove={jest.fn()} removable />
    );
    expect(getByTestId('tee-length-0-1')).toBeTruthy();
    expect(getByTestId('tee-length-0-9')).toBeTruthy();
    expect(queryByTestId('tee-length-0-10')).toBeNull();
  });

  it('shows the remove button only when removable', () => {
    const onRemove = jest.fn();
    const removableRender = render(
      <TeeBoxCard tee={baseTee} index={0} onChange={jest.fn()} onRemove={onRemove} removable />
    );
    fireEvent.press(removableRender.getByTestId('remove-tee-0'));
    expect(onRemove).toHaveBeenCalled();

    const fixedRender = render(
      <TeeBoxCard tee={baseTee} index={0} onChange={jest.fn()} onRemove={jest.fn()} removable={false} />
    );
    expect(fixedRender.queryByTestId('remove-tee-0')).toBeNull();
  });
});

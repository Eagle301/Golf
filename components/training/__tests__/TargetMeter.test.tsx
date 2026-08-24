import { render, screen } from '@testing-library/react-native';
import { TargetMeter } from '../TargetMeter';

describe('TargetMeter', () => {
  it('renders one segment per target unit for small targets', () => {
    render(<TargetMeter value={4} target={10} testID="meter" />);
    expect(screen.getAllByTestId(/^meter-segment-/)).toHaveLength(10);
  });

  it('fills segments up to the current value', () => {
    render(<TargetMeter value={4} target={10} testID="meter" />);
    expect(screen.getAllByTestId(/^meter-segment-\d+-filled$/)).toHaveLength(4);
  });

  it('shows the value against the target', () => {
    render(<TargetMeter value={4} target={10} testID="meter" />);
    expect(screen.getByText('4 / 10')).toBeTruthy();
  });

  it('treats a missing value as zero progress', () => {
    render(<TargetMeter value={null} target={10} testID="meter" />);
    expect(screen.queryAllByTestId(/^meter-segment-\d+-filled$/)).toHaveLength(0);
    expect(screen.getByText('0 / 10')).toBeTruthy();
  });

  it('celebrates when the target is met', () => {
    render(<TargetMeter value={10} target={10} testID="meter" />);
    expect(screen.getByTestId('meter-met')).toBeTruthy();
    expect(screen.getByText('Target met')).toBeTruthy();
  });

  it('does not over-fill when the value exceeds the target', () => {
    render(<TargetMeter value={14} target={10} testID="meter" />);
    expect(screen.getAllByTestId(/^meter-segment-\d+-filled$/)).toHaveLength(10);
    expect(screen.getByTestId('meter-met')).toBeTruthy();
  });

  it('renders a continuous bar instead of segments for large targets', () => {
    render(<TargetMeter value={20} target={50} testID="meter" />);
    expect(screen.queryAllByTestId(/^meter-segment-/)).toHaveLength(0);
    expect(screen.getByTestId('meter-bar')).toBeTruthy();
  });

  it('renders nothing without a target', () => {
    render(<TargetMeter value={4} target={null} testID="meter" />);
    expect(screen.queryByTestId('meter')).toBeNull();
  });
});

import { render, screen } from '@testing-library/react-native';
import { Avatar } from '../Avatar';

describe('Avatar', () => {
  it('shows initials from first and last name', () => {
    render(<Avatar name="Jane Golfer" testID="avatar" />);
    expect(screen.getByTestId('avatar')).toBeTruthy();
    expect(screen.getByText('JG')).toBeTruthy();
  });

  it('shows a single initial for a one-word name', () => {
    render(<Avatar name="Jane" testID="avatar" />);
    expect(screen.getByText('J')).toBeTruthy();
  });

  it('falls back to a placeholder when there is no name', () => {
    render(<Avatar name={null} testID="avatar" />);
    expect(screen.getByText('?')).toBeTruthy();
  });

  it('fills with the brand color', () => {
    render(<Avatar name="Jane Golfer" testID="avatar" />);
    expect(screen.getByTestId('avatar').props.className).toEqual(
      expect.stringContaining('bg-brand')
    );
  });
});

jest.mock('@/lib/hooks/useCourses', () => ({ useCourses: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useFocusEffect: (effect: () => void) => effect(),
}));

import { render, fireEvent, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { useCourses } from '@/lib/hooks/useCourses';
import CoursesScreen from '../courses';

describe('CoursesScreen', () => {
  const push = jest.fn();
  const refetch = jest.fn();

  beforeEach(() => {
    push.mockClear();
    refetch.mockClear();
    (useRouter as jest.Mock).mockReturnValue({ push });
  });

  it('shows a loading indicator while loading', () => {
    (useCourses as jest.Mock).mockReturnValue({ courses: [], loading: true, error: null, refetch });
    render(<CoursesScreen />);
    expect(screen.getByTestId('courses-loading')).toBeTruthy();
  });

  it('shows an empty state with an add button when there are no courses', () => {
    (useCourses as jest.Mock).mockReturnValue({ courses: [], loading: false, error: null, refetch });
    render(<CoursesScreen />);
    fireEvent.press(screen.getByTestId('add-first-course-button'));
    expect(push).toHaveBeenCalledWith('/course/new');
  });

  it('lists courses and navigates to the edit screen on tap', () => {
    (useCourses as jest.Mock).mockReturnValue({
      courses: [
        {
          id: 'abc',
          name: 'Pebble Beach',
          total_par: 72,
          tee_boxes: [{ name: 'Gulur', course_rating: 72.5, slope_rating: 130, total_length_meters: 6300 }],
        },
      ],
      loading: false,
      error: null,
      refetch,
    });
    render(<CoursesScreen />);
    expect(screen.getByText('Pebble Beach')).toBeTruthy();
    fireEvent.press(screen.getByTestId('course-row-abc'));
    expect(push).toHaveBeenCalledWith('/course/abc');
  });
});

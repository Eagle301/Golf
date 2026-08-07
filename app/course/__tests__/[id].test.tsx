jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
  Stack: { Screen: () => null },
}));
jest.mock('@/lib/hooks/useCourses', () => ({
  useCourse: jest.fn(),
  saveCourse: jest.fn(),
  deleteCourse: jest.fn(),
  CourseValidationError: class CourseValidationError extends Error {},
}));

import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as useCoursesModule from '@/lib/hooks/useCourses';
import CourseFormScreen from '../[id]';

describe('CourseFormScreen', () => {
  const push = jest.fn();
  const back = jest.fn();

  const validHoles = Array.from({ length: 18 }, (_, i) => ({
    hole_number: i + 1,
    par: 4 as const,
    length_meters: 350,
    stroke_index: i + 1,
  }));

  const blankHoles = Array.from({ length: 18 }, (_, i) => ({
    hole_number: i + 1,
    par: null,
    length_meters: null,
    stroke_index: null,
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push, back });
  });

  it('disables Save until all holes are filled in', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'new' });
    (useCoursesModule.useCourse as jest.Mock).mockReturnValue({
      course: { id: null, name: '', hole_count: 18, course_rating: null, slope_rating: null },
      holes: blankHoles,
      loading: false,
      error: null,
    });

    render(<CourseFormScreen />);

    expect(screen.getByTestId('save-course-button').props.accessibilityState.disabled).toBe(true);
  });

  it('saves a new course and navigates back', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'new' });
    (useCoursesModule.useCourse as jest.Mock).mockReturnValue({
      course: { id: null, name: '', hole_count: 18, course_rating: null, slope_rating: null },
      holes: validHoles,
      loading: false,
      error: null,
    });
    (useCoursesModule.saveCourse as jest.Mock).mockResolvedValue('new-id');

    render(<CourseFormScreen />);
    fireEvent.changeText(screen.getByTestId('course-name-input'), 'Test Course');
    fireEvent.changeText(screen.getByTestId('course-rating-input'), '72.5');
    fireEvent.changeText(screen.getByTestId('slope-rating-input'), '130');
    fireEvent.press(screen.getByTestId('save-course-button'));

    await waitFor(() => expect(back).toHaveBeenCalled());
    expect(useCoursesModule.saveCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Course',
        course_rating: 72.5,
        slope_rating: 130,
        holes: validHoles,
      })
    );
  });

  it('shows the delete button only when editing an existing course', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'abc' });
    (useCoursesModule.useCourse as jest.Mock).mockReturnValue({
      course: { id: 'abc', name: 'Existing', hole_count: 18, course_rating: 72.5, slope_rating: 130 },
      holes: validHoles,
      loading: false,
      error: null,
    });

    render(<CourseFormScreen />);
    expect(screen.getByTestId('delete-course-button')).toBeTruthy();
  });

  it('does not show the delete button for a new course', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'new' });
    (useCoursesModule.useCourse as jest.Mock).mockReturnValue({
      course: { id: null, name: '', hole_count: 18, course_rating: null, slope_rating: null },
      holes: blankHoles,
      loading: false,
      error: null,
    });

    render(<CourseFormScreen />);
    expect(screen.queryByTestId('delete-course-button')).toBeNull();
  });
});

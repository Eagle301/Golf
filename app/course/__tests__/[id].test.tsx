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
  blankTee: (count: number) => ({
    name: '',
    course_rating: null,
    slope_rating: null,
    lengths: Array(count).fill(null),
  }),
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
    stroke_index: i + 1,
  }));

  const blankHoles = Array.from({ length: 18 }, (_, i) => ({
    hole_number: i + 1,
    par: null,
    stroke_index: null,
  }));

  const validTee = {
    name: 'Gulur',
    course_rating: 70.9,
    slope_rating: 127,
    lengths: Array(18).fill(350),
  };

  const blankTee = {
    name: '',
    course_rating: null,
    slope_rating: null,
    lengths: Array(18).fill(null),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push, back });
  });

  it('disables Save until holes and tees are filled in', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'new' });
    (useCoursesModule.useCourse as jest.Mock).mockReturnValue({
      course: { id: null, name: '', hole_count: 18 },
      holes: blankHoles,
      tees: [blankTee],
      loading: false,
      error: null,
    });

    render(<CourseFormScreen />);

    expect(screen.getByTestId('save-course-button').props.accessibilityState.disabled).toBe(true);
  });

  it('saves a new course with its club and tees and navigates back', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'new' });
    (useCoursesModule.useCourse as jest.Mock).mockReturnValue({
      course: { id: null, name: '', club: null, hole_count: 18 },
      holes: validHoles,
      tees: [validTee],
      loading: false,
      error: null,
    });
    (useCoursesModule.saveCourse as jest.Mock).mockResolvedValue('new-id');

    render(<CourseFormScreen />);
    fireEvent.changeText(screen.getByTestId('course-name-input'), 'Test Course');
    fireEvent.changeText(screen.getByTestId('course-club-input'), 'GKG');
    fireEvent.changeText(screen.getByTestId('course-latitude-input'), '64.12');
    fireEvent.changeText(screen.getByTestId('course-longitude-input'), '-21.76');
    fireEvent.press(screen.getByTestId('save-course-button'));

    await waitFor(() => expect(back).toHaveBeenCalled());
    expect(useCoursesModule.saveCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Course',
        club: 'GKG',
        latitude: 64.12,
        longitude: -21.76,
        holes: validHoles,
        tees: [validTee],
      })
    );
  });

  it('saves null coordinates when the location fields are left empty', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'new' });
    (useCoursesModule.useCourse as jest.Mock).mockReturnValue({
      course: { id: null, name: '', club: null, hole_count: 18, latitude: null, longitude: null },
      holes: validHoles,
      tees: [validTee],
      loading: false,
      error: null,
    });
    (useCoursesModule.saveCourse as jest.Mock).mockResolvedValue('new-id');

    render(<CourseFormScreen />);
    fireEvent.changeText(screen.getByTestId('course-name-input'), 'Test Course');
    fireEvent.press(screen.getByTestId('save-course-button'));

    await waitFor(() => expect(back).toHaveBeenCalled());
    expect(useCoursesModule.saveCourse).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: null, longitude: null })
    );
  });

  it('adds another tee box card when Add tee box is pressed', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'new' });
    (useCoursesModule.useCourse as jest.Mock).mockReturnValue({
      course: { id: null, name: '', hole_count: 18 },
      holes: validHoles,
      tees: [validTee],
      loading: false,
      error: null,
    });

    render(<CourseFormScreen />);
    expect(screen.queryByTestId('tee-name-1')).toBeNull();
    fireEvent.press(screen.getByTestId('add-tee-button'));
    expect(screen.getByTestId('tee-name-1')).toBeTruthy();
  });

  it('shows the delete button only when editing an existing course', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'abc' });
    (useCoursesModule.useCourse as jest.Mock).mockReturnValue({
      course: { id: 'abc', name: 'Existing', hole_count: 18 },
      holes: validHoles,
      tees: [{ ...validTee, id: 't1' }],
      loading: false,
      error: null,
    });

    render(<CourseFormScreen />);
    expect(screen.getByTestId('delete-course-button')).toBeTruthy();
  });

  it('does not show the delete button for a new course', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'new' });
    (useCoursesModule.useCourse as jest.Mock).mockReturnValue({
      course: { id: null, name: '', hole_count: 18 },
      holes: blankHoles,
      tees: [blankTee],
      loading: false,
      error: null,
    });

    render(<CourseFormScreen />);
    expect(screen.queryByTestId('delete-course-button')).toBeNull();
  });
});

describe('CourseFormScreen aerial map button', () => {
  const push = jest.fn();

  const holes = Array.from({ length: 18 }, (_, i) => ({
    hole_number: i + 1,
    par: 4 as const,
    stroke_index: i + 1,
  }));
  const tee = { name: 'Gulur', course_rating: 70.9, slope_rating: 127, lengths: Array(18).fill(350) };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push, back: jest.fn() });
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'course-1' });
  });

  function mockCourseAt(latitude: number | null, longitude: number | null) {
    (useCoursesModule.useCourse as jest.Mock).mockReturnValue({
      course: { id: 'course-1', name: 'Landið', club: 'GR', hole_count: 18, latitude, longitude },
      holes,
      tees: [tee],
      loading: false,
      error: null,
    });
  }

  it('opens the aerial view for a course that has coordinates', () => {
    mockCourseAt(64.14977, -21.76237);

    render(<CourseFormScreen />);
    fireEvent.press(screen.getByTestId('course-map-button'));

    expect(push).toHaveBeenCalledWith({
      pathname: '/course/aerial',
      params: { name: 'Landið', club: 'GR', lat: '64.14977', lng: '-21.76237' },
    });
  });

  it('maps the coordinates currently typed into the form, not the saved ones', () => {
    mockCourseAt(64.14977, -21.76237);

    render(<CourseFormScreen />);
    fireEvent.changeText(screen.getByTestId('course-latitude-input'), '64.05788');
    fireEvent.changeText(screen.getByTestId('course-longitude-input'), '-21.99497');
    fireEvent.press(screen.getByTestId('course-map-button'));

    expect(push).toHaveBeenCalledWith({
      pathname: '/course/aerial',
      params: { name: 'Landið', club: 'GR', lat: '64.05788', lng: '-21.99497' },
    });
  });

  it('hides the map button until the course has coordinates', () => {
    mockCourseAt(null, null);

    render(<CourseFormScreen />);

    expect(screen.queryByTestId('course-map-button')).toBeNull();
  });
});

describe('CourseFormScreen hole lines button', () => {
  const push = jest.fn();

  const holes = Array.from({ length: 18 }, (_, i) => ({
    hole_number: i + 1,
    par: 4 as const,
    stroke_index: i + 1,
  }));
  const tee = { name: 'Gulur', course_rating: 70.9, slope_rating: 127, lengths: Array(18).fill(350) };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push, back: jest.fn() });
  });

  function mockCourse(id: string | null, latitude: number | null, longitude: number | null) {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: id ?? 'new' });
    (useCoursesModule.useCourse as jest.Mock).mockReturnValue({
      course: { id, name: 'Landið', club: 'GR', hole_count: 18, latitude, longitude },
      holes,
      tees: [tee],
      loading: false,
      error: null,
    });
  }

  it('opens the hole line editor for a saved course with coordinates', () => {
    mockCourse('course-1', 64.14977, -21.76237);

    render(<CourseFormScreen />);
    fireEvent.press(screen.getByTestId('course-holes-button'));

    expect(push).toHaveBeenCalledWith({
      pathname: '/course/holes',
      params: { id: 'course-1', name: 'Landið', club: 'GR', lat: '64.14977', lng: '-21.76237' },
    });
  });

  it('hides the hole line editor until the course has been saved', () => {
    mockCourse(null, 64.14977, -21.76237);

    render(<CourseFormScreen />);

    expect(screen.queryByTestId('course-holes-button')).toBeNull();
  });

  it('hides the hole line editor for a course with no coordinates', () => {
    mockCourse('course-1', null, null);

    render(<CourseFormScreen />);

    expect(screen.queryByTestId('course-holes-button')).toBeNull();
  });
});

jest.mock('@/lib/hooks/useCourses', () => ({ useCourses: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useFocusEffect: (effect: () => void) => effect(),
}));
jest.mock('@/components/course/CourseMap', () => {
  const { View } = require('react-native');
  return {
    CourseMap: jest.fn((props: any) => <View testID="course-map-mock" {...{ markers: props.markers }} />),
  };
});
jest.mock('@/lib/offline/courseCache', () => ({ getCachedCourses: jest.fn() }));
jest.mock('@/lib/offline/activeRound', () => ({ setActiveRound: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/offline/localId', () => ({ generateLocalId: () => 'local_test' }));
jest.mock('@/lib/hooks/useProfile', () => ({ getCurrentHandicap: jest.fn().mockResolvedValue(12.4) }));

import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { useCourses } from '@/lib/hooks/useCourses';
import { getCachedCourses } from '@/lib/offline/courseCache';
import { setActiveRound } from '@/lib/offline/activeRound';
import { CourseMap } from '@/components/course/CourseMap';
import CoursesScreen from '../courses';
import type { CachedCourse } from '@/lib/offline/types';

describe('CoursesScreen', () => {
  const push = jest.fn();
  const refetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('map view', () => {
    const geocoded = {
      id: 'abc',
      name: 'Pebble Beach',
      club: 'GR',
      total_par: 72,
      latitude: 64.12,
      longitude: -21.76,
      tee_boxes: [],
    };
    const unGeocoded = {
      id: 'def',
      name: 'No Location GC',
      club: null,
      total_par: 71,
      latitude: null,
      longitude: null,
      tee_boxes: [],
    };

    beforeEach(() => {
      (useCourses as jest.Mock).mockReturnValue({
        courses: [geocoded, unGeocoded],
        loading: false,
        error: null,
        refetch,
      });
    });

    it('shows one toggle button whose label flips between Map and List', () => {
      render(<CoursesScreen />);
      expect(screen.getByText('Map')).toBeTruthy();
      expect(screen.queryByText('List')).toBeNull();

      fireEvent.press(screen.getByTestId('courses-view-toggle'));

      expect(screen.getByText('List')).toBeTruthy();
      expect(screen.queryByText('Map')).toBeNull();
    });

    it('switches to the map with only geocoded courses as markers', () => {
      render(<CoursesScreen />);
      expect(screen.queryByTestId('course-map-mock')).toBeNull();

      fireEvent.press(screen.getByTestId('courses-view-toggle'));

      expect(screen.getByTestId('course-map-mock')).toBeTruthy();
      const props = (CourseMap as jest.Mock).mock.calls.at(-1)[0];
      expect(props.markers).toEqual([
        { id: 'abc', name: 'Pebble Beach', club: 'GR', latitude: 64.12, longitude: -21.76 },
      ]);
      expect(screen.getByText('1 course has no location yet.')).toBeTruthy();
    });

    it('navigates to the editor when a map pin Edit is pressed', () => {
      render(<CoursesScreen />);
      fireEvent.press(screen.getByTestId('courses-view-toggle'));

      const props = (CourseMap as jest.Mock).mock.calls.at(-1)[0];
      props.onEditCourse('abc');

      expect(push).toHaveBeenCalledWith('/course/abc');
    });

    const cachedSingleTee: CachedCourse = {
      id: 'abc',
      name: 'Pebble Beach',
      club: 'GR',
      hole_count: 9,
      total_par: 36,
      holes: Array.from({ length: 9 }, (_, i) => ({
        id: `h${i + 1}`,
        hole_number: i + 1,
        par: 4 as const,
        stroke_index: i + 1,
      })),
      tees: [
        {
          id: 't1',
          name: 'Gulur',
          course_rating: 68.5,
          slope_rating: 125,
          total_length_meters: 3000,
          lengths: Array.from({ length: 9 }, () => 330),
        },
      ],
    };

    it('starts a round immediately when Play is pressed on a single-tee course', async () => {
      (getCachedCourses as jest.Mock).mockResolvedValue([cachedSingleTee]);
      render(<CoursesScreen />);
      fireEvent.press(screen.getByTestId('courses-view-toggle'));

      const props = (CourseMap as jest.Mock).mock.calls.at(-1)[0];
      props.onPlayCourse('abc');

      await waitFor(() => expect(push).toHaveBeenCalledWith('/round/active'));
      expect(setActiveRound).toHaveBeenCalledWith(
        expect.objectContaining({ course_id: 'abc', tee_box_id: 't1', tee_name: 'Gulur' })
      );
    });

    it('asks for a tee when Play is pressed on a multi-tee course', async () => {
      const twoTee: CachedCourse = {
        ...cachedSingleTee,
        tees: [
          cachedSingleTee.tees[0],
          { ...cachedSingleTee.tees[0], id: 't2', name: 'Rauður', total_length_meters: 2700 },
        ],
      };
      (getCachedCourses as jest.Mock).mockResolvedValue([twoTee]);
      render(<CoursesScreen />);
      fireEvent.press(screen.getByTestId('courses-view-toggle'));

      const props = (CourseMap as jest.Mock).mock.calls.at(-1)[0];
      props.onPlayCourse('abc');

      await waitFor(() => expect(screen.getByTestId('map-tee-t2')).toBeTruthy());
      expect(setActiveRound).not.toHaveBeenCalled();

      fireEvent.press(screen.getByTestId('map-tee-t2'));
      await waitFor(() => expect(push).toHaveBeenCalledWith('/round/active'));
      expect(setActiveRound).toHaveBeenCalledWith(
        expect.objectContaining({ course_id: 'abc', tee_box_id: 't2', tee_name: 'Rauður' })
      );
    });

    it('switches back to the list', () => {
      render(<CoursesScreen />);
      fireEvent.press(screen.getByTestId('courses-view-toggle'));
      fireEvent.press(screen.getByTestId('courses-view-toggle'));

      expect(screen.queryByTestId('course-map-mock')).toBeNull();
      expect(screen.getByTestId('course-row-abc')).toBeTruthy();
    });
  });
});

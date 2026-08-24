jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  Stack: { Screen: () => null },
}));
jest.mock('@/lib/hooks/useHoleGeometry', () => ({ useHoleGeometry: jest.fn(() => ({ holes: [], loading: false, error: null, refetch: jest.fn() })) }));
jest.mock('@/components/course/CourseAerial', () => {
  const { View } = require('react-native');
  return {
    CourseAerial: jest.fn((props: any) => <View testID="course-aerial-mock" />),
  };
});

import { render, screen } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { CourseAerial } from '@/components/course/CourseAerial';
import { useHoleGeometry } from '@/lib/hooks/useHoleGeometry';
import CourseAerialScreen from '../aerial';

describe('CourseAerialScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the aerial map for the course in the route params', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      name: 'Landið',
      club: 'GR',
      lat: '64.14977',
      lng: '-21.76237',
    });

    render(<CourseAerialScreen />);

    expect(screen.getByTestId('course-aerial-mock')).toBeTruthy();
    expect((CourseAerial as jest.Mock).mock.calls.at(-1)[0].course).toEqual({
      name: 'Landið',
      club: 'GR',
      latitude: 64.14977,
      longitude: -21.76237,
      holes: [],
    });
  });

  it('treats a missing club as no club rather than the string "undefined"', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      name: 'Landið',
      lat: '64.14977',
      lng: '-21.76237',
    });

    render(<CourseAerialScreen />);

    expect((CourseAerial as jest.Mock).mock.calls.at(-1)[0].course.club).toBeNull();
  });

  it('explains itself instead of mapping nowhere when coordinates are absent', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ name: 'Landið' });

    render(<CourseAerialScreen />);

    expect(screen.queryByTestId('course-aerial-mock')).toBeNull();
    expect(screen.getByText('This course has no location yet.')).toBeTruthy();
  });

  it('rejects coordinates that are not numbers', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      name: 'Landið',
      lat: 'nowhere',
      lng: '-21.76237',
    });

    render(<CourseAerialScreen />);

    expect(screen.queryByTestId('course-aerial-mock')).toBeNull();
  });

  it('rejects coordinates outside the valid latitude/longitude range', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      name: 'Landið',
      lat: '164.1',
      lng: '-21.76237',
    });

    render(<CourseAerialScreen />);

    expect(screen.queryByTestId('course-aerial-mock')).toBeNull();
  });
});

describe('CourseAerialScreen hole lines', () => {
  beforeEach(() => jest.clearAllMocks());

  it('draws the hole lines of the course it was given', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      id: 'course-1',
      name: 'Landið',
      lat: '64.14977',
      lng: '-21.76237',
    });
    (useHoleGeometry as jest.Mock).mockReturnValue({
      holes: [
        { id: 'h1', hole_number: 1, par: 4, path: [[64.15, -21.765], [64.152, -21.76]] },
        { id: 'h2', hole_number: 2, par: 3, path: [] },
      ],
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<CourseAerialScreen />);

    expect((CourseAerial as jest.Mock).mock.calls.at(-1)[0].course.holes).toEqual([
      { hole_number: 1, path: [[64.15, -21.765], [64.152, -21.76]] },
      { hole_number: 2, path: [] },
    ]);
  });

  it('still shows the map for a course whose lines have not been drawn', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      name: 'Landið',
      lat: '64.14977',
      lng: '-21.76237',
    });
    (useHoleGeometry as jest.Mock).mockReturnValue({
      holes: [],
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<CourseAerialScreen />);

    expect((CourseAerial as jest.Mock).mock.calls.at(-1)[0].course.holes).toEqual([]);
  });
});

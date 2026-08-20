jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useFocusEffect: (cb: () => void) => {
    const { useEffect } = require('react');
    useEffect(cb, []);
  },
}));
jest.mock('@/lib/offline/courseCache', () => ({
  getCachedCourses: jest.fn(),
  refreshCourseCache: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/offline/activeRound', () => ({
  getActiveRound: jest.fn().mockResolvedValue(null),
  setActiveRound: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/offline/localId', () => ({
  generateLocalId: () => 'local_test',
}));
jest.mock('@/lib/hooks/useRoundSync', () => ({
  syncPendingRounds: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/hooks/useRounds', () => ({
  useRounds: jest.fn(() => ({ rounds: [], loading: false, error: null, refetch: jest.fn() })),
}));
jest.mock('@/lib/hooks/useProfile', () => ({
  getCurrentHandicap: jest.fn().mockResolvedValue(12.4),
}));

import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { getCachedCourses } from '@/lib/offline/courseCache';
import { setActiveRound } from '@/lib/offline/activeRound';
import RoundsScreen from '../rounds';
import type { CachedCourse } from '@/lib/offline/types';

const holes = Array.from({ length: 9 }, (_, i) => ({
  id: `h${i + 1}`,
  hole_number: i + 1,
  par: 4 as const,
  stroke_index: i + 1,
}));

const singleTeeCourse: CachedCourse = {
  id: 'c1',
  name: 'One Tee GC',
  club: null,
  hole_count: 9,
  total_par: 36,
  holes,
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

const twoTeeCourse: CachedCourse = {
  ...singleTeeCourse,
  id: 'c2',
  name: 'Two Tee GC',
  tees: [
    singleTeeCourse.tees[0],
    {
      id: 't2',
      name: 'Rauður',
      course_rating: 66.1,
      slope_rating: 118,
      total_length_meters: 2700,
      lengths: Array.from({ length: 9 }, () => 300),
    },
  ],
};

describe('RoundsScreen tee selection', () => {
  const push = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push });
  });

  it('hides the course list behind the Start a round button', async () => {
    (getCachedCourses as jest.Mock).mockResolvedValue([singleTeeCourse]);

    render(<RoundsScreen />);
    await waitFor(() => expect(screen.getByTestId('start-round-button')).toBeTruthy());

    expect(screen.queryByTestId('start-round-c1')).toBeNull();
    fireEvent.press(screen.getByTestId('start-round-button'));
    expect(screen.getByTestId('start-round-c1')).toBeTruthy();
  });

  it('filters the course list from the search bar', async () => {
    (getCachedCourses as jest.Mock).mockResolvedValue([singleTeeCourse, twoTeeCourse]);

    render(<RoundsScreen />);
    await waitFor(() => expect(screen.getByTestId('start-round-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('start-round-button'));

    expect(screen.getByTestId('start-round-c1')).toBeTruthy();
    expect(screen.getByTestId('start-round-c2')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('course-search-input'), 'two');

    expect(screen.queryByTestId('start-round-c1')).toBeNull();
    expect(screen.getByTestId('start-round-c2')).toBeTruthy();
  });

  it('closes the course popup without starting when dismissed', async () => {
    (getCachedCourses as jest.Mock).mockResolvedValue([singleTeeCourse]);

    render(<RoundsScreen />);
    await waitFor(() => expect(screen.getByTestId('start-round-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('start-round-button'));
    fireEvent.press(screen.getByTestId('start-round-close'));

    expect(screen.queryByTestId('start-round-c1')).toBeNull();
    expect(setActiveRound).not.toHaveBeenCalled();
  });

  it('starts a round immediately for a single-tee course, snapshotting the tee', async () => {
    (getCachedCourses as jest.Mock).mockResolvedValue([singleTeeCourse]);

    render(<RoundsScreen />);
    await waitFor(() => expect(screen.getByTestId('start-round-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('start-round-button'));
    fireEvent.press(screen.getByTestId('start-round-c1'));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/round/active'));
    expect(setActiveRound).toHaveBeenCalledWith(
      expect.objectContaining({
        course_id: 'c1',
        tee_box_id: 't1',
        tee_name: 'Gulur',
        course_rating: 68.5,
        slope_rating: 125,
        total_length_meters: 3000,
        holeLogs: expect.arrayContaining([expect.objectContaining({ hole_number: 1, length_meters: 330 })]),
      })
    );
  });

  it('shows tee options for a multi-tee course and starts with the chosen tee', async () => {
    (getCachedCourses as jest.Mock).mockResolvedValue([twoTeeCourse]);

    render(<RoundsScreen />);
    await waitFor(() => expect(screen.getByTestId('start-round-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('start-round-button'));
    fireEvent.press(screen.getByTestId('start-round-c2'));

    expect(setActiveRound).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('start-round-c2-tee-t2')).toBeTruthy());
    fireEvent.press(screen.getByTestId('start-round-c2-tee-t2'));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/round/active'));
    expect(setActiveRound).toHaveBeenCalledWith(
      expect.objectContaining({
        course_id: 'c2',
        tee_box_id: 't2',
        tee_name: 'Rauður',
        course_rating: 66.1,
        slope_rating: 118,
        holeLogs: expect.arrayContaining([expect.objectContaining({ hole_number: 1, length_meters: 300 })]),
      })
    );
  });
});

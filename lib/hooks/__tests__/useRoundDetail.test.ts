jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), auth: { getUser: jest.fn() } },
}));
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { supabase } from '@/lib/supabase';
import { createQueryBuilderMock } from '@/lib/testUtils/supabaseMock';
import { useRoundDetail } from '../useRoundDetail';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useRoundDetail', () => {
  it('reads course/slope rating and tee name from the round tee box', async () => {
    const roundBuilder = createQueryBuilderMock({
      data: {
        handicap_at_time: 12.4,
        score_differential: 10.2,
        tee_boxes: { name: 'Gulur', course_rating: 70.9, slope_rating: 127 },
        courses: { name: 'Pebble', total_par: 72, hole_count: 18 },
      },
      error: null,
    });
    const holeLogsBuilder = createQueryBuilderMock({
      data: [
        {
          score: 5,
          putts: 2,
          fairway_hit: 'yes',
          gir: false,
          penalties: 0,
          holes: { hole_number: 1, par: 4, stroke_index: 7 },
        },
      ],
      error: null,
    });
    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      table === 'rounds' ? roundBuilder : holeLogsBuilder
    );

    const { result } = renderHook(() => useRoundDetail('round-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.roundDetail).toMatchObject({
      courseName: 'Pebble',
      teeName: 'Gulur',
      courseRating: 70.9,
      slopeRating: 127,
      totalPar: 72,
      holeCount: 18,
    });
  });

  it('leaves tee fields null for rounds without a tee box', async () => {
    const roundBuilder = createQueryBuilderMock({
      data: {
        handicap_at_time: null,
        score_differential: null,
        tee_boxes: null,
        courses: { name: 'Pebble', total_par: 72, hole_count: 18 },
      },
      error: null,
    });
    const holeLogsBuilder = createQueryBuilderMock({ data: [], error: null });
    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      table === 'rounds' ? roundBuilder : holeLogsBuilder
    );

    const { result } = renderHook(() => useRoundDetail('round-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.roundDetail).toMatchObject({
      teeName: null,
      courseRating: null,
      slopeRating: null,
    });
  });
});

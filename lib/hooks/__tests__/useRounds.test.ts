jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { supabase } from '@/lib/supabase';
import { createQueryBuilderMock } from '@/lib/testUtils/supabaseMock';
import { useRounds } from '../useRounds';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useRounds', () => {
  it('fetches rounds including the course id for most-played grouping', async () => {
    const rounds = [
      { id: 'r1', course_id: 'c1', date_played: '2026-08-01', total_score: 85, total_putts: 30, courses: { name: 'Mýrin' } },
    ];
    const builder = createQueryBuilderMock({ data: rounds, error: null });
    (supabase.from as jest.Mock).mockReturnValue(builder);

    const { result } = renderHook(() => useRounds());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(builder.select).toHaveBeenCalledWith(expect.stringContaining('course_id'));
    expect(result.current.rounds[0].course_id).toBe('c1');
  });
});

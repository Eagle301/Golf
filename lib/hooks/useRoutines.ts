import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { seedStarterRoutines } from '@/lib/training/seedRoutines';
import type { TrainingCategory } from '@/types/database';

export interface DrillInput {
  id?: string;
  name: string;
  target_value: number | null;
  photo_url: string | null;
}

export interface RoutineListItem {
  id: string;
  name: string;
  description: string | null;
  category: TrainingCategory;
}

export class RoutineValidationError extends Error {}

export interface UseRoutinesResult {
  routines: RoutineListItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

async function fetchRoutinesForCurrentUser(): Promise<RoutineListItem[]> {
  const { data, error } = await supabase
    .from('training_routines')
    .select('id, name, description, category')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as RoutineListItem[]) ?? [];
}

// Shared across every useRoutines() instance (e.g. the hook's own mount
// effect and a screen's useFocusEffect refetch land at nearly the same
// time) so two concurrent "you have zero routines" checks can't both decide
// to seed, which previously inserted the starter set twice.
let seedInFlight: Promise<void> | null = null;

async function ensureSeeded(userId: string): Promise<void> {
  if (!seedInFlight) {
    seedInFlight = seedStarterRoutines(userId).finally(() => {
      seedInFlight = null;
    });
  }
  await seedInFlight;
}

/** Lists the current user's routines, seeding the starter set the first time a user has none. */
export function useRoutines(): UseRoutinesResult {
  const [routines, setRoutines] = useState<RoutineListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutines = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let data = await fetchRoutinesForCurrentUser();

      if (data.length === 0) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await ensureSeeded(user.id);
          data = await fetchRoutinesForCurrentUser();
        }
      }

      setRoutines(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load routines.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRoutines();
  }, [fetchRoutines]);

  return { routines, loading, error, refetch: fetchRoutines };
}

export interface UseRoutineResult {
  routine: {
    id: string | null;
    name: string;
    description: string | null;
    category: TrainingCategory;
  };
  drills: DrillInput[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function blankRoutine(): UseRoutineResult['routine'] {
  return { id: null, name: '', description: null, category: 'putts' };
}

export function useRoutine(id: string): UseRoutineResult {
  const isNew = id === 'new';
  const [routine, setRoutine] = useState<UseRoutineResult['routine']>(blankRoutine());
  const [drills, setDrills] = useState<DrillInput[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutine = useCallback(async () => {
    if (isNew) {
      setRoutine(blankRoutine());
      setDrills([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [routineResult, drillsResult] = await Promise.all([
      supabase.from('training_routines').select('id, name, description, category').eq('id', id).single(),
      supabase
        .from('training_drills')
        .select('id, name, target_value, photo_url')
        .eq('routine_id', id)
        .order('sort_order'),
    ]);

    if (routineResult.error) {
      setError(routineResult.error.message);
      setLoading(false);
      return;
    }
    if (drillsResult.error) {
      setError(drillsResult.error.message);
      setLoading(false);
      return;
    }

    setRoutine(routineResult.data as UseRoutineResult['routine']);
    setDrills((drillsResult.data as DrillInput[]) ?? []);
    setLoading(false);
  }, [id, isNew]);

  useEffect(() => {
    fetchRoutine();
  }, [fetchRoutine]);

  return { routine, drills, loading, error, refetch: fetchRoutine };
}

export interface SaveRoutineInput {
  id?: string;
  name: string;
  description: string | null;
  category: TrainingCategory;
  drills: DrillInput[];
}

function validateSaveRoutineInput(input: SaveRoutineInput): void {
  if (!input.name.trim()) {
    throw new RoutineValidationError('Routine name is required.');
  }
  if (input.drills.length === 0) {
    throw new RoutineValidationError('Add at least one drill.');
  }
  for (const drill of input.drills) {
    if (!drill.name.trim()) {
      throw new RoutineValidationError('Every drill needs a name.');
    }
  }
}

export async function saveRoutine(input: SaveRoutineInput): Promise<string> {
  validateSaveRoutineInput(input);

  let routineId = input.id;

  if (!routineId || routineId === 'new') {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated.');
    }

    const { data, error } = await (supabase.from('training_routines') as any)
      .insert({
        user_id: user.id,
        name: input.name,
        description: input.description,
        category: input.category,
      })
      .select('id')
      .single();

    if (error) throw error;
    routineId = (data as { id: string }).id;
  } else {
    const { error } = await (supabase.from('training_routines') as any)
      .update({ name: input.name, description: input.description, category: input.category })
      .eq('id', routineId);

    if (error) throw error;

    const keptDrillIds = input.drills.map((d) => d.id).filter((id): id is string => !!id);
    const { error: deleteError } = await (supabase.from('training_drills') as any)
      .delete()
      .eq('routine_id', routineId)
      .not('id', 'in', `(${keptDrillIds.length > 0 ? keptDrillIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);

    if (deleteError) {
      if (deleteError.code === '23503') {
        throw new Error("A removed drill has training sessions logged against it and can't be deleted.");
      }
      throw deleteError;
    }
  }

  const orderedDrills = input.drills.map((d, sort_order) => ({ ...d, sort_order }));
  const existingDrills = orderedDrills.filter((d) => d.id);
  const newDrills = orderedDrills.filter((d) => !d.id);

  if (existingDrills.length > 0) {
    const { error: updateError } = await (supabase.from('training_drills') as any).upsert(
      existingDrills.map((d) => ({
        id: d.id,
        routine_id: routineId,
        name: d.name,
        target_value: d.target_value,
        photo_url: d.photo_url,
        sort_order: d.sort_order,
      }))
    );
    if (updateError) throw updateError;
  }

  if (newDrills.length > 0) {
    const { error: insertError } = await (supabase.from('training_drills') as any).insert(
      newDrills.map((d) => ({
        routine_id: routineId,
        name: d.name,
        target_value: d.target_value,
        photo_url: d.photo_url,
        sort_order: d.sort_order,
      }))
    );
    if (insertError) throw insertError;
  }

  return routineId as string;
}

export async function deleteRoutine(id: string): Promise<void> {
  const { error } = await supabase.from('training_routines').delete().eq('id', id);

  if (error) {
    if (error.code === '23503') {
      throw new Error("This routine has sessions logged against it and can't be deleted.");
    }
    throw error;
  }
}

import { supabase } from '@/lib/supabase';
import type { TrainingCategory } from '@/types/database';

interface SeedDrill {
  name: string;
  target_value: number;
}

interface SeedRoutine {
  name: string;
  description: string;
  category: TrainingCategory;
  drills: SeedDrill[];
}

// Sourced from the GolfWell "Golf Blueprint" 90-minute plan (Day One).
const STARTER_ROUTINES: SeedRoutine[] = [
  {
    name: 'AP Skeleton',
    description:
      'Half-moon putting gate: 6 tees fanned around the hole, 2 chances to hit each one before moving on - miss more than twice at any tee and restart from the first.',
    category: 'putts',
    drills: [
      { name: 'Tee 1 (2 chances)', target_value: 2 },
      { name: 'Tee 2 (2 chances)', target_value: 2 },
      { name: 'Tee 3 (2 chances)', target_value: 2 },
      { name: 'Tee 4 (2 chances)', target_value: 2 },
      { name: 'Tee 5 (2 chances)', target_value: 2 },
      { name: 'Tee 6 (2 chances)', target_value: 2 },
    ],
  },
  {
    name: 'Lil Jon',
    description:
      'Wedge distance ladder: dial in 30, 60, and 90 yards with your sand wedge, then repeat with your 60°. A great warm-up to start the day.',
    category: 'short_game',
    drills: [
      { name: 'SW - 30 yards', target_value: 3 },
      { name: 'SW - 60 yards', target_value: 3 },
      { name: 'SW - 90 yards', target_value: 3 },
      { name: '60° - 30 yards', target_value: 3 },
      { name: '60° - 60 yards', target_value: 3 },
      { name: '60° - 90 yards', target_value: 3 },
    ],
  },
  {
    name: '3 A Side',
    description:
      'Lob wedge precision ladder: land within 3 yards of 50, then 60, then 70 yards, 3 chances each - miss more than twice at any distance and restart from the top.',
    category: 'short_game',
    drills: [
      { name: '50 yards, within 3yd (3 tries)', target_value: 3 },
      { name: '60 yards, within 3yd (3 tries)', target_value: 3 },
      { name: '70 yards, within 3yd (3 tries)', target_value: 3 },
    ],
  },
  {
    name: 'Good, Bad, Ugly',
    description:
      'Three-lie chip test at each location: a tweener fringe shot, a straightforward chip, and a dead/bad lie - all three need to finish within 6 feet before you move on. Push for 4+ locations in 10 minutes.',
    category: 'short_game',
    drills: [
      { name: 'Tweener fringe chip (within 6ft)', target_value: 1 },
      { name: 'Straightforward chip (within 6ft)', target_value: 1 },
      { name: 'Bad lie chip (within 6ft)', target_value: 1 },
      { name: 'Locations completed', target_value: 4 },
    ],
  },
  {
    name: 'Shot Shaper',
    description:
      'GB Turr fade game: from 150-170 yards, hit a controlled fade to a conservative target without crossing the pin line. Push through a pressure 6th shot after 5 jump squats.',
    category: 'full_swing',
    drills: [
      { name: 'Controlled fades in a row', target_value: 5 },
      { name: 'Pressure 6th shot after jump squats', target_value: 1 },
    ],
  },
  {
    name: 'Heart Rate Tee Ball',
    description:
      'Tight tee shot ladder: drive between two targets 22 yards apart, then spike your heart rate with jumping jacks before every rep to simulate tournament nerves.',
    category: 'full_swing',
    drills: [{ name: 'Drives landing in the 22yd corridor', target_value: 8 }],
  },
  {
    name: 'Second Serve',
    description:
      'Driver vs 3-wood decision game: hit the same target with both clubs and compare dispersion - which one holds up better under pressure?',
    category: 'full_swing',
    drills: [
      { name: 'Driver to target', target_value: 5 },
      { name: '3-wood to target', target_value: 5 },
    ],
  },
  {
    name: 'Pre-Shot Routine',
    description:
      '"Breathe & Go": look at the target and breathe in, look back to the ball and breathe out, then start your swing the moment your exhale finishes. Rehearse it on every single ball until it is automatic.',
    category: 'strategy',
    drills: [{ name: 'Balls with full Breathe & Go routine', target_value: 20 }],
  },
  {
    name: 'Tension Check',
    description:
      'Tension awareness drill: feel what different amounts of grip and body tension do to your strike, working from tight toward loose - your best shots should come from the lightest, loosest set.',
    category: 'strategy',
    drills: [
      { name: 'Tight grip, progressively lightening', target_value: 10 },
      { name: 'Tensed legs', target_value: 5 },
      { name: 'Tensed chest & shoulders', target_value: 5 },
      { name: 'Clenched jaw', target_value: 5 },
      { name: 'Loose & light grip (should be your best shots)', target_value: 5 },
    ],
  },
  {
    name: 'Narrowing Fairway',
    description:
      'Tournament-pressure tee shots: pick two targets to mark a 50-yard-wide fairway and hit 3 drives down it in a row, then narrow to 30 yards, then 10 - miss and you restart that width from zero.',
    category: 'strategy',
    drills: [
      { name: '50-yard fairway (3 in a row)', target_value: 3 },
      { name: '30-yard fairway (3 in a row)', target_value: 3 },
      { name: '10-yard fairway (3 in a row)', target_value: 3 },
    ],
  },
  {
    name: 'Pressure Putts',
    description:
      'The 8x5ft challenge: make 8 putts in a row from 5 feet. A miss resets the streak to zero - track how many total attempts it takes you to finally string 8 together.',
    category: 'strategy',
    drills: [{ name: '5ft putts made in a row', target_value: 8 }],
  },
];

/** Seeds the starter routines above for a first-time user. Safe to call repeatedly - callers only invoke it when the user has zero routines. */
export async function seedStarterRoutines(userId: string): Promise<void> {
  for (const routine of STARTER_ROUTINES) {
    const { data: inserted, error: routineError } = await (supabase.from('training_routines') as any)
      .insert({
        user_id: userId,
        name: routine.name,
        description: routine.description,
        category: routine.category,
      })
      .select('id')
      .single();

    if (routineError) throw routineError;

    const routineId = (inserted as { id: string }).id;

    const { error: drillsError } = await (supabase.from('training_drills') as any).insert(
      routine.drills.map((drill, index) => ({
        routine_id: routineId,
        name: drill.name,
        target_value: drill.target_value,
        sort_order: index,
      }))
    );

    if (drillsError) throw drillsError;
  }
}

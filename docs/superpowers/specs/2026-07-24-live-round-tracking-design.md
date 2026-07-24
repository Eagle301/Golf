# Live Round Tracking (Offline-First) — Design

## Context

Course management already exists (create/edit/delete courses with holes,
synced live to Supabase). This feature adds the core interaction of the app:
tracking a round hole-by-hole. It must work fully offline — the device may
have no connection for the entire round — and sync to Supabase only when the
user explicitly finishes the round, or automatically the next time a
connection is detected if the finish happened offline.

## Local storage layer (`lib/offline/`)

Plain AsyncStorage with JSON blobs under a few fixed keys — no SQLite, matching
the app's existing "plain hooks, minimal dependencies" approach.

- **`courseCache.ts`**
  - `refreshCourseCache(): Promise<void>` — fetches all of the user's courses
    and, for each, its holes (including each hole's real Supabase `id`,
    `hole_number`, `par`, `length_meters`), and writes the combined array to
    AsyncStorage under `CACHED_COURSES`. Called whenever the Rounds tab's
    course picker mounts and a fetch succeeds; silently does nothing if
    offline (the existing cache is left untouched).
  - `getCachedCourses(): Promise<CachedCourse[]>` — reads the cache; returns
    `[]` if nothing has been cached yet (e.g. first-ever launch offline).

- **`activeRound.ts`** — the single in-progress round, if any.
  - `getActiveRound(): Promise<ActiveRound | null>`
  - `setActiveRound(round: ActiveRound): Promise<void>`
  - `clearActiveRound(): Promise<void>`
  - `ActiveRound` shape:
    ```ts
    interface ActiveRound {
      localId: string; // client-generated, e.g. via a timestamp+random string
      course_id: string;
      course_name: string;
      hole_count: 9 | 18;
      date_played: string; // ISO date, set to today when the round is started
      notes: string;
      currentHoleIndex: number; // 0-based; === hole_count once on the finish panel
      holeLogs: HoleLogEntry[];
    }

    interface HoleLogEntry {
      hole_number: number;
      par: number; // copied from the cached course at round-start time
      hole_id: string; // real Supabase holes.id, from the cached course
      score: number | null;
      putts: number | null;
      fairway_hit: FairwayHit | null; // reuse the existing FairwayHit type
      gir: boolean | null;
      gir_overridden: boolean;
      penalties: number;
      chip_shots: number;
    }
    ```

- **`pendingRounds.ts`** — finished rounds waiting to be written to Supabase.
  - `getPendingRounds(): Promise<PendingRound[]>`
  - `addPendingRound(round: PendingRound): Promise<void>`
  - `removePendingRound(localId: string): Promise<void>`
  - `PendingRound` shape: `{ localId, course_id, date_played, notes,
    total_score, total_putts, score_differential, holeLogs: HoleLogEntry[] }`
    — `total_score`/`total_putts` are sums across `holeLogs`;
    `score_differential = total_score - course total_par` (par is available
    per-hole in `holeLogs`, summed the same way `lib/calculations.ts` already
    does elsewhere).

## Sync (`lib/hooks/useRoundSync.ts`)

- Adds `@react-native-community/netinfo` (installed via `npx expo install`).
- `syncPendingRounds(): Promise<void>` — reads the pending queue and processes
  each entry **in order**: insert one `rounds` row (getting back its real id),
  then insert that round's `hole_logs` rows (using the real `hole_id`s already
  stored on each `HoleLogEntry`), then `removePendingRound` for that entry —
  only after both inserts succeed. If an entry fails, processing stops there
  (earlier successes are already removed from the queue; the failed entry and
  anything after it stay queued for the next attempt).
- A hook `useRoundSync()` calls `syncPendingRounds()` once on mount and again
  every time NetInfo reports a transition into a connected state. It's
  mounted once at the app root (`app/_layout.tsx`, alongside the existing
  auto-sign-in gate) so syncing happens regardless of which screen is open.
- `Finish Round` also calls `syncPendingRounds()` directly right after queuing
  the new entry, as a best-effort immediate attempt — no different from the
  reconnect path, just triggered eagerly instead of waiting for a NetInfo
  event.

## Screens

### `app/(tabs)/rounds.tsx` (replaces the current placeholder)

- **Start Round**: a course picker sourced from `getCachedCourses()` (works
  offline). Selecting a course builds a fresh `ActiveRound` (holes populated
  from the cached course, `date_played` = today, empty notes) via
  `setActiveRound`, then navigates to `/round/active`. On mount, this screen
  also calls `refreshCourseCache()` in the background (fire-and-forget) so
  the picker stays current when online, without blocking offline use.
- **Resume banner**: if `getActiveRound()` returns non-null, a banner reading
  "Round in progress at `<course_name>` — Resume" is shown above the course
  picker; tapping it navigates to `/round/active`.
- **History list**: a new `useRounds()` hook (`lib/hooks/useRounds.ts`) fetches
  the signed-in user's synced rounds joined with course name (`date_played`,
  course name, `total_score`, `total_putts`), rendered below, newest first.
  This part requires connectivity like the rest of the app's data views —
  only the round-tracking flow itself is offline-first.

### `app/round/[id].tsx` (replaces the current placeholder; used only as `/round/active`)

- Loads the `ActiveRound` from storage on mount via a `useActiveRound()` hook
  that also persists back to AsyncStorage on every change (debounced or
  immediate — immediate is simpler and the payload is tiny).
- **Per-hole view** (`currentHoleIndex < hole_count`): shows hole number/par/
  length (read-only), then inputs for score (required), putts (required),
  fairway hit (5-way selector, optional), GIR (a toggle initialized from
  `calculateGir(score, putts, par)` whenever score/putts change and
  `gir_overridden` is false; tapping it flips the value and sets
  `gir_overridden = true`), penalties (stepper, default 0), chip shots
  (stepper, default 0).
- **Next/Previous**: Previous always enabled (except on hole 1). Next is
  disabled until score and putts are both entered for the current hole;
  pressing it on the last hole moves to the finish panel
  (`currentHoleIndex === hole_count`).
- **Finish panel**: a notes textarea (optional) and a "Finish Round" button.
  Pressing it builds the `PendingRound`, calls `addPendingRound`, then
  `clearActiveRound`, triggers `syncPendingRounds()` (best-effort), and
  navigates back to the Rounds tab.
- **Discard**: available throughout (per-hole view and finish panel) as a
  destructive action with a confirm dialog; clears the active round with no
  Supabase writes and returns to the Rounds tab.

## Out of scope

- Weather field (explicitly dropped for this iteration; the `rounds.weather`
  column stays in the schema, just unused).
- Editing a round after it's synced (this session only covers create-via-live-
  tracking).
- Course detail / hole-averages screen (still depends on rounds existing in
  volume; not part of this iteration).

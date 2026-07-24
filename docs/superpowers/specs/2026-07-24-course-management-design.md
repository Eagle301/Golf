# Course Management — Design

## Context

The Golf Improvement app's Supabase schema (profiles, courses, holes, rounds,
hole_logs) and Expo Router scaffold already exist. This is the first real
feature: creating, editing, listing, and deleting courses with their 18 holes.
Course management is the entry point because rounds and the dashboard both
depend on course/hole data existing first.

## Auth (prerequisite)

`courses` and `holes` are RLS-protected (`auth.uid() = user_id`, via a join
for `holes`), so the app needs a real authenticated session before any course
data can be read or written — there is no way to fake `auth.uid()` from the
client.

For this iteration there is no login UI yet. Instead:

- One test user is created directly in Supabase Auth (email/password).
- The credentials are stored in `.env` (gitignored) as
  `EXPO_PUBLIC_DEV_USER_EMAIL` / `EXPO_PUBLIC_DEV_USER_PASSWORD`.
- On app launch, before the tab navigator renders, the root layout
  (`app/_layout.tsx`) calls `supabase.auth.signInWithPassword()` with those
  credentials and shows a loading state until the session is established.
- This is a real Supabase Auth session — RLS behaves exactly as it will once
  real login exists. Only the "how the session gets created" step is
  temporary; it will be replaced by a login screen in a later iteration.

## Data layer — `lib/hooks/useCourses.ts`

Plain hooks (`useState`/`useEffect` + `supabase-js` calls), no query library,
consistent with the app's current size and the rest of the codebase.

- **`useCourses()`** — fetches the signed-in user's courses
  (`id, name, total_par, total_length_meters, created_at`), ordered by
  `created_at desc`. Returns `{ courses, loading, error, refetch }`.

- **`useCourse(id)`** — fetches one course row plus its `holes` (ordered by
  `hole_number`). Returns `{ course, holes, loading, error, refetch }`. When
  `id` is `"new"`, returns an empty course and 18 blank hole placeholders
  (`hole_number: 1..18`, `par: null`, `length_meters: null`) without hitting
  the network.

- **`saveCourse({ id?, name, holes })`**:
  1. Client-side validates: name non-empty, all 18 holes have `par` in
     `{3,4,5}` and a positive `length_meters`.
  2. Computes `total_par` and `total_length_meters` as the sum across the 18
     holes.
  3. Upserts the `courses` row (insert if `id` is undefined/`"new"`, update
     otherwise), scoped to `user_id: auth.uid()`.
  4. Upserts all 18 `holes` rows with `onConflict: 'course_id,hole_number'`.
  5. Returns the saved course's `id` (needed for navigation back after
     creating a new course).

- **`deleteCourse(id)`** — deletes the course row. `holes` cascade
  automatically (FK `on delete cascade`). If the delete is rejected by
  Postgres because a `round` still references this course (FK
  `on delete restrict`), the error is caught and surfaced as a friendly
  message ("This course has rounds logged against it and can't be deleted.")
  rather than a raw Postgres error. This path isn't reachable yet since no
  rounds exist, but the hook handles it defensively.

## Screens

### `app/(tabs)/courses.tsx` — course list

- Uses `useCourses()`.
- Renders a `FlatList` of courses; each row shows name, total par, and total
  length in meters.
- Header has a "+" button that navigates to `course/new`.
- Tapping a row navigates to `course/[id]` (that course's real id) for
  editing.
- Empty state: a centered message + "Add your first course" button when the
  list is empty.
- Loading state: a centered spinner while `loading` is true.

### `app/course/[id].tsx` — add/edit course

Single form handles both create and edit. `id === "new"` is the create case.

- Course name text input at top.
- Scrollable list (18 rows) of `HoleRow` components
  (`components/course/HoleRow.tsx`), one per hole 1–18. Each row shows:
  - Hole number (read-only label)
  - Par: segmented control with options 3/4/5
  - Length: numeric input (meters)
- A summary line above the Save button shows live-computed total par and
  total length as holes are filled in (recomputed on every change, not
  persisted until Save).
- Save button: disabled until validation passes (name non-empty, all 18
  holes have par + length set). On press, calls `saveCourse(...)`; on
  success, navigates back to the course list (`router.back()`).
- Delete button: only rendered when editing an existing course (`id !==
  "new"`). Shows a native confirm dialog before calling `deleteCourse(id)`
  and navigating back on success.
- Validation errors are shown inline per-field, not as an alert.

## New folder

`components/course/` is added (not in the original folder structure, which
only listed `components/ui/` and `components/round/`) to hold `HoleRow.tsx`,
following the same per-feature component grouping pattern as
`components/round/`.

## Out of scope for this iteration

- Real login/signup UI (tracked as a future iteration; auto-sign-in is a
  deliberate placeholder)
- Multi-tee support, hole yardage/par edits after rounds have been logged
  against a course (no special handling needed yet — no rounds exist)
- Course detail/hole-averages screen (depends on rounds existing; not part
  of this iteration)

# CSV Course Import — Design

## Context

Courses are currently created by hand, one hole row at a time, in
`app/course/[id].tsx`. Users who already have a course's card in a
spreadsheet (name, Course Rating, Slope, and a Hole/Length/Par/Index table)
want to import it instead of retyping every hole. This is web-only for now
(app runs via `react-native-web` / Netlify), so the import can use a plain
HTML file input — no new native dependency.

## CSV format

```
Name,<course name>,,
CR,<course rating>,,
Slope,<slope rating>,,
Hole,Length,Par,Index
1,297,4,12
2,285,4,14
...
```

- First 3 rows are `Name,<value>`, `CR,<value>`, `Slope,<value>` (trailing
  commas/blank columns are ignored).
- 4th row is the literal header `Hole,Length,Par,Index`.
- Remaining rows are hole data: `hole_number,length_meters,par,stroke_index`.
- Row count after the header must be 9 or 18 (matches `HoleCount`); anything
  else is a validation error.
- `par` must be 3, 4, or 5; `stroke_index` values must be unique across
  1..hole_count — same rules `saveCourse()` already enforces, checked early
  so the error message is specific to the file rather than a generic form
  error after navigating.

## Parser — `lib/csv/parseCourseCsv.ts`

`parseCourseCsv(text: string): SaveCourseInput` (no `id` field — always a new
course). Throws a plain `Error` with a human-readable message on any
malformed input (wrong header, non-numeric field, bad hole count, out-of-
range par, duplicate stroke index, missing Name/CR/Slope row). Pure function,
no I/O — easy to unit test directly with sample CSV strings including the
attached `Korpa1.csv` content.

## Entry point — `app/(tabs)/courses.tsx`

- Add an "Import CSV" button next to the existing "+" button in the header.
- It's paired with a hidden `<input type="file" accept=".csv">` (rendered
  only on web via `Platform.OS === 'web'`, consistent with this being a
  web-only feature for now).
- On file selection, read it with `FileReader.readAsText`, run
  `parseCourseCsv`, and:
  - On success: `router.push({ pathname: '/course/new', params: { importJson: JSON.stringify(parsed) } })`.
  - On failure: show the error message inline (reusing the same red-text
    style already used for load/save errors elsewhere), without navigating.

## Pre-filling the form — `app/course/[id].tsx`

- Read `importJson` from `useLocalSearchParams`.
- On mount, if present and `id === 'new'`, parse it once and seed
  `name`/`holeCount`/`courseRating`/`slopeRating`/`holes` state with it
  instead of the blank defaults from `useCourse('new')`. This runs once
  (guarded so it doesn't re-fire on every render) and only affects the local
  form state — nothing is written to the DB until the user presses the
  existing **Save** button, which goes through the current
  `saveCourse()`/`validateSaveCourseInput()` path unchanged.
- The user sees the normal course form, fully populated, and can edit any
  field before saving — same review step as manual entry.

## Error handling

- Bad file: error shown on the courses list screen, no navigation, no DB
  writes.
- Valid CSV but values that fail `saveCourse()`'s own validation (e.g. user
  edits a field in the review step into an invalid state): handled by the
  existing save-error UI in `[id].tsx`, unchanged.

## Testing

- Unit tests for `parseCourseCsv` (happy path with the sample file's shape,
  missing header, wrong hole count, bad par, duplicate index, non-numeric
  value).
- Manual browser check: import the sample CSV, confirm the form pre-fills
  correctly, edit a value, save, and confirm the course appears in the list
  with correct totals.

## Out of scope

- Native (iOS/Android) file picking — web only, per current deployment target.
- Importing multiple courses from one file, or updating an existing course
  via CSV (always creates a new course).
- CSV quoting/escaping beyond simple comma-separated values (matches the
  sample file's format).

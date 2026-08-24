# Hole Line Editor — Design

2026-08-24

## Goal

Draw a line for every hole on the aerial course view — tee, green, and any
number of bend points for doglegs — store it, and render numbered lines on
the map the way a printed course guide does.

Two deliverables: the **editor** that captures the geometry, and the
**renderer** that draws it in the read-only aerial view.

## Approach

Everything reuses the Leaflet-in-WebView document from the course map:

- **Rendering**: `buildCourseAerialHtml` gains an optional `holes` array and
  draws one polyline per hole with endpoint dots and a numbered badge at the
  line's midpoint.
- **Editing**: a second document, `buildHoleEditorHtml`, is the same map with
  draggable markers for the hole being edited and faded lines for the rest.
  The taps happen in the map document; the state of record lives in React
  Native. The document posts every edit out as a message, exactly as the
  course map already posts `course-play` / `course-edit`.
- All point maths lives in a pure, unit-tested module. The WebView/iframe
  wrappers stay thin and untested, as with `CourseMap` / `CourseAerial`.

No new dependency. Tiles and Leaflet still come off the network, so the
editor is online-only — the same trade the aerial view already makes.

## Data model

```sql
create table public.hole_geometry (
  hole_id    uuid primary key references public.holes(id) on delete cascade,
  points     jsonb not null,   -- [[lat,lng], ...] tee first, green last
  updated_at timestamptz not null default now()
);
```

- `points` is one ordered array: first entry is the tee, last is the green,
  everything between is a bend. Minimum two entries.
- jsonb rather than four columns because the bend count is open-ended, and an
  ordered array is exactly what Leaflet's polyline consumes and what the
  renderer reads back.
- RLS mirrors `holes` — ownership resolved through `holes.course_id →
  courses.user_id`.
- Validation lives in the app, not the DB (same choice as the course
  latitude/longitude columns): 2–12 points; each within lat -90..90 /
  lng -180..180; and a **warning**, not an error, when a point sits more than
  2 km from the course's stored coordinate, which is what a mis-tap looks
  like.

### The 27-hole facility problem

The database holds 261 hole rows for 189 physical holes: Korpa's six course
rows (Áin, Landið, Sjórinn and three combinations), plus the GKG and Oddur
pairs, re-list the same fairways. Geometry keyed per `holes` row would
therefore be traced up to three times for one physical hole.

Rather than introduce a "nine" entity — a schema refactor touching handicap
maths and the offline cache — the editor gets a **Copy lines from…** action.
It offers courses of the same club whose holes match on hole number, par,
stroke index and tee lengths, and copies their paths in. Two taps instead of
nine re-traces, and no fragile automatic inference about which fairway is
which.

## Components

### `lib/holeGeometry.ts` (pure, unit-tested)

```ts
type HolePoint = [number, number];
type HolePath = HolePoint[];

applyEdit(path: HolePath, edit: HoleEdit): HolePath
validatePath(path: HolePath): { ok: true } | { ok: false; reason: string }
labelPosition(path: HolePath): HolePoint
isComplete(path: HolePath): boolean
```

`HoleEdit` is one of `set-tee`, `set-green`, `add-bend`, `move-point`,
`remove-point`.

Two behaviours worth stating because they are the ones that get this wrong:

- `add-bend` inserts the point into the **nearest segment**, not at the end
  of the array. A bend added between the tee and an existing bend has to land
  in the middle, or the line zig-zags back on itself.
- `labelPosition` is the midpoint by **cumulative distance along the path**,
  not the mean of the points — on a dogleg the average of three points can
  fall off the fairway, which is exactly where the number would sit.

### `lib/courseMapHtml.ts`

- `CourseAerial` gains `holes?: { hole_number: number; path: HolePath }[]`.
  Each hole draws a white polyline, small filled circles at tee and green,
  and a numbered circular `L.divIcon` badge at `labelPosition`. Holes with no
  geometry simply don't draw.
- `buildHoleEditorHtml({ course, holes, activeHoleNumber })` — the same
  document plus:
  - draggable markers for the active hole; other holes drawn faded and inert
  - map click → `{ type: 'point-added', lat, lng }`
  - marker dragend → `{ type: 'point-moved', index, lat, lng }`
  - marker click while in adjust mode → `{ type: 'point-removed', index }`
  - the same JSON-payload escaping, so a course name can't break out into
    markup

### `components/course/HoleLineEditor.tsx` / `.web.tsx`

Thin WebView / iframe wrappers with an `onEdit(message)` prop, mirroring
`CourseMap`'s pair.

### `app/course/holes.tsx` (screen)

Reached from a **Edit hole lines** button on the course editor, next to
*View aerial map*.

- A hole strip along the top, 1…18, each showing whether that hole has a
  line yet; tap to switch holes. Edits to other holes survive switching —
  the screen holds the whole course's working copy.
- Two modes only:
  - **Place** (default): first tap sets the tee, second sets the green,
    subsequent taps add bends into the nearest segment.
  - **Adjust**: drag a point to move it, tap a point to delete it.
- Per-hole **Undo** and **Clear**; a header count ("12 of 18 holes mapped").
- **Copy lines from…** as described above.
- **Save** upserts every changed hole in one call; leaving with unsaved
  changes prompts, using the existing `ConfirmDialog`.

### Offline

`CachedHole` gains `path?: HolePath` so a round in progress can draw its
lines from the cache. Tiles still need network — the map is online-only
either way, and that stays documented rather than solved here.

## Testing

- `holeGeometry`: every edit kind; bend inserted into the nearest segment
  rather than appended; `validatePath` rejects fewer than two points and
  out-of-range coordinates with a named reason; `labelPosition` sits at the
  cumulative midpoint of a dogleg, not the centroid; `remove-point` keeps
  tee-first/green-last meaning.
- HTML builders: numbered badge per hole; active hole draggable while others
  are inert; every message type present; unsafe course name escaped; a course
  with no geometry still renders a valid document.
- Screen (map component mocked): switching holes preserves edits; save
  upserts only changed holes; unsaved-changes prompt on leave; copy-from
  populates paths; progress count reflects completed holes.
- Wrappers stay untested, per the existing convention for `CourseMap`.

## Out of scope (YAGNI)

- Distances to the green — needs green front/centre/back, not one point.
- Green outlines, bunkers, hazards, cart paths.
- Live GPS position or shot tracking.
- Importing geometry from OpenStreetMap (see the course import spec — 222
  Icelandic hole ways exist, covering about 57% of these courses, but each
  needs direction and duplicate checking before it's trustworthy).
- Sharing geometry between users.

## Effort

Roughly two days: half a day for the renderer, half for the geometry module
and its tests, a day for the editor screen and its wiring. Tracing all 189
physical holes off satellite imagery is about two hours of tapping once the
editor exists, with the copy action covering the permutation courses.

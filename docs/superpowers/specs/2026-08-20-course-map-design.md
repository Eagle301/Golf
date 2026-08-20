# Course Map — Design

2026-08-20

## Goal

A map view on the Courses tab showing a pin for every course that has
coordinates. Tapping a pin opens that course's detail/editor screen. The map
must work on both native (phone) and web with one shared implementation.

## Approach

Leaflet + OpenStreetMap tiles rendered from a self-contained HTML document:

- **Native**: the HTML renders inside `react-native-webview` (Expo SDK
  package, installed with `npx expo install react-native-webview`).
- **Web**: the same HTML renders in an `<iframe srcDoc=...>` via a
  platform-specific `CourseMap.web.tsx`.
- No API keys, no billing. Leaflet's JS/CSS load from the unpkg CDN inside
  the map document; the map requires network anyway for OSM tiles, so the
  CDN dependency adds no new failure mode. If tiles fail to load the map
  shows Leaflet's empty grid — acceptable for an online-only view.

## Data model

`courses` gains two nullable columns:

```sql
alter table public.courses
  add column latitude double precision,
  add column longitude double precision;
```

- Valid range checks are left to the app (editor validation), not the DB.
- The 13 existing courses are backfilled with verified coordinates
  (research agent, club websites / OSM / Google as sources; validated to be
  inside Iceland's bounding box: lat 63–67, lng -25 to -13).
- Courses without coordinates simply do not appear on the map; the map
  screen shows a small footnote "N courses have no location yet".

## Components

### `lib/courseMapHtml.ts` (pure, unit-tested)

`buildCourseMapHtml(markers: CourseMarker[]): string`

- `CourseMarker = { id, name, club, latitude, longitude }`.
- Returns the full HTML document: Leaflet map centered to fit all markers
  (`L.latLngBounds`), one marker per course with a popup showing
  `name` (+ `club` when set) and an **Open** link.
- Clicking Open posts `{ type: 'course-selected', courseId }` via
  `window.ReactNativeWebView.postMessage(...)` when present, else
  `window.parent.postMessage(...)` (web/iframe).
- All course-derived strings are JSON-encoded into a `<script>` payload —
  no string interpolation into markup, so names with quotes/HTML are safe.

### `components/course/CourseMap.tsx` / `CourseMap.web.tsx`

- Thin renderers around the HTML: WebView (`onMessage`) on native, iframe
  (`window.addEventListener('message')`) on web.
- Prop: `courses` (filtered to those with coordinates by the caller) and
  `onSelectCourse(id)`.

### Courses tab (`app/(tabs)/courses.tsx`)

- A List / Map segmented toggle beside the header (testIDs
  `courses-view-list`, `courses-view-map`), defaulting to List.
- Map mode renders `CourseMap` with the geocoded courses and the footnote
  for non-geocoded ones. `onSelectCourse` routes to `/course/{id}` — same
  navigation as tapping a list row.

### Course editor (`app/course/[id].tsx`)

- Two optional inputs, Latitude / Longitude (decimal-pad), below the club
  field. Validation only when non-empty: latitude -90..90, longitude
  -180..180; a lone latitude or longitude (one filled, one empty) is a
  validation error.
- `useCourses`: `CourseListItem` and `useCourse` include
  `latitude`/`longitude`; `saveCourse` persists them (null when blank).

## Out of scope (YAGNI)

- Map in the start-a-round popup.
- Offline tile caching.
- Geolocating the user / "courses near me".
- CSV import of coordinates.

## Testing

- `courseMapHtml`: markers JSON embedded, popup content, quote/HTML-unsafe
  names safely encoded, bounds include all markers, empty-marker document
  still valid.
- Editor: saving with coordinates includes them; invalid latitude rejected;
  one-sided coordinate rejected.
- Courses tab: toggle switches list → map; map receives only geocoded
  courses; footnote counts the rest. (`CourseMap` itself is mocked in the
  screen test; the WebView/iframe wrappers are thin and rely on the tested
  HTML builder.)
- Backfill verified by SQL: 13/13 courses with coordinates inside Iceland's
  bounding box.

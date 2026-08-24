import { isComplete, labelPosition, type HolePath, type HolePoint } from './holeGeometry';
import { holeEditorState } from './holeEditorDoc';
export { holeEditorState, type HoleEditorState } from './holeEditorDoc';

export interface CourseMarker {
  id: string;
  name: string;
  club: string | null;
  latitude: number;
  longitude: number;
}

export interface CourseMapHandlers {
  onPlayCourse: (courseId: string) => void;
  onEditCourse: (courseId: string) => void;
}

/** Decode a postMessage payload from the map document and dispatch it. */
export function handleCourseMapMessage(data: string, handlers: CourseMapHandlers): void {
  try {
    const message = JSON.parse(data);
    if (typeof message.courseId !== 'string') return;
    if (message.type === 'course-play') handlers.onPlayCourse(message.courseId);
    if (message.type === 'course-edit') handlers.onEditCourse(message.courseId);
  } catch {
    // Not one of our messages - ignore.
  }
}

interface LocationGroup {
  latitude: number;
  longitude: number;
  courses: { id: string; name: string; club: string | null }[];
}

/** Courses at the same spot (e.g. two nines of one facility) share a pin and popup. */
function groupByLocation(markers: CourseMarker[]): LocationGroup[] {
  const groups = new Map<string, LocationGroup>();
  for (const m of markers) {
    const key = `${m.latitude},${m.longitude}`;
    const group = groups.get(key) ?? { latitude: m.latitude, longitude: m.longitude, courses: [] };
    group.courses.push({ id: m.id, name: m.name, club: m.club });
    groups.set(key, group);
  }
  return [...groups.values()];
}

/**
 * A self-contained Leaflet + OpenStreetMap document rendered inside a
 * WebView (native) or iframe (web). Course data goes in as a JSON payload —
 * never interpolated into markup — and popup text nodes are built with
 * textContent, so unsafe names cannot break out into HTML. Every "<" in the
 * JSON payload is escaped to its unicode form so a course name can never
 * open or close a tag.
 */
export function buildCourseMapHtml(markers: CourseMarker[]): string {
  const payload = JSON.stringify(groupByLocation(markers)).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
html, body, #map { margin: 0; height: 100%; }
.course-entry { margin-bottom: 8px; }
.course-entry:last-child { margin-bottom: 0; }
.course-title { font-weight: 600; margin-bottom: 4px; }
.play-button {
  display: inline-block; background: #1a7f37; color: #fff; border: none;
  border-radius: 8px; padding: 8px 22px; font-size: 14px; font-weight: 600;
  cursor: pointer;
}
.edit-link {
  background: none; border: none; color: #555; font-size: 12px;
  text-decoration: underline; cursor: pointer; margin-left: 10px; padding: 4px;
}
</style>
</head>
<body>
<div id="map"></div>
<script>
const GROUPS = ${payload};

const map = L.map('map');
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

function fitView() {
  if (GROUPS.length > 0) {
    const bounds = L.latLngBounds(GROUPS.map((g) => [g.latitude, g.longitude]));
    map.fitBounds(bounds.pad(0.2), { maxZoom: 14 });
  } else {
    map.setView([64.9631, -19.0208], 6); // Iceland
  }
}
fitView();
// At parse time the container can still measure 0px tall, which makes
// fitBounds snap to world zoom - re-fit once layout has settled. 'load'
// alone is not reliable in embedded WebViews, so retry until the container
// reports a real size.
let fitAttempts = 0;
function refitWhenSized() {
  fitAttempts++;
  map.invalidateSize();
  const size = map.getSize();
  if ((size.y === 0 || size.x === 0) && fitAttempts < 20) {
    setTimeout(refitWhenSized, 100);
    return;
  }
  fitView();
}
window.addEventListener('load', refitWhenSized);
setTimeout(refitWhenSized, 0);
window.__COURSE_MAP__ = map;

function post(message) {
  const json = JSON.stringify(message);
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(json);
  } else if (window.parent !== window) {
    window.parent.postMessage(json, '*');
  }
}

for (const group of GROUPS) {
  const container = document.createElement('div');
  for (const course of group.courses) {
    const entry = document.createElement('div');
    entry.className = 'course-entry';

    const title = document.createElement('div');
    title.className = 'course-title';
    title.textContent = course.club ? course.name + ' · ' + course.club : course.name;
    entry.appendChild(title);

    const play = document.createElement('button');
    play.className = 'play-button';
    play.textContent = 'Play';
    play.addEventListener('click', () => post({ type: 'course-play', courseId: course.id }));
    entry.appendChild(play);

    const edit = document.createElement('button');
    edit.className = 'edit-link';
    edit.textContent = 'Edit';
    edit.addEventListener('click', () => post({ type: 'course-edit', courseId: course.id }));
    entry.appendChild(edit);

    container.appendChild(entry);
  }
  L.marker([group.latitude, group.longitude]).addTo(map).bindPopup(container);
}
</script>
</body>
</html>`;
}

export interface HoleLine {
  hole_number: number;
  path: HolePath;
}

export interface CourseAerial {
  name: string;
  club: string | null;
  latitude: number;
  longitude: number;
  holes?: HoleLine[];
}

/** Zoom that frames a whole 18-hole course on a phone-sized map. */
const AERIAL_ZOOM = 15;

interface DrawnHole extends HoleLine {
  /** Precomputed here rather than in the document, so the placement rule
   * stays in the tested pure module. */
  label: HolePoint;
}

/** Unfinished lines are left out: a lone tee has nothing to draw. */
function drawableHoles(holes: HoleLine[] | undefined): DrawnHole[] {
  return (holes ?? [])
    .filter((hole) => isComplete(hole.path))
    .map((hole) => ({ ...hole, label: labelPosition(hole.path)! }));
}

/** Shared styling for the hole lines and their number badges. */
const HOLE_LINE_CSS = `
.hole-badge {
  display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%;
  background: #fff; color: #111827; border: 1px solid rgba(0,0,0,0.35);
  font: 700 11px -apple-system, Roboto, system-ui, sans-serif;
}
.hole-badge.active { background: #34D399; color: #08130d; }
`;

/**
 * A single-course aerial view: the same self-contained Leaflet document as
 * buildCourseMapHtml, but centred on one course over satellite imagery
 * (Esri World Imagery - free, no API key) with a Satellite/Map toggle. The
 * course goes in as a JSON payload with "<" escaped, so a course name can
 * never open or close a tag. Nothing is posted back out; this view is
 * read-only.
 */
export function buildCourseAerialHtml(course: CourseAerial): string {
  const { holes, ...rest } = course;
  const payload = JSON.stringify(rest).replace(/</g, '\\u003c');
  const holesPayload = JSON.stringify(drawableHoles(holes)).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
html, body, #map { margin: 0; height: 100%; }
#map { background: #0f1210; }
.course-chip {
  position: absolute; top: 12px; left: 12px; z-index: 500;
  background: rgba(18, 22, 20, 0.84); color: #F3F4F6; border: 1px solid #2D3A32;
  border-radius: 10px; padding: 8px 11px; font-weight: 600; font-size: 14px;
  font-family: -apple-system, Roboto, system-ui, sans-serif;
}
.course-chip span { display: block; font-weight: 400; font-size: 11px; color: #9CA3AF; margin-top: 2px; }
.layer-toggle {
  position: absolute; top: 12px; right: 12px; z-index: 500; display: flex;
  background: rgba(18, 22, 20, 0.84); border: 1px solid #2D3A32;
  border-radius: 10px; overflow: hidden;
}
.layer-toggle button {
  background: none; border: none; color: #9CA3AF; padding: 7px 13px; cursor: pointer;
  font: 600 12px -apple-system, Roboto, system-ui, sans-serif;
}
.layer-toggle button[aria-pressed="true"] { background: #34D399; color: #08130d; }
${HOLE_LINE_CSS}
</style>
</head>
<body>
<div id="map"></div>
<div class="course-chip" id="chip"></div>
<div class="layer-toggle">
  <button id="toggle-satellite" aria-pressed="true">Satellite</button>
  <button id="toggle-map" aria-pressed="false">Map</button>
</div>
<script>
const COURSE = ${payload};
const HOLES = ${holesPayload};

// Esri puts y before x in its tile path, unlike OSM's {z}/{x}/{y}.
const satellite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  { maxZoom: 19, attribution: 'Esri, Maxar, Earthstar Geographics' }
);
const streets = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors',
});

const map = L.map('map', { zoomControl: false, layers: [satellite] });
map.setView([COURSE.latitude, COURSE.longitude], ${AERIAL_ZOOM});
L.control.zoom({ position: 'bottomright' }).addTo(map);

// Course name via textContent - never markup - so quotes and angle
// brackets in a course name stay text.
const chip = document.getElementById('chip');
chip.textContent = COURSE.name;
if (COURSE.club) {
  const sub = document.createElement('span');
  sub.textContent = COURSE.club;
  chip.appendChild(sub);
}

// Hole lines: a white line tee to green, a dot at each end, and the hole
// number where the pure module said it should sit.
for (const hole of HOLES) {
  L.polyline(hole.path, { color: '#ffffff', weight: 3, opacity: 0.9 }).addTo(map);
  for (const end of [hole.path[0], hole.path[hole.path.length - 1]]) {
    L.circleMarker(end, {
      radius: 4, color: '#ffffff', weight: 2, fillColor: '#ffffff', fillOpacity: 1,
    }).addTo(map);
  }
  L.marker(hole.label, {
    interactive: false,
    icon: L.divIcon({
      className: '',
      html: '<div class="hole-badge">' + String(Number(hole.hole_number)) + '</div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    }),
  }).addTo(map);
}

const satelliteButton = document.getElementById('toggle-satellite');
const mapButton = document.getElementById('toggle-map');
function selectLayer(layer, pressed, unpressed) {
  map.eachLayer((existing) => {
    if (existing instanceof L.TileLayer) map.removeLayer(existing);
  });
  layer.addTo(map);
  pressed.setAttribute('aria-pressed', 'true');
  unpressed.setAttribute('aria-pressed', 'false');
}
satelliteButton.addEventListener('click', () => selectLayer(satellite, satelliteButton, mapButton));
mapButton.addEventListener('click', () => selectLayer(streets, mapButton, satelliteButton));

// Same 0px-tall container problem as the course map: in an embedded WebView
// the map can be laid out after the script runs, which leaves Leaflet with a
// zero-size viewport and no tiles. Re-measure until the container is real.
let sizeAttempts = 0;
function recentreWhenSized() {
  sizeAttempts++;
  map.invalidateSize();
  const size = map.getSize();
  if ((size.y === 0 || size.x === 0) && sizeAttempts < 20) {
    setTimeout(recentreWhenSized, 100);
    return;
  }
  map.setView([COURSE.latitude, COURSE.longitude], ${AERIAL_ZOOM});
}
window.addEventListener('load', recentreWhenSized);
setTimeout(recentreWhenSized, 0);
window.__COURSE_AERIAL__ = map;
</script>
</body>
</html>`;
}

export interface HoleEditorOptions {
  course: CourseAerial;
  holes: HoleLine[];
  activeHoleNumber: number;
}

export interface HoleEditorMessage {
  type: 'point-added' | 'point-moved' | 'point-removed';
  latitude?: number;
  longitude?: number;
  index?: number;
}

/** Decode an edit posted by the hole editor document. */
export function parseHoleEditorMessage(data: string): HoleEditorMessage | null {
  try {
    const message = JSON.parse(data);
    if (
      message.type !== 'point-added' &&
      message.type !== 'point-moved' &&
      message.type !== 'point-removed'
    ) {
      return null;
    }
    return message;
  } catch {
    return null;
  }
}

/**
 * The aerial view in editing clothes: the active hole's points become
 * draggable markers, every other hole is drawn faded and inert for context,
 * and every change is posted back out. The document holds no state of
 * record - the screen owns the paths and re-renders this document when they
 * change.
 */
export function buildHoleEditorHtml({ course, holes, activeHoleNumber }: HoleEditorOptions): string {
  const { holes: _ignored, ...rest } = course;
  const payload = JSON.stringify(rest).replace(/</g, '\\u003c');
  const statePayload = JSON.stringify(holeEditorState(holes, activeHoleNumber)).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
html, body, #map { margin: 0; height: 100%; }
#map { background: #0f1210; }
${HOLE_LINE_CSS}
.point-label {
  display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%;
  background: #34D399; color: #08130d; border: 2px solid #08130d;
  font: 700 10px -apple-system, Roboto, system-ui, sans-serif;
}
</style>
</head>
<body>
<div id="map"></div>
<script>
const COURSE = ${payload};
let STATE = ${statePayload};

const satellite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  { maxZoom: 19, attribution: 'Esri, Maxar, Earthstar Geographics' }
);
const map = L.map('map', { zoomControl: false, layers: [satellite] });
L.control.zoom({ position: 'bottomright' }).addTo(map);

function post(message) {
  const json = JSON.stringify(message);
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(json);
  } else if (window.parent !== window) {
    window.parent.postMessage(json, '*');
  }
}

function activeHole() {
  return STATE.holes.find((hole) => hole.hole_number === STATE.active);
}

function activePath() {
  const hole = activeHole();
  return (hole && hole.path) || [];
}

// Only the lines and markers are torn down between renders - never the tile
// layer, which is what makes an edit feel instant instead of like a reload.
let overlays = [];
function clearOverlays() {
  for (const layer of overlays) map.removeLayer(layer);
  overlays = [];
}
function add(layer) {
  layer.addTo(map);
  overlays.push(layer);
  return layer;
}

function render() {
  clearOverlays();

  for (const hole of STATE.holes) {
    if (hole.hole_number === STATE.active || hole.path.length < 2) continue;
    add(L.polyline(hole.path, { color: '#ffffff', weight: 2, opacity: 0.35, interactive: false }));
    if (hole.label) {
      add(
        L.marker(hole.label, {
          interactive: false,
          icon: L.divIcon({
            className: '',
            html: '<div class="hole-badge" style="opacity:0.6">' + String(Number(hole.hole_number)) + '</div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
        })
      );
    }
  }

  const path = activePath();
  if (path.length >= 2) {
    add(L.polyline(path, { color: '#34D399', weight: 4, interactive: false }));
  }

  path.forEach((point, index) => {
    const last = index === path.length - 1;
    const label = index === 0 ? 'T' : last && path.length >= 2 ? 'G' : String(index);
    const marker = add(
      L.marker(point, {
        draggable: true,
        icon: L.divIcon({
          className: '',
          html: '<div class="point-label">' + label + '</div>',
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        }),
      })
    );
    marker.on('dragend', () => {
      const position = marker.getLatLng();
      post({ type: 'point-moved', index, latitude: position.lat, longitude: position.lng });
    });
    marker.on('click', () => post({ type: 'point-removed', index }));
  });
}

// Framing follows the hole being edited, and nothing else: re-framing on
// every placed point would yank the map out from under the next tap.
// animate:false throughout - an animated pan started in the same tick as the
// layer rebuild gets clobbered and the map snaps back to where it was, which
// looks like the hole switch simply not working.
function frameActiveHole() {
  const path = activePath();
  if (path.length >= 2) {
    map.fitBounds(L.latLngBounds(path).pad(0.35), { maxZoom: 18, animate: false });
  } else if (path.length === 1) {
    map.setView(path[0], 17, { animate: false });
  } else {
    map.setView([COURSE.latitude, COURSE.longitude], ${AERIAL_ZOOM}, { animate: false });
  }
}

window.__applyState = function (next) {
  const parsed = typeof next === 'string' ? JSON.parse(next) : next;
  const activeChanged = parsed.active !== STATE.active;
  STATE = parsed;
  render();
  if (activeChanged) frameActiveHole();
};

// The web build hosts this document in an iframe, where state arrives as a
// posted message rather than injected script.
window.addEventListener('message', (event) => {
  try {
    const message = JSON.parse(event.data);
    if (message && message.type === 'state') window.__applyState(message.state);
  } catch (err) {
    // Not one of ours - ignore.
  }
});

map.on('click', (event) => {
  post({ type: 'point-added', latitude: event.latlng.lat, longitude: event.latlng.lng });
});

frameActiveHole();
render();

// Same deferred-layout guard as the other documents: an embedded WebView can
// hand Leaflet a zero-size container at parse time.
let sizeAttempts = 0;
function resizeWhenSized() {
  sizeAttempts++;
  map.invalidateSize();
  const size = map.getSize();
  if ((size.y === 0 || size.x === 0) && sizeAttempts < 20) {
    setTimeout(resizeWhenSized, 100);
    return;
  }
  frameActiveHole();
}
window.addEventListener('load', resizeWhenSized);
setTimeout(resizeWhenSized, 0);
window.__HOLE_EDITOR__ = map;
post({ type: 'ready' });
</script>
</body>
</html>`;
}

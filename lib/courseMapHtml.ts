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

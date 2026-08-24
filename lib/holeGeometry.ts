/**
 * Hole line geometry: an ordered list of points describing one hole, tee
 * first and green last, with any bends in between. Kept pure and free of
 * Leaflet so both the map document and the editor screen can share it.
 */

export type HolePoint = [latitude: number, longitude: number];
export type HolePath = HolePoint[];

export type HoleEdit =
  | { kind: 'set-tee'; point: HolePoint }
  | { kind: 'set-green'; point: HolePoint }
  | { kind: 'add-bend'; point: HolePoint }
  | { kind: 'move-point'; index: number; point: HolePoint }
  | { kind: 'remove-point'; index: number };

export type PathValidation = { ok: true } | { ok: false; reason: string };

/** A hole with more points than this is a mis-tap, not a dogleg. */
const MAX_POINTS = 12;

/**
 * Metres per degree of latitude. Longitude degrees shrink towards the poles,
 * which matters at Iceland's latitude: a degree of longitude there is less
 * than half a degree of latitude. Distances here are only ever compared with
 * each other over a few hundred metres, so the flat-earth approximation is
 * accurate enough and keeps the maths readable.
 */
const METERS_PER_DEGREE = 111_320;

function toMeters([lat, lng]: HolePoint, referenceLat: number): [number, number] {
  return [lng * METERS_PER_DEGREE * Math.cos((referenceLat * Math.PI) / 180), lat * METERS_PER_DEGREE];
}

function distance(a: HolePoint, b: HolePoint): number {
  const [ax, ay] = toMeters(a, a[0]);
  const [bx, by] = toMeters(b, a[0]);
  return Math.hypot(bx - ax, by - ay);
}

/** Perpendicular distance from `point` to the segment a->b, in metres. */
function distanceToSegment(point: HolePoint, a: HolePoint, b: HolePoint): number {
  const [px, py] = toMeters(point, a[0]);
  const [ax, ay] = toMeters(a, a[0]);
  const [bx, by] = toMeters(b, a[0]);

  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(px - ax, py - ay);

  // How far along the segment the closest point lies, clamped to its ends so
  // a point beyond the green measures to the green, not to open space.
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * The index a new bend should take. Appending is wrong: a bend dropped
 * beside the first leg of a dogleg has to land before the corner, or the
 * line doubles back on itself.
 */
function nearestSegmentIndex(path: HolePath, point: HolePoint): number {
  let best = 1;
  let bestDistance = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const d = distanceToSegment(point, path[i], path[i + 1]);
    if (d < bestDistance) {
      bestDistance = d;
      best = i + 1;
    }
  }
  return best;
}

/**
 * What a tap on the map means in placement mode: the first is the tee, the
 * second the green, and everything after that is a bend.
 */
export function placePoint(path: HolePath, point: HolePoint): HolePath {
  if (path.length === 0) return [point];
  if (path.length === 1) return [...path, point];
  return applyEdit(path, { kind: 'add-bend', point });
}

export function applyEdit(path: HolePath, edit: HoleEdit): HolePath {
  switch (edit.kind) {
    case 'set-tee':
      return path.length === 0 ? [edit.point] : [edit.point, ...path.slice(1)];

    case 'set-green':
      return path.length < 2 ? [...path, edit.point] : [...path.slice(0, -1), edit.point];

    case 'add-bend': {
      if (path.length < 2) return [...path, edit.point];
      const at = nearestSegmentIndex(path, edit.point);
      return [...path.slice(0, at), edit.point, ...path.slice(at)];
    }

    case 'move-point':
      if (edit.index < 0 || edit.index >= path.length) return path;
      return path.map((existing, i) => (i === edit.index ? edit.point : existing));

    case 'remove-point':
      if (edit.index < 0 || edit.index >= path.length) return path;
      return path.filter((_, i) => i !== edit.index);
  }
}

export function validatePath(path: HolePath): PathValidation {
  if (path.length < 2) return { ok: false, reason: 'A hole needs a tee and a green.' };
  if (path.length > MAX_POINTS) return { ok: false, reason: `A hole can have at most ${MAX_POINTS} points.` };
  for (const [lat, lng] of path) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return { ok: false, reason: 'A point is outside the valid coordinate range.' };
    }
  }
  return { ok: true };
}

export function isComplete(path: HolePath): boolean {
  return path.length >= 2;
}

/**
 * Reads a path out of an embedded `hole_geometry` row. PostgREST returns a
 * one-to-one embed as an object in some versions and a single-element array
 * in others, and an undrawn hole has no row at all.
 */
export function parseEmbeddedPath(embedded: unknown): HolePath {
  const row = Array.isArray(embedded) ? embedded[0] : embedded;
  const points = (row as { points?: unknown } | null | undefined)?.points;
  return Array.isArray(points) ? (points as HolePath) : [];
}

/**
 * Where the hole number sits: halfway along the line by distance travelled,
 * not the average of the points. On a dogleg the average lands off the
 * fairway, which is exactly where a number shouldn't be.
 */
export function labelPosition(path: HolePath): HolePoint | null {
  if (path.length === 0) return null;
  if (path.length === 1) return path[0];

  const segments = path.slice(1).map((point, i) => distance(path[i], point));
  const half = segments.reduce((sum, length) => sum + length, 0) / 2;

  let travelled = 0;
  for (let i = 0; i < segments.length; i++) {
    if (travelled + segments[i] >= half) {
      const along = segments[i] === 0 ? 0 : (half - travelled) / segments[i];
      const [fromLat, fromLng] = path[i];
      const [toLat, toLng] = path[i + 1];
      return [fromLat + (toLat - fromLat) * along, fromLng + (toLng - fromLng) * along];
    }
    travelled += segments[i];
  }
  return path[path.length - 1];
}

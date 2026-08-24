import {
  applyEdit,
  placePoint,
  validatePath,
  labelPosition,
  isComplete,
  type HolePath,
} from '../holeGeometry';

const TEE: [number, number] = [64.1, -21.76];
const GREEN: [number, number] = [64.105, -21.75];

describe('placePoint', () => {
  it('makes the first tap the tee', () => {
    expect(placePoint([], TEE)).toEqual([TEE]);
  });

  it('makes the second tap the green', () => {
    expect(placePoint([TEE], GREEN)).toEqual([TEE, GREEN]);
  });

  it('makes later taps bends between the tee and the green', () => {
    const bend: [number, number] = [64.1, -21.755];
    expect(placePoint([TEE, GREEN], bend)).toEqual([TEE, bend, GREEN]);
  });
});

describe('applyEdit', () => {
  it('replaces the tee without disturbing the rest of the line', () => {
    const moved: [number, number] = [64.101, -21.761];
    expect(applyEdit([TEE, GREEN], { kind: 'set-tee', point: moved })).toEqual([moved, GREEN]);
  });

  it('replaces the green without disturbing the rest of the line', () => {
    const moved: [number, number] = [64.106, -21.751];
    expect(applyEdit([TEE, GREEN], { kind: 'set-green', point: moved })).toEqual([TEE, moved]);
  });

  it('appends the green when only a tee exists', () => {
    expect(applyEdit([TEE], { kind: 'set-green', point: GREEN })).toEqual([TEE, GREEN]);
  });

  it('inserts a bend between the tee and the green', () => {
    const bend: [number, number] = [64.102, -21.755];
    expect(applyEdit([TEE, GREEN], { kind: 'add-bend', point: bend })).toEqual([TEE, bend, GREEN]);
  });

  it('inserts a bend into the nearest segment rather than at the end of the line', () => {
    // An L: tee due west of the corner, green due north of it.
    const corner: [number, number] = [64.1, -21.75];
    const path: HolePath = [TEE, corner, GREEN];
    // This point sits beside the second leg (corner -> green), so it has to
    // land after the corner. Appending it would zig-zag the line back.
    const besideSecondLeg: [number, number] = [64.103, -21.7505];

    expect(applyEdit(path, { kind: 'add-bend', point: besideSecondLeg })).toEqual([
      TEE,
      corner,
      besideSecondLeg,
      GREEN,
    ]);
  });

  it('inserts a bend beside the first leg before the corner', () => {
    const corner: [number, number] = [64.1, -21.75];
    const besideFirstLeg: [number, number] = [64.1005, -21.7555];

    expect(applyEdit([TEE, corner, GREEN], { kind: 'add-bend', point: besideFirstLeg })).toEqual([
      TEE,
      besideFirstLeg,
      corner,
      GREEN,
    ]);
  });

  it('moves the point at an index', () => {
    const bend: [number, number] = [64.102, -21.755];
    const dragged: [number, number] = [64.103, -21.754];
    expect(applyEdit([TEE, bend, GREEN], { kind: 'move-point', index: 1, point: dragged })).toEqual([
      TEE,
      dragged,
      GREEN,
    ]);
  });

  it('removes the point at an index', () => {
    const bend: [number, number] = [64.102, -21.755];
    expect(applyEdit([TEE, bend, GREEN], { kind: 'remove-point', index: 1 })).toEqual([TEE, GREEN]);
  });

  it('leaves the path alone for an index that is not on it', () => {
    expect(applyEdit([TEE, GREEN], { kind: 'remove-point', index: 7 })).toEqual([TEE, GREEN]);
  });

  it('keeps removal meaningful: dropping the tee promotes the next point to tee', () => {
    const bend: [number, number] = [64.102, -21.755];
    expect(applyEdit([TEE, bend, GREEN], { kind: 'remove-point', index: 0 })).toEqual([bend, GREEN]);
  });
});

describe('validatePath', () => {
  it('accepts a tee and a green', () => {
    expect(validatePath([TEE, GREEN])).toEqual({ ok: true });
  });

  it('rejects a line with only a tee', () => {
    expect(validatePath([TEE])).toEqual({ ok: false, reason: 'A hole needs a tee and a green.' });
  });

  it('rejects an empty line', () => {
    expect(validatePath([])).toEqual({ ok: false, reason: 'A hole needs a tee and a green.' });
  });

  it('rejects coordinates outside the world', () => {
    expect(validatePath([TEE, [95, -21.75]])).toEqual({
      ok: false,
      reason: 'A point is outside the valid coordinate range.',
    });
  });

  it('rejects more bends than a hole could plausibly need', () => {
    const many: HolePath = Array.from({ length: 13 }, (_, i) => [64.1 + i * 0.001, -21.76]);
    expect(validatePath(many)).toEqual({ ok: false, reason: 'A hole can have at most 12 points.' });
  });
});

describe('isComplete', () => {
  it('is complete once a tee and a green exist', () => {
    expect(isComplete([TEE, GREEN])).toBe(true);
  });

  it('is incomplete with only a tee', () => {
    expect(isComplete([TEE])).toBe(false);
  });
});

describe('labelPosition', () => {
  it('sits halfway along a straight hole', () => {
    const [lat, lng] = labelPosition([TEE, GREEN])!;
    expect(lat).toBeCloseTo(64.1025, 4);
    expect(lng).toBeCloseTo(-21.755, 4);
  });

  it('follows the line round a dogleg instead of averaging the points', () => {
    // West-to-east leg (~486 m) then a south-to-north leg (~556 m): the
    // halfway point is just past the corner, on the second leg.
    const corner: [number, number] = [64.1, -21.75];
    const [lat, lng] = labelPosition([TEE, corner, GREEN])!;

    expect(lng).toBeCloseTo(-21.75, 3); // on the second leg, not out in the middle
    expect(lat).toBeGreaterThan(64.1);
    expect(lat).toBeLessThan(64.105);
    // The centroid would be about [64.1017, -21.7533] - off the line entirely.
    expect(Math.abs(lng - -21.7533)).toBeGreaterThan(0.001);
  });

  it('has nowhere to sit on an empty line', () => {
    expect(labelPosition([])).toBeNull();
  });
});

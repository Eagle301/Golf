import {
  buildCourseMapHtml,
  buildCourseAerialHtml,
  type CourseMarker,
  buildHoleEditorHtml,
  holeEditorState,
  type CourseAerial,
} from '../courseMapHtml';

const marker: CourseMarker = {
  id: 'c1',
  name: 'Mýrin',
  club: 'GKG',
  latitude: 64.0851,
  longitude: -21.9243,
};

describe('buildCourseMapHtml', () => {
  it('embeds location groups as JSON, not interpolated markup', () => {
    const html = buildCourseMapHtml([marker]);
    const payload = html.match(/const GROUPS = (\[.*?\]);/s);
    expect(payload).not.toBeNull();
    expect(JSON.parse(payload![1])).toEqual([
      {
        latitude: marker.latitude,
        longitude: marker.longitude,
        courses: [{ id: 'c1', name: 'Mýrin', club: 'GKG' }],
      },
    ]);
  });

  it('combines courses at the same location into one group', () => {
    const twin: CourseMarker = { ...marker, id: 'c2', name: 'Leirdalsvöllur' };
    const elsewhere: CourseMarker = { ...marker, id: 'c3', name: 'Húsafell', latitude: 64.69792 };
    const html = buildCourseMapHtml([marker, twin, elsewhere]);
    const groups = JSON.parse(html.match(/const GROUPS = (\[.*?\]);/s)![1]);

    expect(groups).toHaveLength(2);
    const shared = groups.find((g: any) => g.courses.length === 2);
    expect(shared.courses.map((c: any) => c.id)).toEqual(['c1', 'c2']);
  });

  it('emits play and edit messages', () => {
    const html = buildCourseMapHtml([marker]);
    expect(html).toContain('course-play');
    expect(html).toContain('course-edit');
  });

  it('safely encodes names that contain HTML and quotes', () => {
    const evil: CourseMarker = {
      ...marker,
      id: 'c2',
      name: `<script>alert("x")</script>`,
      club: `a"b'c`,
    };
    const html = buildCourseMapHtml([evil]);
    const payload = html.match(/const GROUPS = (\[.*?\]);/s);
    expect(JSON.parse(payload![1])[0].courses[0].name).toBe(evil.name);
    // No angle bracket from course data may survive as literal markup.
    expect(html.indexOf('<script>alert')).toBe(-1);
    expect(html.indexOf('</script>alert')).toBe(-1);
  });

  it('produces a complete Leaflet document', () => {
    const html = buildCourseMapHtml([marker]);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('leaflet');
  });

  it('renders a valid document for zero markers', () => {
    const html = buildCourseMapHtml([]);
    const payload = html.match(/const GROUPS = (\[.*?\]);/s);
    expect(JSON.parse(payload![1])).toEqual([]);
  });
});

describe('buildCourseAerialHtml', () => {
  const course: CourseAerial = {
    name: 'Landið',
    club: 'GR',
    latitude: 64.14977,
    longitude: -21.76237,
  };

  it('embeds the course as JSON, not interpolated markup', () => {
    const html = buildCourseAerialHtml(course);
    const payload = html.match(/const COURSE = (\{.*?\});/s);
    expect(payload).not.toBeNull();
    expect(JSON.parse(payload![1])).toEqual(course);
  });

  it('centres the view on the course at course-level zoom', () => {
    const html = buildCourseAerialHtml(course);
    expect(html).toContain('setView([COURSE.latitude, COURSE.longitude], 15)');
  });

  it('uses Esri World Imagery tiles, whose path puts y before x', () => {
    const html = buildCourseAerialHtml(course);
    expect(html).toContain('World_Imagery/MapServer/tile/{z}/{y}/{x}');
  });

  it('keeps an OpenStreetMap layer for the satellite/map toggle', () => {
    const html = buildCourseAerialHtml(course);
    expect(html).toContain('tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(html).toContain('toggle-map');
    expect(html).toContain('toggle-satellite');
  });

  it('safely encodes a name that contains HTML and quotes', () => {
    const html = buildCourseAerialHtml({ ...course, name: `<script>alert("x")</script>` });
    const payload = html.match(/const COURSE = (\{.*?\});/s);
    expect(JSON.parse(payload![1]).name).toBe(`<script>alert("x")</script>`);
    expect(html.indexOf('<script>alert')).toBe(-1);
  });

  it('produces a complete Leaflet document', () => {
    const html = buildCourseAerialHtml(course);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('leaflet');
  });
});

describe('buildCourseAerialHtml with hole lines', () => {
  const course: CourseAerial = {
    name: 'Landið',
    club: 'GR',
    latitude: 64.14977,
    longitude: -21.76237,
  };
  const holes = [
    { hole_number: 1, path: [[64.15, -21.765], [64.152, -21.76]] as [number, number][] },
    { hole_number: 2, path: [[64.153, -21.762], [64.155, -21.758]] as [number, number][] },
  ];

  it('embeds the hole lines as JSON with their label positions precomputed', () => {
    const html = buildCourseAerialHtml({ ...course, holes });
    const payload = html.match(/const HOLES = (\[.*?\]);/s);
    expect(payload).not.toBeNull();

    const parsed = JSON.parse(payload![1]);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].hole_number).toBe(1);
    expect(parsed[0].path).toEqual(holes[0].path);
    // Halfway along the first hole, so the number sits on the line.
    expect(parsed[0].label[0]).toBeCloseTo(64.151, 3);
    expect(parsed[0].label[1]).toBeCloseTo(-21.7625, 3);
  });

  it('draws each hole as a line with a numbered badge', () => {
    const html = buildCourseAerialHtml({ ...course, holes });
    expect(html).toContain('L.polyline');
    expect(html).toContain('divIcon');
    expect(html).toContain('hole-badge');
  });

  it('renders a course with no hole lines as before', () => {
    const html = buildCourseAerialHtml(course);
    expect(JSON.parse(html.match(/const HOLES = (\[.*?\]);/s)![1])).toEqual([]);
  });

  it('skips a hole whose line is not finished', () => {
    const html = buildCourseAerialHtml({
      ...course,
      holes: [{ hole_number: 3, path: [[64.15, -21.765]] as [number, number][] }],
    });
    expect(JSON.parse(html.match(/const HOLES = (\[.*?\]);/s)![1])).toEqual([]);
  });
});

describe('buildHoleEditorHtml', () => {
  const course: CourseAerial = {
    name: 'Landið',
    club: 'GR',
    latitude: 64.14977,
    longitude: -21.76237,
  };
  const holes = [
    { hole_number: 1, path: [[64.15, -21.765], [64.152, -21.76]] as [number, number][] },
    { hole_number: 2, path: [] as [number, number][] },
  ];

  it('marks which hole is being edited', () => {
    const html = buildHoleEditorHtml({ course, holes, activeHoleNumber: 2 });
    const state = JSON.parse(html.match(/let STATE = (\{.*?\});/s)![1]);
    expect(state.active).toBe(2);
  });

  it('posts every kind of edit back to the app', () => {
    const html = buildHoleEditorHtml({ course, holes, activeHoleNumber: 1 });
    expect(html).toContain('point-added');
    expect(html).toContain('point-moved');
    expect(html).toContain('point-removed');
  });

  it('makes the active hole draggable', () => {
    const html = buildHoleEditorHtml({ course, holes, activeHoleNumber: 1 });
    expect(html).toContain('draggable: true');
  });

  it('embeds every hole so the others can be drawn for context', () => {
    const html = buildHoleEditorHtml({ course, holes, activeHoleNumber: 1 });
    const state = JSON.parse(html.match(/let STATE = (\{.*?\});/s)![1]);
    expect(state.holes.map((h: any) => h.hole_number)).toEqual([1, 2]);
  });

  it('safely encodes a course name that contains HTML', () => {
    const html = buildHoleEditorHtml({
      course: { ...course, name: `<script>alert("x")</script>` },
      holes,
      activeHoleNumber: 1,
    });
    expect(html.indexOf('<script>alert')).toBe(-1);
  });
});

describe('holeEditorState', () => {
  it('carries the active hole and a label for every finished line', () => {
    const state = holeEditorState(
      [
        { hole_number: 1, path: [[64.15, -21.765], [64.152, -21.76]] as [number, number][] },
        { hole_number: 2, path: [[64.153, -21.762]] as [number, number][] },
      ],
      2
    );

    expect(state.active).toBe(2);
    expect(state.holes[0].label).not.toBeNull();
    // Unfinished lines have nowhere to put a number yet.
    expect(state.holes[1].label).toBeNull();
    expect(state.holes[1].path).toEqual([[64.153, -21.762]]);
  });

  it('is plain JSON, so it can be pushed into the document as-is', () => {
    const state = holeEditorState([{ hole_number: 1, path: [[64.15, -21.765], [64.152, -21.76]] }], 1);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});

describe('buildHoleEditorHtml live updates', () => {
  const course: CourseAerial = {
    name: 'Landið',
    club: 'GR',
    latitude: 64.14977,
    longitude: -21.76237,
  };
  const holes = [{ hole_number: 1, path: [[64.15, -21.765], [64.152, -21.76]] as [number, number][] }];

  it('exposes a way to redraw from new state without reloading the document', () => {
    const html = buildHoleEditorHtml({ course, holes, activeHoleNumber: 1 });
    expect(html).toContain('__applyState');
  });

  it('accepts state pushed in as a message, for the web iframe', () => {
    const html = buildHoleEditorHtml({ course, holes, activeHoleNumber: 1 });
    expect(html).toMatch(/addEventListener\('message'/);
  });

  it('only re-frames the map when the hole being edited changes', () => {
    const html = buildHoleEditorHtml({ course, holes, activeHoleNumber: 1 });
    // Re-framing on every point would yank the map around mid-edit.
    expect(html).toContain('activeChanged');
  });
});

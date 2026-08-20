import { buildCourseMapHtml, type CourseMarker } from '../courseMapHtml';

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

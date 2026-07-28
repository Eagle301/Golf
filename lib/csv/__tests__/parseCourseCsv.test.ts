import { parseCourseCsv } from '../parseCourseCsv';

const NINE_HOLE_CSV = `Name,Korpa Landið/Áin,,
CR,69,,
Slope,124,,
Hole,Length,Par,Index
1,297,4,6
2,285,4,7
3,309,4,3
4,137,3,9
5,329,4,5
6,420,5,1
7,140,3,8
8,384,4,4
9,467,5,2`;

const EIGHTEEN_HOLE_CSV = `Name,Korpa Landið/Áin,,
CR,69,,
Slope,124,,
Hole,Length,Par,Index
1,297,4,12
2,285,4,14
3,309,4,6
4,137,3,18
5,329,4,10
6,420,5,2
7,140,3,16
8,384,4,8
9,467,5,4
10,286,4,15
11,414,5,7
12,299,4,5
13,120,3,11
14,350,4,3
15,340,4,1
16,408,5,13
17,165,3,17
18,326,4,9`;

describe('parseCourseCsv', () => {
  it('parses a valid 9-hole CSV', () => {
    const result = parseCourseCsv(NINE_HOLE_CSV);

    expect(result.name).toBe('Korpa Landið/Áin');
    expect(result.course_rating).toBe(69);
    expect(result.slope_rating).toBe(124);
    expect(result.hole_count).toBe(9);
    expect(result.holes).toHaveLength(9);
    expect(result.holes[0]).toEqual({ hole_number: 1, par: 4, length_meters: 297, stroke_index: 6 });
  });

  it('parses a valid 18-hole CSV', () => {
    const result = parseCourseCsv(EIGHTEEN_HOLE_CSV);

    expect(result.hole_count).toBe(18);
    expect(result.holes).toHaveLength(18);
    expect(result.holes[17]).toEqual({ hole_number: 18, par: 4, length_meters: 326, stroke_index: 9 });
  });

  it('throws when the Name row is missing', () => {
    const csv = EIGHTEEN_HOLE_CSV.replace('Name,Korpa Landið/Áin,,\n', '');
    expect(() => parseCourseCsv(csv)).toThrow(/CR/);
  });

  it('throws on a malformed header row', () => {
    const csv = EIGHTEEN_HOLE_CSV.replace('Hole,Length,Par,Index', 'Hole,Par,Length,Index');
    expect(() => parseCourseCsv(csv)).toThrow(/header/i);
  });

  it('throws when the hole count is not 9 or 18', () => {
    const csv = EIGHTEEN_HOLE_CSV.split('\n').slice(0, -3).join('\n');
    expect(() => parseCourseCsv(csv)).toThrow(/9 or 18/);
  });

  it('throws on an invalid par value', () => {
    const csv = EIGHTEEN_HOLE_CSV.replace('1,297,4,12', '1,297,6,12');
    expect(() => parseCourseCsv(csv)).toThrow(/par must be 3, 4, or 5/);
  });

  it('throws on a duplicate stroke index', () => {
    const csv = EIGHTEEN_HOLE_CSV.replace('2,285,4,14', '2,285,4,12');
    expect(() => parseCourseCsv(csv)).toThrow(/used more than once/);
  });

  it('throws on a non-numeric value', () => {
    const csv = EIGHTEEN_HOLE_CSV.replace('1,297,4,12', '1,abc,4,12');
    expect(() => parseCourseCsv(csv)).toThrow(/must be a number/);
  });
});

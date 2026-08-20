import { parseCourseCsv } from '../parseCourseCsv';

const NINE_HOLE_CSV = `Name,Korpa Landið/Áin
Tee,Gulur,69,124
Hole,Par,Index,Gulur
1,4,6,297
2,4,7,285
3,4,3,309
4,3,9,137
5,4,5,329
6,5,1,420
7,3,8,140
8,4,4,384
9,5,2,467`;

const TWO_TEE_CSV = `Name,Hvaleyrarvöllur
Tee,Gulur,70.9,127
Tee,Rauður,68.2,118
Hole,Par,Index,Gulur,Rauður
1,4,12,297,260
2,4,14,285,250
3,4,6,309,270
4,3,18,137,110
5,4,10,329,300
6,5,2,420,390
7,3,16,140,120
8,4,8,384,350
9,5,4,467,430
10,4,15,286,255
11,5,7,414,380
12,4,5,299,265
13,3,11,120,100
14,4,3,350,320
15,4,1,340,310
16,5,13,408,375
17,3,17,165,140
18,4,9,326,295`;

describe('parseCourseCsv', () => {
  it('parses an optional Club row after the Name row', () => {
    const csv = NINE_HOLE_CSV.replace('Name,Korpa Landið/Áin', 'Name,Korpa Landið/Áin\nClub,GR');
    const result = parseCourseCsv(csv);

    expect(result.club).toBe('GR');
    expect(result.hole_count).toBe(9);
  });

  it('leaves club null when there is no Club row', () => {
    expect(parseCourseCsv(NINE_HOLE_CSV).club).toBeNull();
  });

  it('parses a 9-hole CSV with one tee', () => {
    const result = parseCourseCsv(NINE_HOLE_CSV);

    expect(result.name).toBe('Korpa Landið/Áin');
    expect(result.hole_count).toBe(9);
    expect(result.holes).toHaveLength(9);
    expect(result.holes[0]).toEqual({ hole_number: 1, par: 4, stroke_index: 6 });
    expect(result.tees).toHaveLength(1);
    expect(result.tees[0].name).toBe('Gulur');
    expect(result.tees[0].course_rating).toBe(69);
    expect(result.tees[0].slope_rating).toBe(124);
    expect(result.tees[0].lengths).toHaveLength(9);
    expect(result.tees[0].lengths[0]).toBe(297);
  });

  it('parses an 18-hole CSV with two tees', () => {
    const result = parseCourseCsv(TWO_TEE_CSV);

    expect(result.hole_count).toBe(18);
    expect(result.tees).toHaveLength(2);
    expect(result.tees[1]).toEqual({
      name: 'Rauður',
      course_rating: 68.2,
      slope_rating: 118,
      lengths: [260, 250, 270, 110, 300, 390, 120, 350, 430, 255, 380, 265, 100, 320, 310, 375, 140, 295],
    });
    expect(result.holes[17]).toEqual({ hole_number: 18, par: 4, stroke_index: 9 });
  });

  it('throws when the Name row is missing', () => {
    const csv = TWO_TEE_CSV.replace('Name,Hvaleyrarvöllur\n', '');
    expect(() => parseCourseCsv(csv)).toThrow(/Name/);
  });

  it('throws when there are no Tee rows', () => {
    const csv = TWO_TEE_CSV.split('\n')
      .filter((line) => !line.startsWith('Tee,'))
      .join('\n');
    expect(() => parseCourseCsv(csv)).toThrow(/at least one "Tee" row/i);
  });

  it('throws when a Tee row is missing its slope', () => {
    const csv = TWO_TEE_CSV.replace('Tee,Gulur,70.9,127', 'Tee,Gulur,70.9');
    expect(() => parseCourseCsv(csv)).toThrow(/slope/i);
  });

  it('throws when the header tee columns do not match the Tee rows', () => {
    const csv = TWO_TEE_CSV.replace('Hole,Par,Index,Gulur,Rauður', 'Hole,Par,Index,Gulur,Blár');
    expect(() => parseCourseCsv(csv)).toThrow(/header/i);
  });

  it('throws on a malformed header row', () => {
    const csv = TWO_TEE_CSV.replace('Hole,Par,Index,Gulur,Rauður', 'Hole,Index,Par,Gulur,Rauður');
    expect(() => parseCourseCsv(csv)).toThrow(/header/i);
  });

  it('throws when the hole count is not 9 or 18', () => {
    const csv = TWO_TEE_CSV.split('\n').slice(0, -3).join('\n');
    expect(() => parseCourseCsv(csv)).toThrow(/9 or 18/);
  });

  it('throws on an invalid par value', () => {
    const csv = TWO_TEE_CSV.replace('1,4,12,297,260', '1,6,12,297,260');
    expect(() => parseCourseCsv(csv)).toThrow(/par must be 3, 4, or 5/);
  });

  it('throws on a duplicate stroke index', () => {
    const csv = TWO_TEE_CSV.replace('2,4,14,285,250', '2,4,12,285,250');
    expect(() => parseCourseCsv(csv)).toThrow(/used more than once/);
  });

  it('throws on a non-numeric length', () => {
    const csv = TWO_TEE_CSV.replace('1,4,12,297,260', '1,4,12,abc,260');
    expect(() => parseCourseCsv(csv)).toThrow(/must be a number/);
  });

  it('throws when a hole row is missing a length column for a tee', () => {
    const csv = TWO_TEE_CSV.replace('1,4,12,297,260', '1,4,12,297');
    expect(() => parseCourseCsv(csv)).toThrow(/must be a number|length/i);
  });
});

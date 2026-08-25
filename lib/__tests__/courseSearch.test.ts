import { filterCourses } from '../courseSearch';

const courses = [
  { id: '1', name: 'Mýrin', club: 'GKG' },
  { id: '2', name: 'Grafarholtsvöllur', club: 'GR' },
  { id: '3', name: 'Korpa Landið', club: 'GR' },
  { id: '4', name: 'Þorláksvöllur', club: 'GÞ' },
  { id: '5', name: 'Garðavöllur', club: 'Leynir' },
  { id: '6', name: 'Hvaleyrarvöllur', club: null },
];

describe('filterCourses', () => {
  it('returns everything for an empty query', () => {
    expect(filterCourses(courses, '')).toHaveLength(6);
    expect(filterCourses(courses, '   ')).toHaveLength(6);
  });

  it('matches part of a course name, whatever the case', () => {
    expect(filterCourses(courses, 'korpa').map((c) => c.id)).toEqual(['3']);
    expect(filterCourses(courses, 'VÖLLUR').map((c) => c.id)).toEqual(['2', '4', '5', '6']);
  });

  it('matches the club', () => {
    expect(filterCourses(courses, 'GR').map((c) => c.id)).toEqual(['2', '3']);
    expect(filterCourses(courses, 'leynir').map((c) => c.id)).toEqual(['5']);
  });

  it('finds accented names typed without the accents', () => {
    // Nobody reaches for the ý key while searching.
    expect(filterCourses(courses, 'myrin').map((c) => c.id)).toEqual(['1']);
    expect(filterCourses(courses, 'gardavollur').map((c) => c.id)).toEqual(['5']);
    expect(filterCourses(courses, 'thorlaksvollur').map((c) => c.id)).toEqual(['4']);
  });

  it('still finds them when the accents are typed', () => {
    expect(filterCourses(courses, 'Mýrin').map((c) => c.id)).toEqual(['1']);
    expect(filterCourses(courses, 'Þorláks').map((c) => c.id)).toEqual(['4']);
  });

  it('survives a course with no club', () => {
    expect(filterCourses(courses, 'hvaleyrar').map((c) => c.id)).toEqual(['6']);
  });

  it('returns nothing when nothing matches', () => {
    expect(filterCourses(courses, 'st andrews')).toEqual([]);
  });

  it('ignores surrounding whitespace in the query', () => {
    expect(filterCourses(courses, '  korpa  ').map((c) => c.id)).toEqual(['3']);
  });
});

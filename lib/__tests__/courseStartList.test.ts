import { organizeCoursesForStart, countRoundsByCourse, filterCoursesByName } from '../courseStartList';
import type { CachedCourse } from '@/lib/offline/types';

function course(id: string, name: string, club: string | null = null): CachedCourse {
  return { id, name, club, hole_count: 18, total_par: 72, holes: [], tees: [] };
}

describe('countRoundsByCourse', () => {
  it('counts rounds per course id', () => {
    const rounds = [{ course_id: 'a' }, { course_id: 'b' }, { course_id: 'a' }];
    expect(countRoundsByCourse(rounds)).toEqual({ a: 2, b: 1 });
  });
});

describe('filterCoursesByName', () => {
  const courses = [course('a', 'Grafarholtsvöllur'), course('b', 'Urriðavöllur'), course('c', 'Mýrin')];

  it('matches case-insensitively anywhere in the name', () => {
    expect(filterCoursesByName(courses, 'urri').map((c) => c.name)).toEqual(['Urriðavöllur']);
    expect(filterCoursesByName(courses, 'VÖLLUR').map((c) => c.name)).toEqual([
      'Grafarholtsvöllur',
      'Urriðavöllur',
    ]);
  });

  it('returns all courses for a blank query', () => {
    expect(filterCoursesByName(courses, '')).toEqual(courses);
    expect(filterCoursesByName(courses, '   ')).toEqual(courses);
  });

  it('matches on the club name so a club query returns all its courses', () => {
    const clubCourses = [
      course('a', 'Mýrin', 'GKG'),
      course('b', 'Leirdalsvöllur', 'GKG'),
      course('c', 'Grafarholtsvöllur', 'GR'),
      course('d', 'Húsafell', null),
    ];
    expect(filterCoursesByName(clubCourses, 'gkg').map((c) => c.name)).toEqual([
      'Mýrin',
      'Leirdalsvöllur',
    ]);
  });
});

describe('organizeCoursesForStart', () => {
  it('puts played courses in mostPlayed ordered by round count, rest alphabetical', () => {
    const courses = [course('a', 'Urriðavöllur'), course('b', 'Mýrin'), course('c', 'Grafarholtsvöllur')];
    const { mostPlayed, others } = organizeCoursesForStart(courses, { b: 5, a: 2 });

    expect(mostPlayed.map((c) => c.name)).toEqual(['Mýrin', 'Urriðavöllur']);
    expect(others.map((c) => c.name)).toEqual(['Grafarholtsvöllur']);
  });

  it('caps mostPlayed at 3 and moves the overflow to others alphabetically', () => {
    const courses = [
      course('a', 'Alfa'),
      course('b', 'Bravó'),
      course('c', 'Charlie'),
      course('d', 'Delta'),
    ];
    const { mostPlayed, others } = organizeCoursesForStart(courses, { a: 1, b: 2, c: 3, d: 4 });

    expect(mostPlayed.map((c) => c.name)).toEqual(['Delta', 'Charlie', 'Bravó']);
    expect(others.map((c) => c.name)).toEqual(['Alfa']);
  });

  it('breaks round-count ties alphabetically', () => {
    const courses = [course('a', 'Ósvöllur'), course('b', 'Akranes')];
    const { mostPlayed } = organizeCoursesForStart(courses, { a: 2, b: 2 });

    expect(mostPlayed.map((c) => c.name)).toEqual(['Akranes', 'Ósvöllur']);
  });

  it('returns everything alphabetical in others when there is no history', () => {
    const courses = [course('a', 'Urriðavöllur'), course('b', 'Grafarholtsvöllur')];
    const { mostPlayed, others } = organizeCoursesForStart(courses, {});

    expect(mostPlayed).toEqual([]);
    expect(others.map((c) => c.name)).toEqual(['Grafarholtsvöllur', 'Urriðavöllur']);
  });

  it('sorts Icelandic names with locale collation', () => {
    const courses = [course('a', 'Öndverðarnes'), course('b', 'Akranes'), course('c', 'Úlfarsá')];
    const { others } = organizeCoursesForStart(courses, {});

    expect(others.map((c) => c.name)).toEqual(['Akranes', 'Úlfarsá', 'Öndverðarnes']);
  });
});

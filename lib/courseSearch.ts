/**
 * Course name search. Icelandic names are full of accented letters nobody
 * types while searching, so both the query and the name are folded down to
 * plain ASCII before matching: "myrin" finds Mýrin, "thorlaksvollur" finds
 * Þorláksvöllur.
 */

/** Letters that survive Unicode decomposition and need spelling out. */
const SPELLINGS: Record<string, string> = {
  þ: 'th',
  ð: 'd',
  æ: 'ae',
  ø: 'o',
};

function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    // Strip the combining accents NFD split off (á -> a, ö -> o).
    .replace(/[̀-ͯ]/g, '')
    .replace(/[þðæø]/g, (letter) => SPELLINGS[letter] ?? letter);
}

export interface SearchableCourse {
  name: string;
  club: string | null;
}

export function matchesCourseSearch(course: SearchableCourse, query: string): boolean {
  const needle = fold(query.trim());
  if (needle === '') return true;
  return fold(course.name).includes(needle) || fold(course.club ?? '').includes(needle);
}

export function filterCourses<T extends SearchableCourse>(courses: T[], query: string): T[] {
  const needle = query.trim();
  if (needle === '') return courses;
  return courses.filter((course) => matchesCourseSearch(course, needle));
}

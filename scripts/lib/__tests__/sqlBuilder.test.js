const { sqlForCourse, quote } = require('../sqlBuilder');

const USER = 'a1ddade6-33e1-488d-903e-d0936799fbe4';

const course = {
  course: {
    name: 'Bakkakot',
    club: 'GM',
    hole_count: 9,
    total_par: 35,
    latitude: 64.2,
    longitude: -21.5,
    nine_si_even: false,
    gsi_slug: 'bakkakot',
  },
  holes: [
    { hole_number: 1, par: 4, stroke_index: 3 },
    { hole_number: 2, par: 3, stroke_index: 17 },
  ],
  tees: [
    {
      name: '40',
      sort_order: 1,
      total_length_meters: 4000,
      course_rating: 64.2,
      slope_rating: 112,
      lengths: [330, 150],
    },
  ],
};

describe('quote', () => {
  it('escapes a quote in a course name rather than breaking the statement', () => {
    expect(quote("Þing'völlur")).toBe("'Þing''völlur'");
  });

  it('writes a missing value as null, not an empty string', () => {
    expect(quote(null)).toBe('null');
  });
});

describe('sqlForCourse', () => {
  const sql = sqlForCourse(course, USER);

  it('inserts the course with its identity and location', () => {
    expect(sql).toContain("'Bakkakot'");
    expect(sql).toContain("'GM'");
    expect(sql).toContain("'bakkakot'");
    expect(sql).toContain(USER);
    expect(sql).toContain('64.2');
  });

  it('skips a course that has already been imported', () => {
    // Re-running the import must not duplicate anything.
    expect(sql).toMatch(/where gsi_slug = 'bakkakot'/);
  });

  it('inserts every hole with its par and stroke index', () => {
    expect(sql).toContain('(1, 4, 3)');
    expect(sql).toContain('(2, 3, 17)');
  });

  it('inserts the tee with its ratings', () => {
    expect(sql).toContain("'40'");
    expect(sql).toContain('64.2');
    expect(sql).toContain('112');
  });

  it('ties each tee length to the right hole rather than to a row order', () => {
    // Lengths are matched through hole_number, so a re-ordered insert can't
    // silently attach hole 2's length to hole 1.
    expect(sql).toMatch(/values \(1, 330\), \(2, 150\)/);
    expect(sql).toContain('v.hole_number = h.hole_number');
  });

  it('runs as one statement per course, so a bad course cannot half-import', () => {
    expect(sql.trim().startsWith('do $$')).toBe(true);
    expect(sql.trim().endsWith('$$;')).toBe(true);
  });

  it('refuses to build SQL for a course with a length missing', () => {
    const broken = JSON.parse(JSON.stringify(course));
    broken.tees[0].lengths[1] = null;
    expect(() => sqlForCourse(broken, USER)).toThrow('length');
  });
});

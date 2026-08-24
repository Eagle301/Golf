const { mapCourse, selectTees, validateCourse, deriveNineSiEven } = require('../gsiMapper');

const korpa = require('./fixtures/korpa.json');
const myrin = require('./fixtures/myrin.json');
const jadar = require('./fixtures/jadarsvollur.json');
const leirdalur = require('./fixtures/leirdalsvollur.json');

describe('selectTees', () => {
  it('drops the championship tee when a course has three or more rated tees', () => {
    const { kept, dropped } = selectTees(korpa.scorecardData.tees);

    expect(dropped.map((t) => t.name)).toEqual(['63']);
    expect(kept.map((t) => t.name)).toEqual(['57', '52', '46']);
  });

  it('keeps a short senior tee - only the longest is the pro tee', () => {
    const { kept, dropped } = selectTees(jadar.scorecardData.tees);

    expect(dropped.map((t) => t.name)).toEqual(['Hvítur']);
    expect(kept.map((t) => t.name)).toContain('Gull');
  });

  it('never trims a course down to nothing', () => {
    const twoTees = korpa.scorecardData.tees.slice(0, 2);
    const { kept, dropped } = selectTees(twoTees);

    expect(dropped).toEqual([]);
    expect(kept).toHaveLength(2);
  });

  it('ignores tees with no men’s rating rather than importing them unrated', () => {
    const unrated = [
      ...korpa.scorecardData.tees,
      { display_label: 'Æfinga', total_length_m: 900, sort_order: 9, is_active: true, tee_ratings: [] },
    ];
    const { kept } = selectTees(unrated);

    expect(kept.map((t) => t.name)).not.toContain('Æfinga');
  });

  it('takes the men’s rating, not the women’s', () => {
    const { kept } = selectTees(korpa.scorecardData.tees);
    const fiftySeven = kept.find((t) => t.name === '57');

    // Source has male 68.8/123 and female 74.9/130 for this tee.
    expect(fiftySeven.course_rating).toBe(68.8);
    expect(fiftySeven.slope_rating).toBe(123);
  });
});

describe('deriveNineSiEven', () => {
  it('is false for a nine carrying the odd stroke indexes', () => {
    // Mýrin: 3, 17, 7, 11, 15, 1, 9, 5, 13
    expect(deriveNineSiEven(myrin.scorecardData.holes.map((h) => h.hole_stroke_indexes[0].si))).toBe(false);
  });

  it('is true for a nine carrying the even stroke indexes', () => {
    expect(deriveNineSiEven([2, 16, 6, 10, 14, 4, 8, 12, 18])).toBe(true);
  });

  it('is false for a full eighteen', () => {
    expect(deriveNineSiEven(Array.from({ length: 18 }, (_, i) => i + 1))).toBe(false);
  });
});

describe('mapCourse', () => {
  it('maps an eighteen-hole course into the app shape', () => {
    const mapped = mapCourse(korpa);

    expect(mapped.course).toMatchObject({
      name: 'Korpa',
      club: 'GR',
      hole_count: 18,
      latitude: 64.1523,
      longitude: -21.7617,
      gsi_slug: 'korpa',
    });
    // Summed from the holes, not the course.par field, which says 71 here.
    expect(mapped.course.total_par).toBe(72);
    expect(mapped.holes).toHaveLength(18);
    expect(mapped.holes[0]).toEqual({ hole_number: 1, par: 5, stroke_index: 10 });
  });

  it('carries the per-hole length of every kept tee', () => {
    const mapped = mapCourse(korpa);
    const fiftySeven = mapped.tees.find((t) => t.name === '57');

    expect(fiftySeven.lengths).toHaveLength(18);
    expect(fiftySeven.lengths[0]).toBe(470);
    expect(fiftySeven.total_length_meters).toBe(5534);
  });

  it('maps a nine-hole course, keeping the twice-around rating as published', () => {
    const mapped = mapCourse(myrin);

    expect(mapped.course).toMatchObject({ name: 'Mýrin', club: 'GKG', hole_count: 9, nine_si_even: false });
    expect(mapped.holes).toHaveLength(9);
    // The source already publishes the 18-hole figure our maths expects.
    expect(mapped.tees.find((t) => t.name === '41').course_rating).toBe(62.2);
    expect(mapped.course.total_par).toBe(34);
  });

  it('records which tees it dropped, so the report can show them', () => {
    expect(mapCourse(korpa).droppedTees).toEqual(['63']);
  });

  it('handles combination tee names', () => {
    const mapped = mapCourse(leirdalur);
    expect(mapped.tees.map((t) => t.name)).toContain('54/59');
  });
});

describe('validateCourse', () => {
  it('passes a real course', () => {
    expect(validateCourse(mapCourse(korpa))).toEqual({ ok: true, problems: [] });
  });

  it('rejects a hole count the app cannot store', () => {
    const mapped = mapCourse(korpa);
    mapped.holes = mapped.holes.slice(0, 12);
    mapped.course.hole_count = 12;

    expect(validateCourse(mapped).problems).toContain('hole count is 12, expected 9 or 18');
  });

  it('rejects a par the schema cannot store', () => {
    const mapped = mapCourse(korpa);
    mapped.holes[3].par = 6;

    expect(validateCourse(mapped).problems).toContain('hole 4 has par 6');
  });

  it('rejects stroke indexes that are not a proper set', () => {
    const mapped = mapCourse(korpa);
    mapped.holes[2].stroke_index = mapped.holes[1].stroke_index;

    expect(validateCourse(mapped).problems.join(' ')).toContain('stroke indexes');
  });

  it('rejects a tee missing a hole length', () => {
    const mapped = mapCourse(korpa);
    mapped.tees[0].lengths[5] = null;

    expect(validateCourse(mapped).problems.join(' ')).toContain('missing a length');
  });

  it('flags per-hole lengths that disagree with the published total', () => {
    const mapped = mapCourse(korpa);
    mapped.tees[0].lengths[0] += 200;

    expect(validateCourse(mapped).problems.join(' ')).toContain('total');
  });

  it('rejects a course left with no rated tee', () => {
    const mapped = mapCourse(korpa);
    mapped.tees = [];

    expect(validateCourse(mapped).problems).toContain('no rated tees survived');
  });
});

describe('mapCourse when the club has published no scorecard', () => {
  it('says so plainly instead of blowing up on a null card', () => {
    expect(() => mapCourse({ course: { name: 'Thorsvöllur', slug: 'thorsvollur' }, scorecardData: null }))
      .toThrow('no scorecard published');
  });
});

describe('findExistingMatch', () => {
  const { findExistingMatch } = require('../gsiMapper');

  const existing = [
    { id: 'a', name: 'Grafarholtsvöllur', club: 'GR', latitude: 64.12057, longitude: -21.76782 },
    { id: 'b', name: 'Korpa Landið', club: 'GR', latitude: 64.14977, longitude: -21.76237 },
    { id: 'c', name: 'Jaðarsvöllur', club: 'GA', latitude: 65.66686, longitude: -18.11671 },
  ];

  it('matches a course already in the app at the same site, despite a different name', () => {
    // GSÍ calls it "Korpa"; the app has the nines listed separately.
    const match = findExistingMatch({ name: 'Korpa', latitude: 64.1523, longitude: -21.7617 }, existing);
    expect(match && match.name).toBe('Korpa Landið');
  });

  it('matches on name even when coordinates are missing', () => {
    const match = findExistingMatch({ name: 'Jaðarsvöllur', latitude: null, longitude: null }, existing);
    expect(match && match.id).toBe('c');
  });

  it('does not match a course somewhere else entirely', () => {
    expect(findExistingMatch({ name: 'Bakkakot', latitude: 64.2, longitude: -21.5 }, existing)).toBeNull();
  });

  it('does not match a different club a few kilometres away', () => {
    // Hlíðavöllur is ~2 km from Korpa - close, but not the same course.
    expect(findExistingMatch({ name: 'Hlíðavöllur', latitude: 64.16816, longitude: -21.7407 }, existing)).toBeNull();
  });
});

describe('findExistingMatch with imprecise source coordinates', () => {
  const { findExistingMatch } = require('../gsiMapper');

  const existing = [
    { id: 'a', name: 'Grafarholtsvöllur', club: 'GR', latitude: 64.12057, longitude: -21.76782 },
    { id: 'b', name: 'Garðavöllur', club: 'Leynir', latitude: 64.31939, longitude: -22.02943 },
  ];

  it('matches when the source uses the short name and the club’s own coordinate', () => {
    // GSÍ lists "Grafarholt" at the GR clubhouse, 1.8 km from the course.
    const match = findExistingMatch({ name: 'Grafarholt', latitude: 64.1353, longitude: -21.7847 }, existing);
    expect(match && match.name).toBe('Grafarholtsvöllur');
  });

  it('does not match a similarly named course at the other end of the country', () => {
    // Garðavöllur undir jökli (Snæfellsnes) is not Leynir's Garðavöllur.
    const match = findExistingMatch(
      { name: 'Garðavöllur undir jökli', latitude: 64.813667, longitude: -23.139079 },
      existing
    );
    expect(match).toBeNull();
  });

  it('still does not match a course with a different name nearby', () => {
    const match = findExistingMatch({ name: 'Brautarholt', latitude: 64.1353, longitude: -21.7847 }, existing);
    expect(match).toBeNull();
  });
});

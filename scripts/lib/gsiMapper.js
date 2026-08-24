/**
 * Maps a course payload from the GSÍ site (rastimar.golf.is Remix loader
 * JSON) into the shape this app stores, and validates it hard enough that a
 * dubious course is reported rather than imported.
 *
 * Build-time tooling, deliberately plain CommonJS so it runs under `node`
 * with no build step. See
 * docs/superpowers/specs/2026-08-24-icelandic-course-import-design.md
 */

/** Per-hole lengths are allowed to disagree with the published total by this much. */
const TOTAL_LENGTH_TOLERANCE_M = 30;

/** Below this many rated tees, nothing is treated as a championship tee. */
const MIN_TEES_TO_TRIM = 3;

function mensRating(tee) {
  return (tee.tee_ratings || []).find((rating) => rating.gender === 'male') || null;
}

/**
 * Which tees to import. The longest tee is the championship one - dropped on
 * the user's standing instruction - but only where the course has enough
 * tees for that to be a real distinction. Short senior tees (Jaðarsvöllur's
 * "Gull") are kept: only the longest is the pro tee.
 *
 * The rule is a default, not a truth; every drop is reported for review.
 */
function selectTees(sourceTees) {
  const rated = (sourceTees || [])
    .filter((tee) => tee.is_active !== false)
    .map((tee) => ({ tee, rating: mensRating(tee) }))
    .filter((entry) => entry.rating != null);

  const byLength = [...rated].sort(
    (a, b) => (b.tee.total_length_m || 0) - (a.tee.total_length_m || 0)
  );
  const championship = byLength.length >= MIN_TEES_TO_TRIM ? byLength[0].tee : null;

  const toTee = ({ tee, rating }) => ({
    name: tee.display_label,
    source_id: tee.id,
    sort_order: tee.sort_order,
    total_length_meters: tee.total_length_m,
    course_rating: rating.course_rating,
    slope_rating: rating.slope_rating,
    lengths: [],
  });

  return {
    kept: rated.filter((entry) => entry.tee !== championship).map(toTee),
    dropped: championship ? [toTee(byLength[0])] : [],
  };
}

/**
 * Nines carry one half of the printed 18-hole stroke indexes. Which half
 * decides how handicap strokes fall, and it is derivable: an all-even set is
 * the even nine (see lib/calculations strokesForHole).
 */
function deriveNineSiEven(strokeIndexes) {
  if (strokeIndexes.length !== 9) return false;
  return strokeIndexes.every((si) => Number.isInteger(si) && si % 2 === 0);
}

function strokeIndexOf(hole) {
  const entry = (hole.hole_stroke_indexes || []).find((si) => si.gender === 'unisex')
    || (hole.hole_stroke_indexes || [])[0];
  return entry ? entry.si : null;
}

function mapCourse(payload) {
  const source = payload.course;
  const card = payload.scorecardData;

  // Some clubs are listed with no card at all - that is a gap in the source,
  // not a broken course, and the report should say so.
  if (!card || !Array.isArray(card.holes) || card.holes.length === 0) {
    throw new Error('no scorecard published on rastimar.golf.is');
  }

  const holesSorted = [...card.holes].sort((a, b) => a.number - b.number);
  const holes = holesSorted.map((hole) => ({
    hole_number: hole.number,
    par: hole.par,
    stroke_index: strokeIndexOf(hole),
  }));

  const { kept, dropped } = selectTees(card.tees);

  // Lengths are indexed by tee, so they have to be gathered per hole in the
  // course's own hole order.
  for (const tee of kept) {
    tee.lengths = holesSorted.map((hole) => {
      const entry = (hole.hole_tee_lengths || []).find((l) => l.tee_id === tee.source_id);
      return entry ? entry.length_m : null;
    });
  }

  return {
    course: {
      name: source.name,
      club: source.club ? source.club.short_name : null,
      // `length` is the hole count despite the name; par is summed from the
      // holes because source.par disagrees with its own card (Korpa: 71/72).
      hole_count: source.length,
      total_par: holes.reduce((sum, hole) => sum + hole.par, 0),
      latitude: source.latitude,
      longitude: source.longitude,
      nine_si_even: deriveNineSiEven(holes.map((hole) => hole.stroke_index)),
      gsi_slug: source.slug,
    },
    holes,
    tees: kept,
    droppedTees: dropped.map((tee) => tee.name),
    isPracticeCourse: !!source.is_practice_course,
  };
}

function validateCourse(mapped) {
  const problems = [];
  const { course, holes, tees } = mapped;

  if (course.hole_count !== 9 && course.hole_count !== 18) {
    problems.push(`hole count is ${course.hole_count}, expected 9 or 18`);
  }
  if (holes.length !== course.hole_count) {
    problems.push(`${holes.length} holes present for a ${course.hole_count}-hole course`);
  }

  for (const hole of holes) {
    if (![3, 4, 5].includes(hole.par)) problems.push(`hole ${hole.hole_number} has par ${hole.par}`);
  }

  const indexes = holes.map((hole) => hole.stroke_index);
  if (indexes.some((si) => si == null)) {
    problems.push('stroke indexes are missing on some holes');
  } else if (new Set(indexes).size !== indexes.length) {
    problems.push('stroke indexes repeat, so they are not a valid set');
  } else if (indexes.some((si) => si < 1 || si > 18)) {
    problems.push('stroke indexes fall outside 1..18');
  } else if (course.hole_count === 18 && new Set(indexes).size !== 18) {
    problems.push('stroke indexes are not a full 1..18 permutation');
  }

  if (tees.length === 0) problems.push('no rated tees survived');

  for (const tee of tees) {
    if (tee.lengths.length !== holes.length || tee.lengths.some((length) => length == null)) {
      problems.push(`tee "${tee.name}" is missing a length on at least one hole`);
      continue;
    }
    const sum = tee.lengths.reduce((total, length) => total + length, 0);
    if (
      tee.total_length_meters != null &&
      Math.abs(sum - tee.total_length_meters) > TOTAL_LENGTH_TOLERANCE_M
    ) {
      problems.push(
        `tee "${tee.name}" hole lengths sum to ${sum} m but its published total is ${tee.total_length_meters} m`
      );
    }
    if (tee.course_rating == null || tee.slope_rating == null) {
      problems.push(`tee "${tee.name}" has no men's rating`);
    }
  }

  return { ok: problems.length === 0, problems };
}

/** Two courses this close together are the same piece of land. */
const SAME_SITE_METERS = 1000;

/** How far a shared-stem name is still plausibly the same course. */
const SAME_REGION_METERS = 25000;

function metersBetween(a, b) {
  const toRad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * toRad;
  const dLng = (b.longitude - a.longitude) * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * toRad) * Math.cos(b.latitude * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/**
 * The course in the app that this source course already is, if any. Names
 * differ between the two (GSÍ's "Korpa" is six permutation rows here), so
 * the site's location is the reliable signal, with an exact name match as a
 * fallback for courses stored without coordinates.
 */
function findExistingMatch(candidate, existing) {
  const name = String(candidate.name).toLowerCase().trim();
  const hasCoords = candidate.latitude != null && candidate.longitude != null;
  const distanceTo = (course) =>
    hasCoords && course.latitude != null && course.longitude != null
      ? metersBetween(candidate, course)
      : null;

  const byName = existing.find((course) => course.name.toLowerCase().trim() === name);
  if (byName) return byName;

  // The source often lists the short form ("Grafarholt") against the club's
  // own coordinate, which can sit a couple of kilometres from the course. A
  // shared name stem plus the same region is enough; the region check is what
  // stops Garðavöllur undir jökli from matching Leynir's Garðavöllur.
  const byStem = existing.find((course) => {
    const other = course.name.toLowerCase().trim();
    const sharesStem =
      name.length >= 5 && other.length >= 5 && (other.startsWith(name) || name.startsWith(other));
    if (!sharesStem) return false;
    const distance = distanceTo(course);
    return distance == null || distance <= SAME_REGION_METERS;
  });
  if (byStem) return byStem;

  if (!hasCoords) return null;

  return existing.find((course) => (distanceTo(course) ?? Infinity) <= SAME_SITE_METERS) || null;
}

module.exports = {
  mapCourse,
  selectTees,
  validateCourse,
  deriveNineSiEven,
  findExistingMatch,
  metersBetween,
  TOTAL_LENGTH_TOLERANCE_M,
  SAME_SITE_METERS,
};

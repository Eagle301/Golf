/**
 * Turns a mapped GSÍ course into one idempotent SQL statement.
 *
 * One `do $$ ... $$` block per course, so a course either lands whole or not
 * at all, and re-running the import is a no-op for courses already present
 * (matched on their gsi_slug).
 */

function quote(value) {
  if (value == null) return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function number(value) {
  if (value == null || Number.isNaN(Number(value))) return 'null';
  return String(Number(value));
}

function sqlForCourse(mapped, userId) {
  const { course, holes, tees } = mapped;

  for (const tee of tees) {
    if (tee.lengths.length !== holes.length || tee.lengths.some((length) => length == null)) {
      throw new Error(`tee "${tee.name}" is missing a hole length - refusing to build SQL`);
    }
  }

  const holeValues = holes
    .map((hole) => `(${hole.hole_number}, ${hole.par}, ${number(hole.stroke_index)})`)
    .join(', ');

  const teeBlocks = tees
    .map((tee) => {
      const lengthValues = tee.lengths
        .map((length, index) => `(${holes[index].hole_number}, ${number(length)})`)
        .join(', ');

      return `
    insert into public.tee_boxes (course_id, name, course_rating, slope_rating, total_length_meters, sort_order)
    values (new_course_id, ${quote(tee.name)}, ${number(tee.course_rating)}, ${number(tee.slope_rating)},
            ${number(tee.total_length_meters)}, ${number(tee.sort_order)})
    returning id into new_tee_id;

    insert into public.tee_lengths (tee_box_id, hole_id, length_meters)
    select new_tee_id, h.id, v.length_meters
    from public.holes h
    join (values ${lengthValues}) as v(hole_number, length_meters)
      on v.hole_number = h.hole_number
    where h.course_id = new_course_id;`;
    })
    .join('\n');

  return `do $$
declare
  new_course_id uuid;
  new_tee_id uuid;
begin
  if exists (select 1 from public.courses where gsi_slug = ${quote(course.gsi_slug)}) then
    return;
  end if;

  insert into public.courses
    (user_id, name, club, hole_count, total_par, latitude, longitude, nine_si_even, gsi_slug)
  values
    (${quote(userId)}, ${quote(course.name)}, ${quote(course.club)}, ${number(course.hole_count)},
     ${number(course.total_par)}, ${number(course.latitude)}, ${number(course.longitude)},
     ${course.nine_si_even ? 'true' : 'false'}, ${quote(course.gsi_slug)})
  returning id into new_course_id;

  insert into public.holes (course_id, hole_number, par, stroke_index)
  select new_course_id, v.hole_number, v.par, v.stroke_index
  from (values ${holeValues}) as v(hole_number, par, stroke_index);
${teeBlocks}
end $$;`;
}

module.exports = { sqlForCourse, quote, number };

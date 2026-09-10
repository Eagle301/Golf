-- Efri Leirdalur and Neðri Leirdalur (GKG): two nine-hole courses derived
-- from Leirdalsvöllur. Applied to production on 2026-09-09.
--
--   Efri  = Leirdalsvöllur holes 4-12          (par 35)
--   Neðri = Leirdalsvöllur holes 1-3 + 13-18   (par 36)
--
-- Conventions:
--   * stroke_index is the parent's 18-hole SI ranked 1..9 within the nine.
--     Parity is mixed on both nines, so nine_si_even follows the majority
--     (Efri 6 odd / 3 even -> false, Neðri 3 odd / 6 even -> true).
--   * Tee CR/slope are the parent's official 18-hole values unchanged
--     (the app stores twice-around 18-hole ratings for nines). No official
--     rating exists for this split.
--   * Tee names, sort order, per-hole lengths and hole_geometry lines are
--     copied from the parent holes. Nothing links the new rows back to the
--     parent; re-run after a parent re-import.
--
-- Idempotent: the course insert is skipped when a GKG course of the same
-- name already exists, and every later CTE is driven from that insert.

with parent as (
  select id, user_id from courses where id = '15bea26b-0ca3-4022-8bc6-393a00b6dd5d'
),
spec(cname, par, lat, lng, si_even) as (values
  ('Efri Leirdalur', 35, 64.08891::float8, -21.86384::float8, false),
  ('Neðri Leirdalur', 36, 64.08668::float8, -21.87808::float8, true)
),
map(cname, new_num, parent_num, si) as (values
  ('Efri Leirdalur',1,4,9),('Efri Leirdalur',2,5,1),('Efri Leirdalur',3,6,4),
  ('Efri Leirdalur',4,7,6),('Efri Leirdalur',5,8,3),('Efri Leirdalur',6,9,8),
  ('Efri Leirdalur',7,10,2),('Efri Leirdalur',8,11,7),('Efri Leirdalur',9,12,5),
  ('Neðri Leirdalur',1,1,2),('Neðri Leirdalur',2,2,7),('Neðri Leirdalur',3,3,5),
  ('Neðri Leirdalur',4,13,6),('Neðri Leirdalur',5,14,9),('Neðri Leirdalur',6,15,1),
  ('Neðri Leirdalur',7,16,4),('Neðri Leirdalur',8,17,8),('Neðri Leirdalur',9,18,3)
),
new_courses as (
  insert into courses (user_id, name, club, hole_count, total_par, latitude, longitude, nine_si_even, gsi_slug)
  select p.user_id, s.cname, 'GKG', 9, s.par, s.lat, s.lng, s.si_even, null
  from parent p cross join spec s
  where not exists (select 1 from courses c where c.name = s.cname and c.club = 'GKG')
  returning id, name
),
new_holes as (
  insert into holes (course_id, hole_number, par, stroke_index)
  select nc.id, m.new_num, ph.par, m.si
  from new_courses nc
  join map m on m.cname = nc.name
  join parent p on true
  join holes ph on ph.course_id = p.id and ph.hole_number = m.parent_num
  returning id, course_id, hole_number
),
new_tees as (
  insert into tee_boxes (course_id, name, course_rating, slope_rating, total_length_meters, sort_order)
  select nc.id, pt.name, pt.course_rating, pt.slope_rating,
         (select sum(ptl.length_meters) from map m
            join holes ph on ph.course_id = p.id and ph.hole_number = m.parent_num
            join tee_lengths ptl on ptl.tee_box_id = pt.id and ptl.hole_id = ph.id
          where m.cname = nc.name),
         pt.sort_order
  from new_courses nc
  join parent p on true
  join tee_boxes pt on pt.course_id = p.id
  returning id, course_id, name
),
ins_lengths as (
  insert into tee_lengths (tee_box_id, hole_id, length_meters)
  select nt.id, nh.id, ptl.length_meters
  from new_holes nh
  join new_courses nc on nc.id = nh.course_id
  join map m on m.cname = nc.name and m.new_num = nh.hole_number
  join parent p on true
  join holes ph on ph.course_id = p.id and ph.hole_number = m.parent_num
  join new_tees nt on nt.course_id = nh.course_id
  join tee_boxes pt on pt.course_id = p.id and pt.name = nt.name
  join tee_lengths ptl on ptl.tee_box_id = pt.id and ptl.hole_id = ph.id
  returning tee_box_id
),
ins_geom as (
  insert into hole_geometry (hole_id, points)
  select nh.id, g.points
  from new_holes nh
  join new_courses nc on nc.id = nh.course_id
  join map m on m.cname = nc.name and m.new_num = nh.hole_number
  join parent p on true
  join holes ph on ph.course_id = p.id and ph.hole_number = m.parent_num
  join hole_geometry g on g.hole_id = ph.id
  returning hole_id
)
select (select count(*) from new_courses) courses,   -- expected 2
       (select count(*) from new_holes)   holes,     -- expected 18
       (select count(*) from new_tees)    tees,      -- expected 10
       (select count(*) from ins_lengths) lengths,   -- expected 90
       (select count(*) from ins_geom)    geometry;  -- expected 18

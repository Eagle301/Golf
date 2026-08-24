# Icelandic Course Import — Design

2026-08-24

## Goal

Every Icelandic golf course available in the app, with every tee except the
championship/professional one, imported from an authoritative source instead
of hand-seeded course by course.

## Source: rastimar.golf.is (GSÍ)

The official GSÍ course site is a Remix app, and its loader data is directly
addressable as JSON — no HTML scraping, no headless browser:

| What | Request |
|---|---|
| All courses | `GET /vellir?_data=routes%2F_public.vellir._index` |
| One course | `GET /vellir/<slug>?_data=routes%2F_public.vellir.%24name` |

The index returns all **66 courses in a single request**: 46 nine-hole, 19
eighteen-hole, one with a hole count that is neither, and five flagged
`is_practice_course`. The per-course response carries
`{ course, scorecardData: { holes, tees, holeTeeLengths, holeStrokeIndexes, teeRatings } }`.

Field mapping, checked against real responses (Korpa, Mýrin, Grafarholt,
Hvaleyrarvöllur, Hlíðavöllur, Urriðavöllur, Garðavöllur, Jaðarsvöllur,
Brautarholt, Leirdalsvöllur):

| App | Source |
|---|---|
| `courses.name` | `course.name` |
| `courses.club` | `course.club.short_name` (e.g. `GR`) |
| `courses.hole_count` | `course.length` — 9 or 18, despite the field name |
| `courses.latitude` / `longitude` | `course.latitude` / `longitude` |
| `courses.total_par` | **sum of `holes[].par`**, not `course.par` |
| `courses.nine_si_even` | derived — true when every stroke index is even |
| `holes.par` | `holes[].par` |
| `holes.stroke_index` | `holes[].hole_stroke_indexes` where `gender = unisex` |
| `tee_boxes.name` | `tees[].display_label` (`57`, `Gulur`, `Gull`) |
| `tee_boxes.total_length_meters` | `tees[].total_length_m` |
| `tee_boxes.course_rating` / `slope_rating` | `tees[].tee_ratings` where `gender = male` |
| `tee_boxes.sort_order` | `tees[].sort_order` |
| `tee_lengths.length_meters` | `holes[].hole_tee_lengths[tee_id]` |

`course.par` is not trustworthy — Korpa reports 71 while its own card sums to
72 — so par is always summed from the holes.

### Two conventions the source already satisfies

Both verified against Mýrin, a nine-hole course we seeded by hand in August:

- **Nine-hole ratings are already the 18-hole twice-around figures.** Mýrin
  tee 47 returns CR 66.0 / slope 121, which is exactly what we store today.
  No doubling step, and no risk of writing a ~34 nine-hole rating.
- **Nine-hole stroke indexes are already the printed 18-hole parity.** Mýrin
  returns 3, 17, 7, 11, 15, 1, 9, 5, 13 — the odd half. So `nine_si_even`
  falls out of the data rather than needing per-course research: true when
  every index in the set is even.

## Which tee is "professional"

Across the eight sampled courses the longest tee is the championship tee, and
on seven of the eight it is the only tee with no women's rating. Hvaleyrarvöllur
is the exception — its 63 tee carries a women's rating too — so "missing a
women's rating" cannot be the rule on its own.

**Rule:** exclude the longest tee (`sort_order` 1 / max `total_length_m`)
when the course has three or more rated tees. Keep everything else, including
short senior tees such as Jaðarsvöllur's `Gull` (2959 m) and the combination
tees at Leirdalsvöllur (`54/59`, `47/52`). Courses with one or two tees are
never trimmed automatically.

This is a default, not a truth. Every exclusion is listed in the review
report and confirmed before anything is written.

## Approach: fetch → validate → review → apply

One script, `scripts/importIcelandicCourses.ts`, in three phases, each
leaving its output on disk so the next phase is reproducible offline:

1. **Fetch** — the index, then one request per course with a polite delay,
   cached as JSON files. Re-runs read the cache; `--refresh` re-fetches.
2. **Build and validate** — map to the app's shape and *fail the course
   rather than insert something dubious*. Checks:
   - exactly 9 or 18 holes present
   - every par in 3..5 (the `holes.par` column allows nothing else)
   - stroke indexes form a valid permutation: 1..18 for eighteens, a
     consistent odd or even half for nines
   - a per-hole length for every kept tee on every hole
   - per-hole lengths sum to within ±30 m of `total_length_m` — the same
     sanity rule used in the August seeding
   - at least one men's-rated tee survives the pro-tee exclusion
3. **Emit** — `import-report.md` (per course: what will be created, tees kept
   and dropped, every warning) plus idempotent SQL. The report is read by a
   human, then the SQL is applied via Supabase `apply_migration`. Nothing is
   written to the database by the script itself.

## Idempotency, and not clobbering the existing 18 courses

- Add `courses.gsi_slug text unique` as the stable external key, so a re-run
  updates instead of duplicating.
- The 18 existing courses were seeded by hand from club PDFs and GSÍ pages
  and are **left untouched by default**. They are matched by (club, name) and
  the report lists field-level differences for per-course acceptance. A known
  one: Mýrin's tee 41 total is 2020 m in the source versus the 2013 m entered
  by hand. The source is very likely right, but overwriting verified data is
  the user's call, not the script's.
- `courses.user_id` means courses are owned per user, so imported rows are
  inserted under the current user. Making the catalogue global (nullable
  `user_id`, read-all RLS) is a real change to ownership and RLS and is out
  of scope here.

## Known limits

- **Facility nines.** GSÍ publishes one card per course, so 27-hole
  facilities arrive as their single published 18-hole combination. Korpa's
  card is Sjórinn + Landið (confirmed by matching par sequences), which means
  Áin, and the nine-permutation rows the app already has, cannot be derived
  from this source. Existing rows stay; no new nines are invented.
- The five practice courses and the one course whose hole count is neither 9
  nor 18 are skipped and reported, since `hole_count` allows only 9 or 18.
- Women's ratings exist in the source and are ignored, consistent with the
  app storing men's ratings today.
- `rating_date` is null throughout the source, so rating staleness cannot be
  checked.
- Terms of use: this is a public read of a public site, one request per
  course, cached. Worth a note to GSÍ if the import ever becomes scheduled.

## Optional: OpenStreetMap hole geometry

OSM has 222 golf holes mapped in Iceland, 221 with hole numbers, carrying
`par` and `handicap` tags that can be cross-checked against the imported
card. Coverage against these courses is about 57% and uneven — GKG,
Grafarholt, Hvaleyrarvöllur and Oddur are complete; Korpa has only Sjórinn;
Hlíðavöllur has 8 of 18; Jaðarsvöllur, Garðavöllur, Húsafell and Nesvöllur
have none.

It is a plausible accelerator for the hole line editor's data, but each way
needs its direction checked (nothing guarantees a way starts at the tee) and
Oddur's 34 ways for 27 holes need de-duplication. That verification pass is
the reason it stays optional and out of the import's critical path.

## Testing

- Pure mapper tests over saved fixture JSON: Korpa (18 holes), Mýrin (nine),
  Jaðarsvöllur (senior `Gull` tee), Leirdalsvöllur (combination tee names) —
  field mapping, par summed from holes, `nine_si_even` derivation, pro-tee
  rule, length sanity.
- Validation tests: missing tee length, broken stroke-index permutation, a
  par 6 hole, a 12-hole course — each rejected with a named reason.
- Idempotency: applying the emitted SQL twice leaves one row per course.
- No network in tests; fixtures only.

## Out of scope

Hole geometry (see the hole line editor spec), women's ratings, tee-time
booking data, club images and descriptions, and any scheduled/automatic
refresh — this is a deliberate, reviewed import.

## Effort

About a day and a half: half a day for the fetch and mapping layer with
fixtures, half a day for validation and the report, and half a day of
reviewing the 66-course output and applying it. The scale is in the review,
not the code.

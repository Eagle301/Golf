#!/usr/bin/env node
/**
 * Imports Icelandic golf courses from the GSÍ site (rastimar.golf.is), whose
 * Remix loaders serve the scorecard data as JSON.
 *
 *   node scripts/importIcelandicCourses.js fetch    # download + cache (66 requests)
 *   node scripts/importIcelandicCourses.js report   # map, validate, write the review report
 *
 * Nothing is written to the database: `report` produces a markdown file to
 * read before any import happens. See
 * docs/superpowers/specs/2026-08-24-icelandic-course-import-design.md
 */
const fs = require('fs');
const path = require('path');
const { mapCourse, validateCourse, findExistingMatch } = require('./lib/gsiMapper');
const { sqlForCourse } = require('./lib/sqlBuilder');

const BASE = 'https://rastimar.golf.is';
const INDEX_URL = `${BASE}/vellir?_data=routes%2F_public.vellir._index`;
const courseUrl = (slug) => `${BASE}/vellir/${slug}?_data=routes%2F_public.vellir.%24name`;

const CACHE_DIR = path.join(__dirname, '.cache', 'gsi');
const OUT_DIR = path.join(__dirname, 'out');
const POLITE_DELAY_MS = 250;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.json();
}

async function fetchAll() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const index = await getJson(INDEX_URL);
  fs.writeFileSync(path.join(CACHE_DIR, '_index.json'), JSON.stringify(index, null, 1));
  console.log(`index: ${index.courses.length} courses`);

  let fetched = 0;
  let failed = 0;
  for (const course of index.courses) {
    const file = path.join(CACHE_DIR, `${course.slug}.json`);
    if (fs.existsSync(file) && !process.argv.includes('--refresh')) continue;
    try {
      const payload = await getJson(courseUrl(course.slug));
      fs.writeFileSync(file, JSON.stringify(payload, null, 1));
      fetched++;
    } catch (err) {
      failed++;
      console.error(`  ! ${course.slug}: ${err.message}`);
    }
    await sleep(POLITE_DELAY_MS);
  }
  console.log(`fetched ${fetched} course pages (${failed} failed), cache: ${CACHE_DIR}`);
}

function loadCached() {
  const index = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, '_index.json'), 'utf8'));
  return index.courses
    .map((course) => {
      const file = path.join(CACHE_DIR, `${course.slug}.json`);
      return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
    })
    .filter(Boolean);
}

function report() {
  const payloads = loadCached();
  const ready = [];
  const skipped = [];
  const failedValidation = [];

  for (const payload of payloads) {
    let mapped;
    try {
      mapped = mapCourse(payload);
    } catch (err) {
      const name = (payload.course && payload.course.name) || 'unknown';
      // A missing card is the source's gap, not something to fix here.
      if (/no scorecard published/.test(err.message)) {
        skipped.push({ course: { name }, reason: err.message });
      } else {
        failedValidation.push({ name, problems: [err.message] });
      }
      continue;
    }

    if (mapped.isPracticeCourse) {
      skipped.push({ ...mapped, reason: 'practice course' });
      continue;
    }
    if (mapped.course.hole_count !== 9 && mapped.course.hole_count !== 18) {
      skipped.push({ ...mapped, reason: `${mapped.course.hole_count} holes - the app stores only 9 or 18` });
      continue;
    }

    const check = validateCourse(mapped);
    if (check.ok) ready.push(mapped);
    else failedValidation.push({ ...mapped, problems: check.problems });
  }

  const lines = [];
  lines.push('# Icelandic course import — review', '');
  lines.push(`Source: rastimar.golf.is (GSÍ). ${payloads.length} courses cached.`, '');
  lines.push(
    `- **${ready.length}** ready to import`,
    `- **${failedValidation.length}** need a look before importing`,
    `- **${skipped.length}** deliberately skipped`,
    ''
  );

  lines.push('## Ready to import', '');
  lines.push('| Course | Club | Holes | Par | Tees kept | Pro tee dropped |');
  lines.push('|---|---|---|---|---|---|');
  for (const course of ready.sort((a, b) => a.course.name.localeCompare(b.course.name, 'is'))) {
    lines.push(
      `| ${course.course.name} | ${course.course.club || '—'} | ${course.course.hole_count} | ${course.course.total_par} | ` +
        `${course.tees.map((t) => t.name).join(', ')} | ${course.droppedTees.join(', ') || '—'} |`
    );
  }
  lines.push('');

  if (failedValidation.length > 0) {
    lines.push('## Needs a look', '');
    for (const course of failedValidation) {
      lines.push(`### ${(course.course && course.course.name) || course.name || 'unknown'}`, '');
      for (const problem of course.problems) lines.push(`- ${problem}`);
      lines.push('');
    }
  }

  if (skipped.length > 0) {
    lines.push('## Skipped', '');
    for (const course of skipped) lines.push(`- **${course.course.name}** — ${course.reason}`);
    lines.push('');
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const reportPath = path.join(OUT_DIR, 'import-report.md');
  fs.writeFileSync(reportPath, lines.join('\n'));
  fs.writeFileSync(path.join(OUT_DIR, 'import-ready.json'), JSON.stringify(ready, null, 1));

  console.log(`ready: ${ready.length}  needs-a-look: ${failedValidation.length}  skipped: ${skipped.length}`);
  console.log(`report: ${reportPath}`);
}

/**
 * Writes the SQL for every ready course that isn't already in the app.
 * Existing courses are never touched - they were seeded by hand from club
 * PDFs and are the more trustworthy record where the two disagree.
 */
function buildSql(userId) {
  const ready = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'import-ready.json'), 'utf8'));
  const existing = JSON.parse(fs.readFileSync(path.join(__dirname, 'existing.json'), 'utf8'));

  const toImport = [];
  const alreadyHave = [];
  for (const mapped of ready) {
    const match = findExistingMatch(mapped.course, existing);
    if (match) alreadyHave.push({ source: mapped.course.name, existing: match.name });
    else toImport.push(mapped);
  }

  const statements = toImport.map((mapped) => sqlForCourse(mapped, userId));
  fs.writeFileSync(path.join(OUT_DIR, 'import.sql'), statements.join('\n\n'));
  fs.writeFileSync(
    path.join(OUT_DIR, 'import-plan.json'),
    JSON.stringify({ toImport: toImport.map((c) => c.course), alreadyHave }, null, 1)
  );

  console.log(`to import: ${toImport.length}`);
  console.log(`already in the app (left alone): ${alreadyHave.length}`);
  for (const pair of alreadyHave) console.log(`  - ${pair.source} → ${pair.existing}`);
  console.log(`sql: ${path.join(OUT_DIR, 'import.sql')}`);
}

async function main() {
  const command = process.argv[2] || 'report';
  if (command === 'fetch') await fetchAll();
  else if (command === 'report') report();
  else if (command === 'sql') {
    const userId = process.argv[3];
    if (!userId) {
      console.error('usage: node scripts/importIcelandicCourses.js sql <user-id>');
      process.exit(1);
    }
    buildSql(userId);
  } else {
    console.error(`unknown command "${command}" - use fetch, report or sql`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import type { HoleCount, HoleInput, SaveCourseInput, TeeBoxInput } from '@/lib/hooks/useCourses';

const VALID_HOLE_COUNTS: HoleCount[] = [9, 18];

function splitLine(line: string): string[] {
  return line.split(',').map((cell) => cell.trim());
}

function parseNumber(value: string | undefined, description: string): number {
  const num = Number(value);
  if (!value || Number.isNaN(num)) {
    throw new Error(`${description} must be a number, got "${value ?? ''}".`);
  }
  return num;
}

/**
 * Format:
 *   Name,<course name>
 *   Tee,<tee name>,<course rating>,<slope>     (one row per tee)
 *   Hole,Par,Index,<tee 1 name>,<tee 2 name>...
 *   <hole>,<par>,<index>,<length>,<length>...
 */
export function parseCourseCsv(text: string): SaveCourseInput {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

  const [nameLabel, name] = splitLine(lines[0] ?? '');
  if (nameLabel?.toLowerCase() !== 'name') {
    throw new Error(`Expected a "Name" row but found "${nameLabel ?? ''}".`);
  }
  if (!name) {
    throw new Error('"Name" row is missing a value.');
  }

  const tees: TeeBoxInput[] = [];
  let lineIdx = 1;
  while (lineIdx < lines.length && splitLine(lines[lineIdx])[0]?.toLowerCase() === 'tee') {
    const [, teeName, crStr, slopeStr] = splitLine(lines[lineIdx]);
    if (!teeName) {
      throw new Error(`Tee row ${tees.length + 1} is missing a name.`);
    }
    tees.push({
      name: teeName,
      course_rating: parseNumber(crStr, `Tee "${teeName}" Course Rating`),
      slope_rating: parseNumber(slopeStr, `Tee "${teeName}" Slope Rating`),
      lengths: [],
    });
    lineIdx++;
  }
  if (tees.length === 0) {
    throw new Error('Expected at least one "Tee" row (Tee,<name>,<CR>,<slope>).');
  }

  const expectedHeader = ['Hole', 'Par', 'Index', ...tees.map((t) => t.name)];
  const header = splitLine(lines[lineIdx] ?? '');
  if (
    header.length < expectedHeader.length ||
    expectedHeader.some((col, i) => header[i]?.toLowerCase() !== col.toLowerCase())
  ) {
    throw new Error(`Expected a header row: ${expectedHeader.join(',')}.`);
  }
  lineIdx++;

  const holeLines = lines.slice(lineIdx);
  const holeCount = holeLines.length;
  if (!VALID_HOLE_COUNTS.includes(holeCount as HoleCount)) {
    throw new Error(`Expected 9 or 18 hole rows, found ${holeCount}.`);
  }

  const usedIndexes = new Set<number>();
  const holes: HoleInput[] = holeLines.map((line, i) => {
    const cells = splitLine(line);
    const [holeNumberStr, parStr, indexStr] = cells;
    const holeNumber = parseNumber(holeNumberStr, `Hole ${i + 1} number`);
    if (holeNumber !== i + 1) {
      throw new Error(`Expected hole ${i + 1} but found hole ${holeNumberStr}.`);
    }

    const par = parseNumber(parStr, `Hole ${holeNumber} par`);
    if (par !== 3 && par !== 4 && par !== 5) {
      throw new Error(`Hole ${holeNumber} par must be 3, 4, or 5, got ${par}.`);
    }

    const strokeIndex = parseNumber(indexStr, `Hole ${holeNumber} index`);
    if (strokeIndex < 1 || strokeIndex > holeCount) {
      throw new Error(`Hole ${holeNumber} index must be between 1 and ${holeCount}, got ${strokeIndex}.`);
    }
    if (usedIndexes.has(strokeIndex)) {
      throw new Error(`Stroke index ${strokeIndex} is used more than once.`);
    }
    usedIndexes.add(strokeIndex);

    tees.forEach((tee, teeIdx) => {
      tee.lengths.push(parseNumber(cells[3 + teeIdx], `Hole ${holeNumber} length for tee "${tee.name}"`));
    });

    return {
      hole_number: holeNumber,
      par: par as 3 | 4 | 5,
      stroke_index: strokeIndex,
    };
  });

  return {
    name,
    hole_count: holeCount as HoleCount,
    holes,
    tees,
  };
}

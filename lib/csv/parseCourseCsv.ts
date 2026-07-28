import type { HoleCount, HoleInput, SaveCourseInput } from '@/lib/hooks/useCourses';

const VALID_HOLE_COUNTS: HoleCount[] = [9, 18];

function splitLine(line: string): string[] {
  return line.split(',').map((cell) => cell.trim());
}

function parseLabeledRow(line: string | undefined, label: string): string {
  if (!line) {
    throw new Error(`Missing "${label}" row.`);
  }
  const [rowLabel, value] = splitLine(line);
  if (rowLabel?.toLowerCase() !== label.toLowerCase()) {
    throw new Error(`Expected a "${label}" row but found "${rowLabel ?? ''}".`);
  }
  if (!value) {
    throw new Error(`"${label}" row is missing a value.`);
  }
  return value;
}

function parseNumber(value: string, description: string): number {
  const num = Number(value);
  if (!value || Number.isNaN(num)) {
    throw new Error(`${description} must be a number, got "${value}".`);
  }
  return num;
}

export function parseCourseCsv(text: string): SaveCourseInput {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

  const name = parseLabeledRow(lines[0], 'Name');
  const courseRating = parseNumber(parseLabeledRow(lines[1], 'CR'), 'Course Rating');
  const slopeRating = parseNumber(parseLabeledRow(lines[2], 'Slope'), 'Slope Rating');

  const header = splitLine(lines[3] ?? '');
  const expectedHeader = ['Hole', 'Length', 'Par', 'Index'];
  if (header.length < 4 || expectedHeader.some((col, i) => header[i]?.toLowerCase() !== col.toLowerCase())) {
    throw new Error('Expected a header row: Hole,Length,Par,Index.');
  }

  const holeLines = lines.slice(4);
  const holeCount = holeLines.length;
  if (!VALID_HOLE_COUNTS.includes(holeCount as HoleCount)) {
    throw new Error(`Expected 9 or 18 hole rows, found ${holeCount}.`);
  }

  const usedIndexes = new Set<number>();
  const holes: HoleInput[] = holeLines.map((line, i) => {
    const [holeNumberStr, lengthStr, parStr, indexStr] = splitLine(line);
    const holeNumber = parseNumber(holeNumberStr, `Hole ${i + 1} number`);
    if (holeNumber !== i + 1) {
      throw new Error(`Expected hole ${i + 1} but found hole ${holeNumberStr}.`);
    }

    const length = parseNumber(lengthStr, `Hole ${holeNumber} length`);
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

    return {
      hole_number: holeNumber,
      par: par as 3 | 4 | 5,
      length_meters: length,
      stroke_index: strokeIndex,
    };
  });

  return {
    name,
    hole_count: holeCount as HoleCount,
    course_rating: courseRating,
    slope_rating: slopeRating,
    holes,
  };
}

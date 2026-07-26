# Score Differential Chart Redesign

## Purpose

Redesign the dashboard's Score Differential chart to match the layout of the
official GolfBox differential history chart: plain upward bars (no
diverging positive/negative layout), a value label always visible above
each bar, rotated date labels along the x-axis, and the 8 rounds currently
counted toward the handicap calculation visually highlighted in a
different color from the rest.

## Background

The current chart ([components/dashboard/ScoreDifferentialChart.tsx](../../../components/dashboard/ScoreDifferentialChart.tsx))
draws diverging bars around a zero baseline (bars above the line for
positive differentials, below for negative), with a tap-to-reveal
single-line tooltip showing course name and differential value.

The user wants the chart to look like GolfBox's own view instead: all bars
rise from a 0.0 baseline, gridlines every 2.0 with axis labels on the left,
a value label permanently shown above every bar, and the 8 lowest
differentials (the ones actually counted toward the handicap, matching
[calculateHandicap](../../../lib/calculations.ts)'s best-8-of-last-20 logic)
highlighted in blue against the rest in a dark/near-black color — including
matching the date label color to its bar's highlight state.

Tapping a bar should still surface more detail than the always-visible
value label, but the detail set has grown: date, course name, total score,
handicap at the time of the round (`handicap_at_time`), and the
differential value.

## Data Layer

**`lib/differential.ts`** — extend `DifferentialRound`:

```ts
export interface DifferentialRound {
  id: string;
  date_played: string;
  score_differential: number;
  courseName: string;
  totalScore: number;
  handicapAtTime: number | null;
}
```

**`lib/hooks/useScoreDifferentialHistory.ts`** — extend the Supabase query
to also select `total_score, handicap_at_time`, and map them onto
`totalScore` / `handicapAtTime` in the returned rows, alongside the
existing fields.

No other part of the fetch/limit/ordering logic changes.

## Highlight Selection

Add a small helper (co-located in `lib/calculations.ts`, alongside
`calculateHandicap`, since it mirrors that function's selection logic):

```ts
/**
 * ids of the lowest min(8, rounds.length) score_differential values —
 * the same rounds calculateHandicap averages together. Ties broken by
 * array order (stable sort), matching calculateHandicap's behavior.
 */
export function countedRoundIds(rounds: { id: string; score_differential: number }[]): Set<string>
```

The chart calls this once per render with the `rounds` prop it already
receives (already capped to the last 20 rated rounds by the hook), and
uses the resulting set to decide each bar's `isCounted` styling. This
keeps the "which rounds count" logic in one place rather than
re-implementing the best-8 selection inside the chart component.

## Chart Rendering

Replacing the current diverging-bar SVG layout in
`ScoreDifferentialChart.tsx`:

- **Y-axis**: baseline (`value = 0`) is the bottom of the plot area.
  Horizontal dashed gridlines are drawn every 2.0 units from 0 up to a
  rounded-up axis max (smallest multiple of 2 that leaves headroom above
  the tallest bar's value label, e.g. `axisMax = ceil((maxVal + 2) / 2) * 2`).
  Each gridline gets a left-aligned numeric label (one decimal place,
  matching the differential formatting already used elsewhere).
- **Bars**: still one per round, evenly spaced left-to-right in
  chronological order (oldest first, matching current behavior), anchored
  to the 0 baseline, height = `(value / axisMax) * plotHeight`. Fill color
  is blue (`#3B82F6`) when the round's id is in the counted set, dark
  slate (`#1F2937`) otherwise.
- **Value labels**: an SVG `<Text>` centered above each bar showing its
  differential to one decimal place, colored to match that bar (blue for
  counted, dark slate otherwise).
- **Date labels**: SVG `<Text>` elements below the x-axis, rotated -40°
  around their anchor point, using the existing short date format
  (`MM/DD`), colored to match their bar's highlight state the same way as
  the value labels.
- **Sizing**: the chart continues to shrink bars/labels to fit the
  container width (as today), rather than scrolling — with up to 20 bars
  this will be tight on a phone screen, but matches what was asked for.
- The existing empty state (`No completed rounds yet...`) and "Last N
  rounds" fallback note for <20 rounds are unchanged.

## Tap Interaction

Tapping a bar (or its date label, matching the current hit-target
behavior) opens a small detail panel above the chart — replacing the old
one-line tooltip — showing:

- Date (full, not abbreviated)
- Course name
- Total score
- HCP (`handicapAtTime`, formatted to one decimal, or omitted/blank if
  `null`)
- Score differential

Tapping the same bar again (or tapping elsewhere) dismisses the panel, matching the current toggle-by-reselection behavior of `selectedIndex`.

## Testing

Update `components/dashboard/__tests__/ScoreDifferentialChart.test.tsx`:

- Value labels are present and correct without any tap, for every bar.
- Given a known set of >8 differentials, the 8 lowest are styled with the
  counted/highlight color and the rest are not (assert on rendered fill
  color per bar, keyed by testID).
- Tapping a bar's detail panel shows all four fields (date, course, score,
  HCP) plus the differential, not just a single combined string.
- Existing empty-state and fallback-note tests carry over unchanged.

## Out of Scope

- Horizontal scrolling / minimum bar width (explicitly declined in favor
  of shrink-to-fit).
- Negative differentials are not specifically re-designed for; if one
  occurs, its bar height clamps to 0 rather than extending below the
  baseline. This matches an edge case GolfBox's own reference chart didn't
  demonstrate either, and can be revisited if it comes up in practice.
- Any change to `calculateHandicap` itself — `countedRoundIds` mirrors its
  selection logic but the handicap calculation function is untouched.

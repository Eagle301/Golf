# Phase 2b: Dashboard Retrofit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retheme the Dashboard tab (`app/(tabs)/index.tsx`) and its 5 chart components to the Phase 1 semantic tokens and `Card` component, with correct light/dark behavior.

**Architecture:** `app/(tabs)/index.tsx`'s ad-hoc `bg-white`/`bg-gray-*` container `View`s are replaced with the existing `Card` component (`components/ui/Card.tsx`, unchanged — accepts `className` and any `ViewProps` including `testID`/`style`). Every chart component's plain `Text`/`View` chrome (titles, labels, empty states, the differential chart's tooltip) is retokenized to `text-primary`/`text-secondary` and their dark variants. In-SVG data-encoding colors (bar fills, donut arc/track, grid lines, axis labels) and data-semantic plain-view colors (fairway segment fills, the "Hit" label's green) are explicitly out of scope per the approved design spec and are left untouched.

**Tech Stack:** NativeWind v4, `@testing-library/react-native`, Jest.

## Global Constraints

- Semantic tokens (from Phase 1, already in `tailwind.config.js`): `bg-background`/`dark:bg-background-dark`, `bg-surface`/`dark:bg-surface-dark`, `text-text-primary`/`dark:text-text-primary-dark` (NativeWind class name for the `text-primary` token is `text-text-primary`, matching the existing `tailwind.config.js` key), `text-text-secondary`/`dark:text-text-secondary-dark`, `border-border-dark` (dark only — no light border token exists; reuse the existing `border-gray-200` Tailwind class for light borders, matching the convention already used elsewhere in this app, e.g. `app/(tabs)/courses.tsx`).
- `Card` (`components/ui/Card.tsx`) is unchanged by this plan — import and use it exactly as it exists: `<Card className="..." testID="..." style={{...}}>`. Its base classes already include `rounded-2xl bg-surface p-4 shadow-sm dark:border dark:border-border-dark dark:bg-surface-dark dark:shadow-none`; any `className` passed in is appended and can override spacing (e.g. `p-4` → `px-2 py-4`) per the existing Button/Card trailing-className-wins convention established in Phase 1.
- Non-goal (do not touch): in-SVG `fill`/`stroke` props and inline hex color constants that encode data — `COUNTED_COLOR`/`NORMAL_COLOR` and grid-line/axis-label colors in `ScoreDifferentialChart.tsx`; `TRACK_COLOR`/`FILL_COLOR` in `GirDonutChart.tsx`; `BAR_COLOR` in `ScoringByParChart.tsx`; the fairway segment `bg-amber-500`/`bg-green-600` fills and `bg-gray-100` track, and the "Hit {pct}%" label's `text-green-700`, in `FairwayDistributionChart.tsx`.
- No test in this plan asserts on the untouched SVG/data colors above — only on the retokenized chrome (titles, labels, empty states, container classes).
- No existing `testID` may change — every `Card` replacement must carry forward the exact `testID` the replaced `View` had, so existing test assertions (`app/(tabs)/__tests__/index.test.tsx`, and each chart's own `__tests__` file) continue to pass unmodified.

---

### Task 1: Retheme the Dashboard screen

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Modify: `app/(tabs)/__tests__/index.test.tsx` (add theming assertions; existing behavioral assertions must still pass unmodified)

**Interfaces:**
- Consumes: `Card` from `@/components/ui/Card` (existing, unchanged — `className`/`testID`/`children` props).
- Produces: nothing consumed by later tasks in this plan (Tasks 2-3 modify sibling chart files independently).

- [ ] **Step 1: Replace the file contents**

Replace the full contents of `app/(tabs)/index.tsx`:

```tsx
import { useCallback } from 'react';
import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useProfile } from '@/lib/hooks/useProfile';
import { useScoreDifferentialHistory } from '@/lib/hooks/useScoreDifferentialHistory';
import { useRoundStats } from '@/lib/hooks/useRoundStats';
import { ScoreDifferentialChart } from '@/components/dashboard/ScoreDifferentialChart';
import { FairwayDistributionChart } from '@/components/dashboard/FairwayDistributionChart';
import { GirDonutChart } from '@/components/dashboard/GirDonutChart';
import { ScoringByParChart } from '@/components/dashboard/ScoringByParChart';
import { ScoringCategoryBreakdown } from '@/components/dashboard/ScoringCategoryBreakdown';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';

export default function DashboardScreen() {
  const { handicap, fullName, loading, refetch } = useProfile();
  const { rounds: differentialRounds, loading: differentialLoading, refetch: refetchDifferentials } =
    useScoreDifferentialHistory();
  const { stats, loading: statsLoading, refetch: refetchStats } = useRoundStats();

  // Refetch every time this tab regains focus (e.g. after finishing a round
  // updates the handicap) so it doesn't require an app restart to catch up.
  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchDifferentials();
      refetchStats();
    }, [refetch, refetchDifferentials, refetchStats])
  );

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerClassName="items-center px-4 pt-8"
    >
      <View className="w-full flex-row items-center justify-between" testID="dashboard-header">
        <View className="flex-row items-center">
          <Avatar testID="dashboard-avatar" name={fullName} />
          <Text
            testID="dashboard-user-name"
            className="ml-3 text-lg font-semibold text-text-primary dark:text-text-primary-dark"
          >
            {fullName ?? 'Golfer'}
          </Text>
        </View>
        <View className="items-end" testID="handicap-card">
          <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">Handicap</Text>
          {loading ? (
            <ActivityIndicator testID="handicap-loading" />
          ) : (
            <Text
              className="text-2xl font-bold text-text-primary dark:text-text-primary-dark"
              testID="handicap-value"
            >
              {handicap != null ? handicap.toFixed(1) : '—'}
            </Text>
          )}
        </View>
      </View>

      <Card className="mt-6 w-full px-2 py-4" testID="differential-chart-card">
        {differentialLoading ? (
          <ActivityIndicator testID="differential-chart-loading" />
        ) : (
          <ScoreDifferentialChart rounds={differentialRounds} />
        )}
      </Card>

      <View className="mt-6 w-full flex-row">
        <Card className="mr-2 flex-1 px-4 py-4" testID="fairway-distribution-card">
          {statsLoading ? (
            <ActivityIndicator testID="fairway-distribution-loading" />
          ) : (
            <FairwayDistributionChart
              distribution={stats?.fairwayDistribution ?? { leftPct: 0, hitPct: 0, rightPct: 0, naPct: 0 }}
            />
          )}
        </Card>

        <Card className="ml-2 flex-1 items-center px-4 py-4" testID="gir-donut-card">
          {statsLoading ? (
            <ActivityIndicator testID="gir-donut-loading" />
          ) : (
            <GirDonutChart percentage={stats?.girPercentage ?? 0} />
          )}
        </Card>
      </View>

      <View className="mt-4 w-full flex-row">
        <Card className="mr-2 flex-1 items-center px-4 py-4" testID="average-score-card">
          <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">Avg. 18-hole score</Text>
          {statsLoading ? (
            <ActivityIndicator testID="average-score-loading" />
          ) : (
            <>
              <Text
                testID="dashboard-average-score"
                className="text-2xl font-bold text-text-primary dark:text-text-primary-dark"
              >
                {stats?.averageScore != null ? stats.averageScore.toFixed(1) : '—'}
              </Text>
              <ScoringCategoryBreakdown
                averages={
                  stats?.scoringCategoryAverages ?? {
                    eagle: 0,
                    birdie: 0,
                    par: 0,
                    bogey: 0,
                    double: 0,
                    doubleOrWorse: 0,
                  }
                }
              />
            </>
          )}
        </Card>

        <Card className="ml-2 flex-1 px-4 py-4" testID="scoring-by-par-card">
          {statsLoading ? (
            <ActivityIndicator testID="scoring-by-par-loading" />
          ) : (
            <ScoringByParChart scoreByPar={stats?.scoreByPar ?? { par3: null, par4: null, par5: null }} />
          )}
        </Card>
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Run the existing Dashboard tests to confirm no regressions**

Run: `npx jest "app/(tabs)/__tests__/index.test.tsx"`
Expected: PASS (8 existing tests, unchanged — testIDs are preserved, only surrounding classes/wrapper components changed)

- [ ] **Step 3: Add theming assertions to the Dashboard test file**

Add this new `describe` block to the end of `app/(tabs)/__tests__/index.test.tsx` (after the existing `describe('DashboardScreen', ...)` block's closing `});`, so it becomes a sibling top-level block in the same file):

```tsx
describe('DashboardScreen theming', () => {
  const refetch = jest.fn();
  const refetchDifferentials = jest.fn();
  const refetchStats = jest.fn();

  beforeEach(() => {
    refetch.mockClear();
    refetchDifferentials.mockClear();
    refetchStats.mockClear();
    (useProfile as jest.Mock).mockReturnValue({ handicap: 12.4, fullName: 'Jane Golfer', loading: false, refetch });
    (useScoreDifferentialHistory as jest.Mock).mockReturnValue({
      rounds: [],
      loading: false,
      refetch: refetchDifferentials,
    });
    (useRoundStats as jest.Mock).mockReturnValue({
      stats: {
        averageScore: 91.5,
        fairwayDistribution: { leftPct: 20, hitPct: 60, rightPct: 20, naPct: 10 },
        girPercentage: 35,
        scoreByPar: { par3: 3.5, par4: 4.8, par5: 5.2 },
        scoringCategoryAverages: { eagle: 0.1, birdie: 1.2, par: 8.5, bogey: 5.4, double: 2.1, doubleOrWorse: 0.7 },
      },
      loading: false,
      refetch: refetchStats,
    });
  });

  it('themes the root scroll view with the background token', () => {
    const { toJSON } = render(<DashboardScreen />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('bg-background');
    expect(tree).toContain('dark:bg-background-dark');
  });

  it('wraps the differential chart card in the themed Card component', () => {
    render(<DashboardScreen />);
    expect(screen.getByTestId('differential-chart-card').props.className).toEqual(
      expect.stringContaining('rounded-2xl')
    );
    expect(screen.getByTestId('differential-chart-card').props.className).toEqual(
      expect.stringContaining('bg-surface')
    );
  });
});
```

- [ ] **Step 4: Run the test file to verify it passes**

Run: `npx jest "app/(tabs)/__tests__/index.test.tsx"`
Expected: PASS (10 tests total: 8 existing + 2 new)

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/index.tsx" "app/(tabs)/__tests__/index.test.tsx"
git commit -m "feat: retheme Dashboard screen with Card and semantic tokens"
```

---

### Task 2: Retheme the Score Differential chart

**Files:**
- Modify: `components/dashboard/ScoreDifferentialChart.tsx`
- Modify: `components/dashboard/__tests__/ScoreDifferentialChart.test.tsx`

**Interfaces:**
- Consumes: `Card` from `@/components/ui/Card` (existing, unchanged).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Replace the file contents**

Replace the full contents of `components/dashboard/ScoreDifferentialChart.tsx`:

```tsx
import { Fragment, useState } from 'react';
import { View, Text, type LayoutChangeEvent } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { DIFFERENTIAL_HISTORY_LIMIT, type DifferentialRound } from '@/lib/differential';
import { countedRoundIds } from '@/lib/calculations';
import { Card } from '@/components/ui/Card';

interface ScoreDifferentialChartProps {
  rounds: DifferentialRound[];
}

const PLOT_HEIGHT = 160;
const DATE_LABEL_HEIGHT = 40;
const AXIS_LABEL_WIDTH = 34;
const BAR_GAP = 6;
const GRID_STEP = 2;
const TOOLTIP_WIDTH = 160;
const COUNTED_COLOR = '#3B82F6';
const NORMAL_COLOR = '#1F2937';

function formatShortDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${month}/${day}`;
}

function formatDiff(n: number): string {
  return n.toFixed(1);
}

export function ScoreDifferentialChart({ rounds }: ScoreDifferentialChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [width, setWidth] = useState(0);

  if (rounds.length === 0) {
    return (
      <Card testID="differential-chart-empty" className="items-center px-4 py-8">
        <Text className="text-center text-sm text-text-secondary dark:text-text-secondary-dark">
          No completed rounds yet. Finish a round to start tracking your score differential.
        </Text>
      </Card>
    );
  }

  const countedIds = countedRoundIds(rounds);
  const values = rounds.map((r) => r.score_differential);
  const rawMax = Math.max(...values, 0);
  const axisMax = Math.max(GRID_STEP, Math.ceil((rawMax + GRID_STEP) / GRID_STEP) * GRID_STEP);
  const gridLines = Array.from({ length: axisMax / GRID_STEP + 1 }, (_, i) => i * GRID_STEP);

  const plotWidth = Math.max(width - AXIS_LABEL_WIDTH, 0);
  const barWidth = plotWidth > 0 ? plotWidth / rounds.length - BAR_GAP : 0;
  const selected = selectedIndex !== null ? rounds[selectedIndex] : null;

  const selectedCenterX =
    selectedIndex !== null ? AXIS_LABEL_WIDTH + selectedIndex * (barWidth + BAR_GAP) + barWidth / 2 : 0;
  const tooltipLeft = Math.min(
    Math.max(selectedCenterX - TOOLTIP_WIDTH / 2, 0),
    Math.max(width - TOOLTIP_WIDTH, 0)
  );

  function handleLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  function toggleSelected(i: number) {
    setSelectedIndex((prev) => (prev === i ? null : i));
  }

  return (
    <View testID="differential-chart">
      <View className="mb-1 flex-row items-baseline justify-between">
        <Text className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
          Score Differential
        </Text>
        {rounds.length < DIFFERENTIAL_HISTORY_LIMIT && (
          <Text
            testID="differential-chart-fallback-note"
            className="text-xs text-text-secondary dark:text-text-secondary-dark"
          >
            Last {rounds.length} round{rounds.length === 1 ? '' : 's'}
          </Text>
        )}
      </View>

      <View style={{ position: 'relative' }}>
        {selected && (
          <Card
            testID="differential-chart-detail"
            className="px-3 py-2"
            style={{ position: 'absolute', top: 0, left: tooltipLeft, width: TOOLTIP_WIDTH, zIndex: 10 }}
          >
            <Text
              testID="differential-detail-date"
              className="text-xs font-semibold text-text-primary dark:text-text-primary-dark"
            >
              {selected.date_played}
            </Text>
            <Text
              testID="differential-detail-course"
              className="text-xs text-text-secondary dark:text-text-secondary-dark"
            >
              {selected.courseName}
            </Text>
            <Text
              testID="differential-detail-score"
              className="text-xs text-text-secondary dark:text-text-secondary-dark"
            >
              Score: {selected.totalScore}
            </Text>
            <Text
              testID="differential-detail-hcp"
              className="text-xs text-text-secondary dark:text-text-secondary-dark"
            >
              HCP:{' '}
              {selected.handicapAtTime !== null && selected.handicapAtTime !== undefined
                ? formatDiff(selected.handicapAtTime)
                : '—'}
            </Text>
            <Text
              testID="differential-detail-differential"
              className="text-xs text-text-secondary dark:text-text-secondary-dark"
            >
              Differential: {formatDiff(selected.score_differential)}
            </Text>
          </Card>
        )}

        <View
          testID="differential-chart-svg-container"
          onLayout={handleLayout}
          style={{ height: PLOT_HEIGHT + DATE_LABEL_HEIGHT }}
        >
          {width > 0 && (
            <Svg width={width} height={PLOT_HEIGHT + DATE_LABEL_HEIGHT}>
            {gridLines.map((g) => {
              const y = PLOT_HEIGHT - (g / axisMax) * PLOT_HEIGHT;
              return (
                <Fragment key={`grid-${g}`}>
                  <Line
                    x1={AXIS_LABEL_WIDTH}
                    y1={y}
                    x2={width}
                    y2={y}
                    stroke="#D1D5DB"
                    strokeWidth={1}
                    strokeDasharray="2,3"
                  />
                  <SvgText
                    x={AXIS_LABEL_WIDTH - 6}
                    y={y + 3}
                    fontSize={9}
                    fill="#6B7280"
                    textAnchor="end"
                  >
                    {formatDiff(g)}
                  </SvgText>
                </Fragment>
              );
            })}

            {rounds.map((r, i) => {
              const isCounted = countedIds.has(r.id);
              const isSelected = i === selectedIndex;
              const color = isCounted ? COUNTED_COLOR : NORMAL_COLOR;
              const barHeight = (Math.max(r.score_differential, 0) / axisMax) * PLOT_HEIGHT;
              const x = AXIS_LABEL_WIDTH + i * (barWidth + BAR_GAP);
              const y = PLOT_HEIGHT - barHeight;
              const centerX = x + barWidth / 2;

              return (
                <Fragment key={r.id}>
                  <Rect
                    testID={`differential-bar-${i}`}
                    x={x}
                    y={y}
                    width={Math.max(barWidth, 1)}
                    height={Math.max(barHeight, 1)}
                    rx={2}
                    fill={color}
                    stroke={isSelected ? '#111827' : 'none'}
                    strokeWidth={isSelected ? 1.5 : 0}
                    onPress={() => toggleSelected(i)}
                  />
                  <SvgText
                    testID={`differential-bar-value-${i}`}
                    x={centerX}
                    y={Math.max(y - 4, 9)}
                    fontSize={9}
                    fontWeight="bold"
                    fill={color}
                    textAnchor="middle"
                    onPress={() => toggleSelected(i)}
                  >
                    {formatDiff(r.score_differential)}
                  </SvgText>
                  <SvgText
                    testID={`differential-label-${i}`}
                    x={centerX}
                    y={PLOT_HEIGHT + 14}
                    fontSize={9}
                    fill={color}
                    textAnchor="end"
                    transform={`rotate(-40 ${centerX} ${PLOT_HEIGHT + 14})`}
                    onPress={() => toggleSelected(i)}
                  >
                    {formatShortDate(r.date_played)}
                  </SvgText>
                </Fragment>
              );
            })}
          </Svg>
          )}
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Run the existing chart tests to confirm no regressions**

Run: `npx jest components/dashboard/__tests__/ScoreDifferentialChart.test.tsx`
Expected: PASS (all existing tests unchanged — testIDs preserved)

- [ ] **Step 3: Add a theming assertion**

Read `components/dashboard/__tests__/ScoreDifferentialChart.test.tsx` first to see its existing imports and a sample round fixture shape (it already renders with real `rounds` data for its non-empty-state tests). Add this test to the end of its existing `describe` block:

```tsx
  it('themes the empty state with the Card component', () => {
    const { toJSON } = render(<ScoreDifferentialChart rounds={[]} />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('bg-surface');
    expect(tree).toContain('rounded-2xl');
  });
```

- [ ] **Step 4: Run the test file to verify it passes**

Run: `npx jest components/dashboard/__tests__/ScoreDifferentialChart.test.tsx`
Expected: PASS (all existing tests + 1 new)

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/ScoreDifferentialChart.tsx components/dashboard/__tests__/ScoreDifferentialChart.test.tsx
git commit -m "feat: retheme Score Differential chart chrome with Card and semantic tokens"
```

---

### Task 3: Retheme the four smaller chart components

**Files:**
- Modify: `components/dashboard/FairwayDistributionChart.tsx`
- Modify: `components/dashboard/__tests__/FairwayDistributionChart.test.tsx`
- Modify: `components/dashboard/GirDonutChart.tsx`
- Modify: `components/dashboard/__tests__/GirDonutChart.test.tsx`
- Modify: `components/dashboard/ScoringByParChart.tsx`
- Modify: `components/dashboard/__tests__/ScoringByParChart.test.tsx`
- Modify: `components/dashboard/ScoringCategoryBreakdown.tsx`
- Modify: `components/dashboard/__tests__/ScoringCategoryBreakdown.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks (these are leaf components; no `Card` usage needed — they render inside the `Card` wrappers Task 1 already added in `app/(tabs)/index.tsx`).
- Produces: nothing consumed by later tasks.

These four components only need plain `Text`/`View` chrome retokenized — none needs `Card`. Data-encoding colors (segment fills, donut arc/track, bar fill) are explicitly out of scope (see Global Constraints) and are unchanged below.

- [ ] **Step 1: Replace `components/dashboard/FairwayDistributionChart.tsx`**

```tsx
import { View, Text } from 'react-native';

interface FairwayDistributionChartProps {
  distribution: { leftPct: number; hitPct: number; rightPct: number; naPct: number };
}

/** Horizontal stacked bar: % of fairways missed left, hit, missed right. */
export function FairwayDistributionChart({ distribution }: FairwayDistributionChartProps) {
  const { leftPct, hitPct, rightPct, naPct } = distribution;
  const hasData = leftPct + hitPct + rightPct > 0;

  return (
    <View testID="fairway-distribution-chart" className="flex-1">
      <Text className="mb-2 text-sm font-medium text-text-primary dark:text-text-primary-dark">Fairways Hit</Text>
      {hasData ? (
        <>
          <View className="h-12 w-full flex-row overflow-hidden rounded-full bg-gray-100">
            {leftPct > 0 && <View testID="fairway-segment-left" style={{ flex: leftPct }} className="bg-amber-500" />}
            {hitPct > 0 && <View testID="fairway-segment-hit" style={{ flex: hitPct }} className="bg-green-600" />}
            {rightPct > 0 && (
              <View testID="fairway-segment-right" style={{ flex: rightPct }} className="bg-amber-500" />
            )}
          </View>
          <View className="mt-2 flex-row justify-between">
            <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">
              Left {leftPct.toFixed(0)}%
            </Text>
            <Text className="text-xs font-semibold text-green-700">Hit {hitPct.toFixed(0)}%</Text>
            <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">
              Right {rightPct.toFixed(0)}%
            </Text>
          </View>
        </>
      ) : (
        <Text testID="fairway-distribution-empty" className="text-sm text-text-secondary dark:text-text-secondary-dark">
          No fairway data yet.
        </Text>
      )}
      <Text testID="fairway-na-stat" className="mt-2 text-xs text-text-secondary dark:text-text-secondary-dark">
        N/A {naPct.toFixed(0)}%
      </Text>
    </View>
  );
}
```

- [ ] **Step 2: Add a theming assertion to `components/dashboard/__tests__/FairwayDistributionChart.test.tsx`**

Add to the end of its existing `describe` block:

```tsx
  it('themes the title with the primary text token', () => {
    const { toJSON } = render(
      <FairwayDistributionChart distribution={{ leftPct: 20, hitPct: 60, rightPct: 20, naPct: 0 }} />
    );
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('text-text-primary');
    expect(tree).toContain('dark:text-text-primary-dark');
  });
```

- [ ] **Step 3: Replace `components/dashboard/GirDonutChart.tsx`**

```tsx
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface GirDonutChartProps {
  percentage: number;
  size?: number;
}

const STROKE_WIDTH = 14;
const TRACK_COLOR = '#E5E7EB';
const FILL_COLOR = '#15803D';

/** Donut chart of GIR% hit vs missed. */
export function GirDonutChart({ percentage, size = 140 }: GirDonutChartProps) {
  const radius = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, percentage)) / 100) * circumference;
  const center = size / 2;

  return (
    <View testID="gir-donut-chart" className="items-center">
      <Text className="mb-2 text-sm font-medium text-text-primary dark:text-text-primary-dark">
        Greens in Regulation
      </Text>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={center} cy={center} r={radius} stroke={TRACK_COLOR} strokeWidth={STROKE_WIDTH} fill="none" />
          <Circle
            testID="gir-donut-arc"
            cx={center}
            cy={center}
            r={radius}
            stroke={FILL_COLOR}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={`${filled} ${circumference - filled}`}
            strokeLinecap="round"
            rotation={-90}
            origin={`${center}, ${center}`}
          />
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Text testID="gir-donut-value" className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">
            {`${percentage.toFixed(0)}%`}
          </Text>
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Add a theming assertion to `components/dashboard/__tests__/GirDonutChart.test.tsx`**

Add to the end of its existing `describe` block:

```tsx
  it('themes the value text with the primary text token', () => {
    const { toJSON } = render(<GirDonutChart percentage={42} />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('text-text-primary');
    expect(tree).toContain('dark:text-text-primary-dark');
  });
```

- [ ] **Step 5: Replace `components/dashboard/ScoringByParChart.tsx`**

```tsx
import { View, Text } from 'react-native';

interface ScoringByParChartProps {
  scoreByPar: { par3: number | null; par4: number | null; par5: number | null };
}

const BAR_AREA_HEIGHT = 100;
const BAR_COLOR = '#1F2937';

const CATEGORIES: { key: 'par3' | 'par4' | 'par5'; label: string; par: number }[] = [
  { key: 'par3', label: 'Par 3', par: 3 },
  { key: 'par4', label: 'Par 4', par: 4 },
  { key: 'par5', label: 'Par 5', par: 5 },
];

/** Three-bar comparison of average score on Par 3s, 4s, and 5s. */
export function ScoringByParChart({ scoreByPar }: ScoringByParChartProps) {
  const values = CATEGORIES.map((c) => scoreByPar[c.key]).filter((v): v is number => v !== null);
  const hasData = values.length > 0;
  const maxValue = hasData ? Math.max(...values) : 0;

  return (
    <View testID="scoring-by-par-chart">
      <Text className="mb-2 text-sm font-medium text-text-primary dark:text-text-primary-dark">Scoring by Par</Text>
      {hasData ? (
        <View className="flex-row items-end justify-between" style={{ height: BAR_AREA_HEIGHT }}>
          {CATEGORIES.map((c) => {
            const value = scoreByPar[c.key];
            const barHeight = value !== null && maxValue > 0 ? (value / maxValue) * BAR_AREA_HEIGHT : 0;
            return (
              <View key={c.key} className="flex-1 items-center justify-end">
                {value !== null && (
                  <Text
                    testID={`scoring-by-par-value-${c.key}`}
                    className="mb-1 text-xs font-semibold text-text-primary dark:text-text-primary-dark"
                  >
                    {value.toFixed(1)}
                  </Text>
                )}
                <View
                  testID={`scoring-by-par-bar-${c.key}`}
                  className="w-8 rounded-t"
                  style={{ height: Math.max(barHeight, value !== null ? 2 : 0), backgroundColor: BAR_COLOR }}
                />
              </View>
            );
          })}
        </View>
      ) : (
        <Text testID="scoring-by-par-empty" className="text-sm text-text-secondary dark:text-text-secondary-dark">
          No scored holes yet.
        </Text>
      )}
      <View className="mt-1 flex-row justify-between">
        {CATEGORIES.map((c) => (
          <Text key={c.key} className="flex-1 text-center text-xs text-text-secondary dark:text-text-secondary-dark">
            {c.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
```

- [ ] **Step 6: Add a theming assertion to `components/dashboard/__tests__/ScoringByParChart.test.tsx`**

Add to the end of its existing `describe` block:

```tsx
  it('themes the title with the primary text token', () => {
    const { toJSON } = render(
      <ScoringByParChart scoreByPar={{ par3: 3.5, par4: 4.8, par5: 5.2 }} />
    );
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('text-text-primary');
    expect(tree).toContain('dark:text-text-primary-dark');
  });
```

- [ ] **Step 7: Replace `components/dashboard/ScoringCategoryBreakdown.tsx`**

```tsx
import { View, Text } from 'react-native';
import type { ScoringCategoryAverages } from '@/lib/calculations';

interface ScoringCategoryBreakdownProps {
  averages: ScoringCategoryAverages;
}

const CATEGORIES: { key: keyof ScoringCategoryAverages; label: string }[] = [
  { key: 'birdie', label: 'Birdie' },
  { key: 'par', label: 'Par' },
  { key: 'bogey', label: 'Bogey' },
  { key: 'double', label: 'Double' },
  { key: 'doubleOrWorse', label: 'Double+' },
];

/** Average holes per round landing in each scoring bucket, e.g. "Birdie 1.2". */
export function ScoringCategoryBreakdown({ averages }: ScoringCategoryBreakdownProps) {
  return (
    <View
      testID="scoring-category-breakdown"
      className="mt-3 w-full border-t border-gray-200 pt-2 dark:border-border-dark"
    >
      {CATEGORIES.map((c) => (
        <View key={c.key} className="flex-row justify-between py-0.5">
          <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">{c.label}</Text>
          <Text
            testID={`scoring-category-${c.key}`}
            className="text-xs font-medium text-text-primary dark:text-text-primary-dark"
          >
            {averages[c.key].toFixed(1)}
          </Text>
        </View>
      ))}
    </View>
  );
}
```

- [ ] **Step 8: Add a theming assertion to `components/dashboard/__tests__/ScoringCategoryBreakdown.test.tsx`**

Add to the end of its existing `describe` block:

```tsx
  it('themes the border and value text with semantic tokens', () => {
    const { toJSON } = render(
      <ScoringCategoryBreakdown
        averages={{ eagle: 0, birdie: 1.2, par: 8.5, bogey: 5.4, double: 2.1, doubleOrWorse: 0.7 }}
      />
    );
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('dark:border-border-dark');
    expect(tree).toContain('text-text-primary');
  });
```

- [ ] **Step 9: Run all four chart test files to verify they pass**

Run: `npx jest components/dashboard/__tests__/FairwayDistributionChart.test.tsx components/dashboard/__tests__/GirDonutChart.test.tsx components/dashboard/__tests__/ScoringByParChart.test.tsx components/dashboard/__tests__/ScoringCategoryBreakdown.test.tsx`
Expected: PASS (all existing tests in each file + 1 new theming test per file = 4 new tests total)

- [ ] **Step 10: Commit**

```bash
git add components/dashboard/FairwayDistributionChart.tsx components/dashboard/__tests__/FairwayDistributionChart.test.tsx components/dashboard/GirDonutChart.tsx components/dashboard/__tests__/GirDonutChart.test.tsx components/dashboard/ScoringByParChart.tsx components/dashboard/__tests__/ScoringByParChart.test.tsx components/dashboard/ScoringCategoryBreakdown.tsx components/dashboard/__tests__/ScoringCategoryBreakdown.test.tsx
git commit -m "feat: retheme remaining dashboard chart chrome with semantic tokens"
```

---

### Task 4: Full-suite regression check

**Files:** none modified — verification-only task.

**Interfaces:** none.

- [ ] **Step 1: Run the full test suite**

Run: `npx jest`
Expected: PASS — the pre-Phase-2b baseline was 31 suites / 165 tests; this plan adds 2 tests in Task 1, 1 test in Task 2, and 4 tests in Task 3 (one per file), for an expected total of **31 suites / 172 tests**, all passing.

- [ ] **Step 2: If any test fails, stop and report**

Do not proceed past this task if the count doesn't match or any test fails — investigate and fix before considering Phase 2b complete. (No commit for this task — it is a checkpoint, not a change.)

---

## Self-Review Notes

- **Spec coverage:** Dashboard screen retheme + Card adoption (Task 1) covers the 2b design spec's `app/(tabs)/index.tsx` bullet. The 5 chart components (Tasks 2-3) cover the spec's "wrap each chart's outer container in Card; retokenize surrounding text; leave chart fill/stroke colors untouched" bullet — `ScoreDifferentialChart` gets `Card` (it has two container-shaped elements: the empty state and the tooltip); the other four don't need `Card` since they render as chart *content* inside Task 1's `Card` wrappers, not as their own top-level cards.
- **Placeholder scan:** none found — every step has complete code and exact commands.
- **Type consistency:** No new exported functions/types are introduced in this plan (unlike Phase 2a) — all changes are in-place className edits to existing components, so there's no producer/consumer signature to drift.
- **Testability:** Every touched component already renders via plain `render()` (no `Tabs`/`Stack` involved, unlike Phase 2a) — full RNTL rendering and `toJSON()`-based class assertions work normally here, so every task gets real test coverage (not the Phase 2a carve-out).
- **Scope check confirmed against non-goals:** re-verified against the Phase 2 design spec that in-SVG fill/stroke colors and the fairway chart's data-semantic green/amber colors are excluded — none of the code blocks above touch `COUNTED_COLOR`, `NORMAL_COLOR`, grid-line/axis-label SVG colors, `TRACK_COLOR`, `FILL_COLOR`, `BAR_COLOR`, `bg-amber-500`, `bg-green-600`, `bg-gray-100` (fairway track), or `text-green-700` (the "Hit" label).

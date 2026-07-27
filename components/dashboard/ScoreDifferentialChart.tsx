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

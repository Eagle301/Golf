import { Fragment, useState } from 'react';
import { View, Text, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { Card } from '@/components/ui/Card';
import type { DrillProgress } from '@/lib/hooks/useDrillProgress';

interface DrillProgressChartProps {
  drill: DrillProgress;
}

const PLOT_HEIGHT = 120;
const DATE_LABEL_HEIGHT = 36;
const AXIS_PADDING_X = 16;
const LINE_COLOR = '#3B82F6';
const TARGET_COLOR = '#16A34A';

function formatShortDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${month}/${day}`;
}

/**
 * One drill's logged values over its sessions as a line chart, with a dashed
 * line at the drill's target value so drift toward (or away from) the goal
 * is visible at a glance.
 */
export function DrillProgressChart({ drill }: DrillProgressChartProps) {
  const [width, setWidth] = useState(0);
  const { drillId, name, targetValue, points } = drill;

  function handleLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  const latest = points.length > 0 ? points[points.length - 1].value : null;

  const values = points.map((p) => p.value);
  const allValues = targetValue !== null ? [...values, targetValue] : values;
  const rawMax = Math.max(...allValues, 0);
  const rawMin = Math.min(...allValues, 0);
  const span = Math.max(rawMax - rawMin, 1);

  const plotWidth = Math.max(width - AXIS_PADDING_X * 2, 0);
  const xFor = (i: number) =>
    AXIS_PADDING_X + (points.length === 1 ? plotWidth / 2 : (i / (points.length - 1)) * plotWidth);
  // 12px headroom top and bottom so dots and value labels aren't clipped.
  const yFor = (value: number) => 12 + (1 - (value - rawMin) / span) * (PLOT_HEIGHT - 24);

  return (
    <Card className="mb-3 px-4 py-3" testID={`drill-chart-${drillId}`}>
      <View className="mb-1 flex-row items-baseline justify-between">
        <Text
          testID={`drill-chart-name-${drillId}`}
          className="flex-1 text-sm font-medium text-text-primary dark:text-text-primary-dark"
        >
          {name}
        </Text>
        <View className="flex-row items-baseline">
          {targetValue !== null && (
            <Text
              testID={`drill-chart-target-${drillId}`}
              className="mr-3 text-xs text-text-secondary dark:text-text-secondary-dark"
            >
              Target {targetValue}
            </Text>
          )}
          {latest !== null && (
            <Text
              testID={`drill-chart-latest-${drillId}`}
              className="text-xs font-semibold text-text-primary dark:text-text-primary-dark"
            >
              Latest {latest}
            </Text>
          )}
        </View>
      </View>

      {points.length === 0 ? (
        <Text
          testID={`drill-chart-empty-${drillId}`}
          className="py-4 text-center text-xs text-text-secondary dark:text-text-secondary-dark"
        >
          No values logged yet.
        </Text>
      ) : (
        <View testID={`drill-chart-svg-${drillId}`} onLayout={handleLayout} style={{ height: PLOT_HEIGHT + DATE_LABEL_HEIGHT }}>
          {width > 0 && (
            <Svg width={width} height={PLOT_HEIGHT + DATE_LABEL_HEIGHT}>
              {targetValue !== null && (
                <Line
                  testID={`drill-target-line-${drillId}`}
                  x1={0}
                  y1={yFor(targetValue)}
                  x2={width}
                  y2={yFor(targetValue)}
                  stroke={TARGET_COLOR}
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
              )}

              {points.length > 1 && (
                <Polyline
                  points={points.map((p, i) => `${xFor(i)},${yFor(p.value)}`).join(' ')}
                  fill="none"
                  stroke={LINE_COLOR}
                  strokeWidth={2}
                />
              )}

              {points.map((p, i) => (
                <Fragment key={p.sessionId}>
                  <Circle
                    testID={`drill-point-${drillId}-${i}`}
                    cx={xFor(i)}
                    cy={yFor(p.value)}
                    r={4}
                    fill={LINE_COLOR}
                  />
                  <SvgText
                    testID={`drill-point-value-${drillId}-${i}`}
                    x={xFor(i)}
                    y={yFor(p.value) - 8}
                    fontSize={9}
                    fontWeight="bold"
                    fill={LINE_COLOR}
                    textAnchor="middle"
                  >
                    {String(p.value)}
                  </SvgText>
                  <SvgText
                    testID={`drill-date-${drillId}-${i}`}
                    x={xFor(i)}
                    y={PLOT_HEIGHT + 14}
                    fontSize={9}
                    fill="#6B7280"
                    textAnchor="end"
                    transform={`rotate(-40 ${xFor(i)} ${PLOT_HEIGHT + 14})`}
                  >
                    {formatShortDate(p.date)}
                  </SvgText>
                </Fragment>
              ))}
            </Svg>
          )}
        </View>
      )}
    </Card>
  );
}

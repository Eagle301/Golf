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

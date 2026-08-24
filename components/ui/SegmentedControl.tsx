import { View, Text, Pressable } from 'react-native';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Each segment gets `${testIDPrefix}-${option.value}`. */
  testIDPrefix: string;
}

/**
 * One-of-N picker rendered as a single joined control rather than loose
 * pills, so a set of mutually exclusive choices reads as one decision.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  testIDPrefix,
}: SegmentedControlProps<T>) {
  return (
    <View className="flex-row rounded-xl bg-gray-100 p-1 dark:bg-background-dark">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={`${testIDPrefix}-${option.value}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={`flex-1 items-center rounded-lg py-2 ${
              selected ? 'bg-brand dark:bg-accent-gold-dark' : ''
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                selected ? 'text-white dark:text-gray-900' : 'text-text-secondary dark:text-text-secondary-dark'
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

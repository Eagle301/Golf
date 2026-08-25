import { View, Text, TextInput, Pressable } from 'react-native';

interface StepperInputProps {
  /** The raw text value - kept as a string so partial input like "7." survives. */
  value: string;
  onChange: (text: string) => void;
  testID: string;
}

function currentNumber(value: string): number {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Steps keep any decimal part intact (7.5 -> 8.5) without float noise. */
function step(value: string, delta: number): number {
  return Math.round((currentNumber(value) + delta) * 1000) / 1000;
}

/**
 * Big-tap-target numeric entry for logging drill results mid-practice: - and
 * + step by one, and tapping the number still allows typing exact or decimal
 * values. Never steps below zero.
 */
export function StepperInput({ value, onChange, testID }: StepperInputProps) {
  const atZero = currentNumber(value) <= 0;

  return (
    <View className="flex-row items-center">
      <Pressable
        testID={`${testID}-decrement`}
        onPress={() => {
          if (!atZero) onChange(String(Math.max(0, step(value, -1))));
        }}
        disabled={atZero}
        hitSlop={6}
        className={`h-11 w-11 items-center justify-center rounded-full border ${
          atZero ? 'border-gray-200 dark:border-gray-700' : 'border-gray-300 dark:border-border-dark'
        }`}
      >
        <Text
          className={`text-2xl leading-7 ${
            atZero ? 'text-gray-300 dark:text-gray-700' : 'text-text-primary dark:text-text-primary-dark'
          }`}
        >
          −
        </Text>
      </Pressable>

      {/* w-24 is load-bearing on web: a TextInput becomes an <input>, which
          claims the browser's default 20-character intrinsic width - about
          400px at this font size - and min-width alone never reins it in.
          That pushed the - and + buttons off both edges of a phone screen. */}
      <TextInput
        testID={`${testID}-value`}
        className="mx-1 w-24 min-w-[56px] py-1 text-center text-3xl font-bold text-text-primary dark:text-text-primary-dark"
        keyboardType="numeric"
        placeholder="0"
        value={value}
        onChangeText={onChange}
      />

      <Pressable
        testID={`${testID}-increment`}
        onPress={() => onChange(String(step(value, 1)))}
        hitSlop={6}
        className="h-11 w-11 items-center justify-center rounded-full bg-brand dark:bg-accent-gold-dark"
      >
        <Text className="text-2xl leading-7 text-white dark:text-gray-900">+</Text>
      </Pressable>
    </View>
  );
}

import { Text, View, Pressable, type PressableProps } from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'link';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  testID?: string;
  /** Extra classes for the button's container (e.g. flex-1, margins). */
  containerClassName?: string;
}

const CONTAINER: Record<ButtonVariant, string> = {
  primary: 'rounded-full bg-brand py-3 dark:bg-accent-gold-dark',
  secondary: 'rounded-full border border-brand bg-transparent py-3 dark:border-text-primary-dark',
  destructive: 'rounded-full border border-red-600 py-3',
  link: 'py-2',
};

const CONTAINER_DISABLED: Record<ButtonVariant, string> = {
  primary: 'rounded-full bg-gray-300 py-3 dark:bg-gray-700',
  secondary: 'rounded-full border border-gray-300 bg-transparent py-3 dark:border-gray-700',
  destructive: 'rounded-full border border-gray-300 py-3 dark:border-gray-700',
  link: 'py-2',
};

const TEXT: Record<ButtonVariant, string> = {
  primary: 'font-medium text-white dark:text-gray-900',
  secondary: 'font-medium text-brand dark:text-text-primary-dark',
  destructive: 'font-medium text-red-600',
  link: 'font-medium text-brand dark:text-accent-gold-dark',
};

const TEXT_DISABLED: Record<ButtonVariant, string> = {
  primary: 'font-medium text-white dark:text-gray-500',
  secondary: 'font-medium text-gray-400',
  destructive: 'font-medium text-gray-400',
  link: 'font-medium text-gray-400',
};

/**
 * Shared navigation/action button. Standardizes padding, radius, and
 * pressed/disabled states across the app instead of every screen
 * hand-rolling its own Pressable + Text combination.
 */
export function Button({
  label,
  variant = 'primary',
  disabled,
  containerClassName,
  testID,
  ...pressableProps
}: ButtonProps) {
  const container = disabled ? CONTAINER_DISABLED[variant] : CONTAINER[variant];
  const text = disabled ? TEXT_DISABLED[variant] : TEXT[variant];

  return (
    // containerClassName (e.g. flex-1, margins) has to live on the Pressable
    // itself - it's the Pressable that's laid out by the parent flex row, so
    // putting flex-1 only on the inner View left it sized to its content and
    // the buttons never actually shared the row width.
    <Pressable testID={testID} disabled={disabled} className={containerClassName} {...pressableProps}>
      {({ pressed }) => (
        <View className={`w-full items-center ${container} ${pressed && !disabled ? 'opacity-60' : ''}`}>
          <Text className={text}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

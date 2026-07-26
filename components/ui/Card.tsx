import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  className?: string;
}

/** Themed container: soft surface + shadow in light mode, bordered surface in dark mode. */
export function Card({ className = '', children, ...viewProps }: CardProps) {
  return (
    <View
      className={`rounded-2xl bg-surface p-4 shadow-sm dark:border dark:border-border dark:bg-surface-dark dark:shadow-none ${className}`}
      {...viewProps}
    >
      {children}
    </View>
  );
}

import { View, Text } from 'react-native';

interface AvatarProps {
  name: string | null;
  size?: number;
  testID?: string;
}

function initialsFrom(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** Circular initials placeholder, used until profile photo upload exists. */
export function Avatar({ name, size = 48, testID }: AvatarProps) {
  return (
    <View
      testID={testID}
      className="items-center justify-center rounded-full bg-brand"
      style={{ width: size, height: size }}
    >
      <Text className="font-semibold text-white" style={{ fontSize: size * 0.4 }}>
        {initialsFrom(name)}
      </Text>
    </View>
  );
}

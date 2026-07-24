import { View, Text, ActivityIndicator } from 'react-native';
import { useProfile } from '@/lib/hooks/useProfile';

export default function DashboardScreen() {
  const { handicap, loading } = useProfile();

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-semibold">Dashboard</Text>
      <View className="mt-6 items-center rounded-lg bg-gray-100 px-8 py-6" testID="handicap-card">
        <Text className="text-sm font-medium text-gray-500">Handicap</Text>
        {loading ? (
          <ActivityIndicator testID="handicap-loading" />
        ) : (
          <Text className="text-3xl font-bold" testID="handicap-value">
            {handicap != null ? handicap.toFixed(1) : '—'}
          </Text>
        )}
      </View>
    </View>
  );
}

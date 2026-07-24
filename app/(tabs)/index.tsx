import { useCallback } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useProfile } from '@/lib/hooks/useProfile';

export default function DashboardScreen() {
  const { handicap, loading, refetch } = useProfile();

  // Refetch every time this tab regains focus (e.g. after finishing a round
  // updates the handicap) so it doesn't require an app restart to catch up.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

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

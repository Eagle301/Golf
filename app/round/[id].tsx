import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function RoundDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-semibold">Live Round Tracking</Text>
      <Text className="text-gray-500">Round ID: {id}</Text>
    </View>
  );
}

import { View, Text, TextInput, Pressable } from 'react-native';
import type { HoleInput } from '@/lib/hooks/useCourses';

interface HoleRowProps {
  hole: HoleInput;
  onChange: (hole: HoleInput) => void;
}

const PAR_OPTIONS: Array<3 | 4 | 5> = [3, 4, 5];

export function HoleRow({ hole, onChange }: HoleRowProps) {
  return (
    <View className="flex-row items-center justify-between border-b border-gray-200 py-3">
      <Text className="w-8 text-base font-medium">{hole.hole_number}</Text>
      <View className="flex-row">
        {PAR_OPTIONS.map((par) => (
          <Pressable
            key={par}
            testID={`par-${hole.hole_number}-${par}`}
            onPress={() => onChange({ ...hole, par })}
            className={`mx-1 h-9 w-9 items-center justify-center rounded-full ${
              hole.par === par ? 'bg-green-600' : 'bg-gray-200'
            }`}
          >
            <Text className={hole.par === par ? 'text-white' : 'text-gray-700'}>{par}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        testID={`length-${hole.hole_number}`}
        className="w-16 rounded border border-gray-300 px-2 py-1 text-right"
        keyboardType="number-pad"
        placeholder="m"
        value={hole.length_meters != null ? String(hole.length_meters) : ''}
        onChangeText={(text) => {
          const parsed = text === '' ? null : parseInt(text, 10);
          onChange({ ...hole, length_meters: Number.isNaN(parsed as number) ? null : parsed });
        }}
      />
      <TextInput
        testID={`stroke-index-${hole.hole_number}`}
        className="w-12 rounded border border-gray-300 px-2 py-1 text-right"
        keyboardType="number-pad"
        placeholder="SI"
        value={hole.stroke_index != null ? String(hole.stroke_index) : ''}
        onChangeText={(text) => {
          const parsed = text === '' ? null : parseInt(text, 10);
          onChange({ ...hole, stroke_index: Number.isNaN(parsed as number) ? null : parsed });
        }}
      />
    </View>
  );
}

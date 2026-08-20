import { View, Text, TextInput, Pressable } from 'react-native';
import type { TeeBoxInput } from '@/lib/hooks/useCourses';

interface TeeBoxCardProps {
  tee: TeeBoxInput;
  index: number;
  onChange: (tee: TeeBoxInput) => void;
  onRemove: () => void;
  removable: boolean;
}

export function TeeBoxCard({ tee, index, onChange, onRemove, removable }: TeeBoxCardProps) {
  function updateLength(holeIdx: number, text: string) {
    const parsed = text === '' ? null : parseInt(text, 10);
    const lengths = [...tee.lengths];
    lengths[holeIdx] = Number.isNaN(parsed as number) ? null : parsed;
    onChange({ ...tee, lengths });
  }

  return (
    <View className="mb-4 rounded-xl border border-gray-200 p-3 dark:border-border-dark dark:bg-surface-dark">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
          Tee box {index + 1}
        </Text>
        {removable && (
          <Pressable testID={`remove-tee-${index}`} onPress={onRemove}>
            <Text className="text-sm font-medium text-red-600">Remove</Text>
          </Pressable>
        )}
      </View>

      <Text className="mb-1 text-sm font-medium text-text-primary dark:text-text-primary-dark">Name</Text>
      <TextInput
        testID={`tee-name-${index}`}
        className="mb-3 rounded border border-gray-300 px-3 py-2 text-text-primary dark:border-border-dark dark:text-text-primary-dark"
        value={tee.name}
        onChangeText={(name) => onChange({ ...tee, name })}
        placeholder="e.g. Gulur"
      />

      <View className="mb-3 flex-row">
        <View className="mr-3 flex-1">
          <Text className="mb-1 text-sm font-medium text-text-primary dark:text-text-primary-dark">
            Course Rating
          </Text>
          <TextInput
            testID={`tee-cr-${index}`}
            className="rounded border border-gray-300 px-3 py-2 text-text-primary dark:border-border-dark dark:text-text-primary-dark"
            keyboardType="decimal-pad"
            value={tee.course_rating != null ? String(tee.course_rating) : ''}
            onChangeText={(text) => {
              const parsed = text.trim() === '' ? null : parseFloat(text);
              onChange({ ...tee, course_rating: Number.isNaN(parsed as number) ? null : parsed });
            }}
            placeholder="e.g. 70.9"
          />
        </View>
        <View className="flex-1">
          <Text className="mb-1 text-sm font-medium text-text-primary dark:text-text-primary-dark">
            Slope Rating
          </Text>
          <TextInput
            testID={`tee-slope-${index}`}
            className="rounded border border-gray-300 px-3 py-2 text-text-primary dark:border-border-dark dark:text-text-primary-dark"
            keyboardType="number-pad"
            value={tee.slope_rating != null ? String(tee.slope_rating) : ''}
            onChangeText={(text) => {
              const parsed = text.trim() === '' ? null : parseInt(text, 10);
              onChange({ ...tee, slope_rating: Number.isNaN(parsed as number) ? null : parsed });
            }}
            placeholder="e.g. 127"
          />
        </View>
      </View>

      <Text className="mb-1 text-sm font-medium text-text-primary dark:text-text-primary-dark">
        Hole lengths (m)
      </Text>
      {[tee.lengths.slice(0, 9), tee.lengths.slice(9)]
        .filter((row) => row.length > 0)
        .map((row, rowIdx) => (
          <View key={rowIdx} className="-mx-0.5 flex-row">
            {row.map((length, i) => {
              const holeIdx = rowIdx * 9 + i;
              return (
                <View key={holeIdx} className="mb-2 flex-1 px-0.5">
                  <Text className="text-center text-xs text-text-secondary dark:text-text-secondary-dark">
                    {holeIdx + 1}
                  </Text>
                  <TextInput
                    testID={`tee-length-${index}-${holeIdx + 1}`}
                    className="rounded border border-gray-300 px-0 py-1 text-center text-text-primary dark:border-border-dark dark:text-text-primary-dark"
                    keyboardType="number-pad"
                    value={length != null ? String(length) : ''}
                    onChangeText={(text) => updateLength(holeIdx, text)}
                  />
                </View>
              );
            })}
          </View>
        ))}
    </View>
  );
}

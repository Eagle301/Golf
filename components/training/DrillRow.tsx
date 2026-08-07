import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExpandablePhoto } from '@/components/ui/ExpandablePhoto';
import type { DrillInput } from '@/lib/hooks/useRoutines';
import type { PhotoSource } from '@/lib/training/drillPhotos';

interface DrillRowProps {
  drill: DrillInput;
  onChange: (drill: DrillInput) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  /** Picks a photo from the given source, uploads it, and resolves to its public URL - or null if the user cancelled. */
  onPickPhoto: (source: PhotoSource) => Promise<string | null>;
  testIDPrefix: string;
}

export function DrillRow({ drill, onChange, onRemove, onMoveUp, onMoveDown, onPickPhoto, testIDPrefix }: DrillRowProps) {
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  async function handlePickPhoto(source: PhotoSource) {
    setPhotoError(null);
    setUploading(true);
    try {
      const url = await onPickPhoto(source);
      if (url) {
        onChange({ ...drill, photo_url: url });
      }
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Failed to attach photo.');
    }
    setUploading(false);
  }

  return (
    <View
      testID={testIDPrefix}
      className="mb-3 rounded-xl border border-gray-200 p-3 dark:border-border-dark dark:bg-surface-dark"
    >
      <View className="flex-row items-center">
        <TextInput
          testID={`${testIDPrefix}-name`}
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-text-primary dark:border-border-dark dark:text-text-primary-dark"
          placeholder="Drill name"
          value={drill.name}
          onChangeText={(text) => onChange({ ...drill, name: text })}
        />
        <TextInput
          testID={`${testIDPrefix}-target`}
          className="ml-2 w-16 rounded border border-gray-300 px-2 py-1 text-right text-text-primary dark:border-border-dark dark:text-text-primary-dark"
          placeholder="Target"
          keyboardType="numeric"
          value={drill.target_value != null ? String(drill.target_value) : ''}
          onChangeText={(text) => {
            const parsed = text === '' ? null : parseFloat(text);
            onChange({ ...drill, target_value: Number.isNaN(parsed as number) ? null : parsed });
          }}
        />
      </View>

      <View className="mt-2 flex-row items-center">
        {drill.photo_url ? (
          <View className="mr-3">
            <ExpandablePhoto
              uri={drill.photo_url}
              className="h-14 w-14 rounded-lg"
              testID={`${testIDPrefix}-photo`}
              overlay={
                <Pressable
                  testID={`${testIDPrefix}-remove-photo`}
                  onPress={() => onChange({ ...drill, photo_url: null })}
                  className="absolute -right-2 -top-2 h-5 w-5 items-center justify-center rounded-full bg-gray-700"
                >
                  <Ionicons name="close" size={12} color="white" />
                </Pressable>
              }
            />
          </View>
        ) : uploading ? (
          <View className="mr-3 h-14 w-14 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
            <ActivityIndicator testID={`${testIDPrefix}-photo-loading`} size="small" />
          </View>
        ) : null}

        <Pressable
          testID={`${testIDPrefix}-take-photo`}
          onPress={() => handlePickPhoto('camera')}
          disabled={uploading}
          className="mr-2 flex-row items-center rounded-full border border-gray-300 px-3 py-1.5 dark:border-border-dark"
        >
          <Ionicons name="camera-outline" size={16} color="#4B5563" />
          <Text className="ml-1 text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
            Take Photo
          </Text>
        </Pressable>
        <Pressable
          testID={`${testIDPrefix}-choose-photo`}
          onPress={() => handlePickPhoto('library')}
          disabled={uploading}
          className="flex-row items-center rounded-full border border-gray-300 px-3 py-1.5 dark:border-border-dark"
        >
          <Ionicons name="image-outline" size={16} color="#4B5563" />
          <Text className="ml-1 text-xs font-medium text-text-secondary dark:text-text-secondary-dark">Choose</Text>
        </Pressable>

        <View className="ml-auto flex-row items-center">
          {onMoveUp && (
            <Pressable testID={`${testIDPrefix}-move-up`} onPress={onMoveUp} className="p-1" hitSlop={8}>
              <Ionicons name="arrow-up" size={18} color="#4B5563" />
            </Pressable>
          )}
          {onMoveDown && (
            <Pressable testID={`${testIDPrefix}-move-down`} onPress={onMoveDown} className="p-1" hitSlop={8}>
              <Ionicons name="arrow-down" size={18} color="#4B5563" />
            </Pressable>
          )}
          <Pressable testID={`${testIDPrefix}-remove`} onPress={onRemove} className="p-1" hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
          </Pressable>
        </View>
      </View>

      {photoError && (
        <Text testID={`${testIDPrefix}-photo-error`} className="mt-1 text-xs text-red-600">
          {photoError}
        </Text>
      )}
    </View>
  );
}

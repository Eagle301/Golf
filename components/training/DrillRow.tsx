import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExpandablePhoto } from '@/components/ui/ExpandablePhoto';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { DrillVideo } from '@/components/training/DrillVideo';
import { parseYouTubeUrl, buildYouTubeUrl, parseTimestamp, formatTimestamp } from '@/lib/training/youtube';
import type { DrillInput } from '@/lib/hooks/useRoutines';
import type { PhotoSource } from '@/lib/training/drillPhotos';
import type { DrillResultType } from '@/types/database';

const RESULT_TYPES: { value: DrillResultType; label: string }[] = [
  { value: 'check', label: 'Done ✓' },
  { value: 'target', label: 'Out of' },
  { value: 'count', label: 'Count' },
];

interface DrillRowProps {
  drill: DrillInput;
  onChange: (drill: DrillInput) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  /** Picks a photo from the given source, uploads it, and resolves to its public URL - or null if the user cancelled. */
  onPickPhoto: (source: PhotoSource) => Promise<string | null>;
  /** 1-based place in the routine, shown as the card's badge. */
  position: number;
  testIDPrefix: string;
}

/** Small circular icon button used for the card's reorder and delete actions. */
function IconButton({
  testID,
  icon,
  color = '#4B5563',
  onPress,
}: {
  testID: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      hitSlop={6}
      className="ml-1 h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-background dark:border-border-dark dark:bg-background-dark"
    >
      <Ionicons name={icon} size={16} color={color} />
    </Pressable>
  );
}

/** Ghost button that reveals a collapsed media control. */
function AddMediaButton({
  testID,
  icon,
  label,
  onPress,
}: {
  testID: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      className="mr-2 flex-row items-center rounded-full border border-dashed border-gray-300 px-3 py-2 dark:border-border-dark"
    >
      <Ionicons name={icon} size={14} color="#4B5563" />
      <Text className="ml-1.5 text-xs font-medium text-text-secondary dark:text-text-secondary-dark">{label}</Text>
    </Pressable>
  );
}

/**
 * One drill inside the routine editor, laid out like a numbered scorecard
 * row: position badge and reorder controls in the header, the name and how
 * it is scored in the body, and photo/video kept collapsed behind add
 * buttons until they are actually wanted - a drill needs neither, and always
 * showing both made the card a wall of controls.
 */
export function DrillRow({
  drill,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onPickPhoto,
  position,
  testIDPrefix,
}: DrillRowProps) {
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const video = drill.video_url ? parseYouTubeUrl(drill.video_url) : null;
  // Local so partial input like "1:2" survives while typing; the drill's URL
  // only picks the time up once it parses.
  const [startText, setStartText] = useState(video?.startSeconds != null ? formatTimestamp(video.startSeconds) : '');

  // Anything already attached stays open; an empty drill starts collapsed.
  const [photoOpen, setPhotoOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const showPhoto = photoOpen || drill.photo_url != null;
  const showVideo = videoOpen || drill.video_url != null;

  function handleVideoUrlChange(text: string) {
    const parsed = parseYouTubeUrl(text);
    setStartText(parsed?.startSeconds != null ? formatTimestamp(parsed.startSeconds) : '');
    onChange({ ...drill, video_url: text.trim() === '' ? null : text });
  }

  function handleStartChange(text: string) {
    setStartText(text);
    if (!video) return;
    const startSeconds = parseTimestamp(text);
    if (text.trim() !== '' && startSeconds === null) return;
    onChange({ ...drill, video_url: buildYouTubeUrl({ videoId: video.videoId, startSeconds }) });
  }

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
      className="mb-3 rounded-2xl bg-surface p-4 shadow-sm dark:border dark:border-border-dark dark:bg-surface-dark dark:shadow-none"
    >
      <View className="flex-row items-center">
        <View
          testID={`${testIDPrefix}-position`}
          className="h-7 w-7 items-center justify-center rounded-full bg-brand dark:bg-accent-gold-dark"
        >
          <Text className="text-xs font-bold text-white dark:text-gray-900">{position}</Text>
        </View>
        <View className="ml-auto flex-row items-center">
          {onMoveUp && <IconButton testID={`${testIDPrefix}-move-up`} icon="arrow-up" onPress={onMoveUp} />}
          {onMoveDown && <IconButton testID={`${testIDPrefix}-move-down`} icon="arrow-down" onPress={onMoveDown} />}
          <IconButton testID={`${testIDPrefix}-remove`} icon="trash-outline" color="#DC2626" onPress={onRemove} />
        </View>
      </View>

      <TextInput
        testID={`${testIDPrefix}-name`}
        className="mt-3 border-b border-gray-200 pb-2 text-base font-medium text-text-primary dark:border-border-dark dark:text-text-primary-dark"
        placeholder="Drill name"
        placeholderTextColor="#9CA3AF"
        value={drill.name}
        onChangeText={(text) => onChange({ ...drill, name: text })}
      />

      {/* How this drill is scored: done/not-done, count against a target, or a plain count. */}
      <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">
        Scoring
      </Text>
      <View className="mt-1.5 flex-row items-center">
        <View className="flex-1">
          <SegmentedControl
            options={RESULT_TYPES}
            value={drill.result_type}
            onChange={(type) =>
              onChange({ ...drill, result_type: type, target_value: type === 'target' ? drill.target_value : null })
            }
            testIDPrefix={`${testIDPrefix}-type`}
          />
        </View>
        {drill.result_type === 'target' && (
          <TextInput
            testID={`${testIDPrefix}-target`}
            className="ml-2 w-16 rounded-xl border border-gray-300 px-2 py-2 text-center text-base font-semibold text-text-primary dark:border-border-dark dark:text-text-primary-dark"
            placeholder="10"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            value={drill.target_value != null ? String(drill.target_value) : ''}
            onChangeText={(text) => {
              const parsed = text === '' ? null : parseFloat(text);
              onChange({ ...drill, target_value: Number.isNaN(parsed as number) ? null : parsed });
            }}
          />
        )}
      </View>

      {/* Reference material, collapsed until asked for. The keys keep the two
          buttons distinct instances - when one is revealed the other must not
          inherit its slot (see the css-interop upgrade-warning crash). */}
      <View className="mt-4 flex-row flex-wrap items-center">
        {!showPhoto && (
          <AddMediaButton
            key="add-photo"
            testID={`${testIDPrefix}-add-photo`}
            icon="camera-outline"
            label="Add photo"
            onPress={() => setPhotoOpen(true)}
          />
        )}
        {!showVideo && (
          <AddMediaButton
            key="add-video"
            testID={`${testIDPrefix}-add-video`}
            icon="logo-youtube"
            label="Add video"
            onPress={() => setVideoOpen(true)}
          />
        )}
      </View>

      {showPhoto && (
        <View className="mt-3 flex-row items-center">
          {drill.photo_url ? (
            // Distinct keys: these two branches are both Views in the same
            // position, and reusing the instance across the class change
            // trips the css-interop upgrade warning crash in dev.
            <View key="photo-thumbnail" className="mr-3">
              <ExpandablePhoto
                uri={drill.photo_url}
                className="h-14 w-14 rounded-lg"
                testID={`${testIDPrefix}-photo`}
                overlay={
                  <Pressable
                    testID={`${testIDPrefix}-remove-photo`}
                    onPress={() => {
                      setPhotoOpen(false);
                      onChange({ ...drill, photo_url: null });
                    }}
                    className="absolute -right-2 -top-2 h-5 w-5 items-center justify-center rounded-full bg-gray-700"
                  >
                    <Ionicons name="close" size={12} color="white" />
                  </Pressable>
                }
              />
            </View>
          ) : uploading ? (
            <View
              key="photo-uploading"
              className="mr-3 h-14 w-14 items-center justify-center rounded-lg bg-gray-100 dark:bg-background-dark"
            >
              <ActivityIndicator testID={`${testIDPrefix}-photo-loading`} size="small" />
            </View>
          ) : null}

          <Pressable
            testID={`${testIDPrefix}-take-photo`}
            onPress={() => handlePickPhoto('camera')}
            disabled={uploading}
            className="mr-2 flex-row items-center rounded-full border border-gray-300 px-3 py-2 dark:border-border-dark"
          >
            <Ionicons name="camera-outline" size={14} color="#4B5563" />
            <Text className="ml-1.5 text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Camera
            </Text>
          </Pressable>
          <Pressable
            testID={`${testIDPrefix}-choose-photo`}
            onPress={() => handlePickPhoto('library')}
            disabled={uploading}
            className="flex-row items-center rounded-full border border-gray-300 px-3 py-2 dark:border-border-dark"
          >
            <Ionicons name="image-outline" size={14} color="#4B5563" />
            <Text className="ml-1.5 text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Library
            </Text>
          </Pressable>
        </View>
      )}

      {photoError && (
        <Text testID={`${testIDPrefix}-photo-error`} className="mt-2 text-xs text-red-600">
          {photoError}
        </Text>
      )}

      {showVideo && (
        <View className="mt-3">
          <View className="flex-row items-center rounded-xl border border-gray-300 px-3 dark:border-border-dark">
            <Ionicons name="logo-youtube" size={16} color="#DC2626" />
            <TextInput
              testID={`${testIDPrefix}-video-url`}
              className="ml-2 flex-1 py-2 text-xs text-text-primary dark:text-text-primary-dark"
              placeholder="Paste a YouTube link"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              value={drill.video_url ?? ''}
              onChangeText={handleVideoUrlChange}
            />
          </View>
          {video && (
            <View className="mt-3 flex-row items-center">
              <DrillVideo url={drill.video_url!} testID={`${testIDPrefix}-video`} className="h-12 w-20 rounded-lg" />
              <Text className="ml-3 text-xs text-text-secondary dark:text-text-secondary-dark">Start at</Text>
              <TextInput
                testID={`${testIDPrefix}-video-start`}
                className="ml-2 w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-center text-xs text-text-primary dark:border-border-dark dark:text-text-primary-dark"
                placeholder="0:00"
                placeholderTextColor="#9CA3AF"
                keyboardType="numbers-and-punctuation"
                value={startText}
                onChangeText={handleStartChange}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

import { useState } from 'react';
import { View, Text, Image, Linking, Modal, Pressable, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Platform-split module: a plain iframe on web (where the native player
// library can't bundle), react-native-youtube-iframe on native.
import { YoutubePlayer } from '@/components/training/youtubePlayer';
import { parseYouTubeUrl, youTubeThumbnailUrl, buildYouTubeUrl, formatTimestamp } from '@/lib/training/youtube';

interface DrillVideoProps {
  url: string;
  testID: string;
  /** Size and radius of the thumbnail, e.g. "h-20 w-32 rounded-lg". */
  className?: string;
}

/**
 * A drill's YouTube video as a lightweight thumbnail (a static image - no
 * WebView cost in lists) that opens an in-app player when tapped, starting
 * from the drill's saved timestamp. The player is YouTube's official IFrame
 * API via react-native-youtube-iframe - a hand-rolled embed WebView gets
 * refused playback on real devices. Renders nothing for URLs that aren't a
 * YouTube video.
 */
export function DrillVideo({ url, testID, className = 'h-20 w-32 rounded-lg' }: DrillVideoProps) {
  const [playing, setPlaying] = useState(false);
  const { width } = useWindowDimensions();
  const video = parseYouTubeUrl(url);

  if (!video) return null;

  return (
    <>
      <Pressable testID={testID} onPress={() => setPlaying(true)} className={`overflow-hidden ${className}`}>
        <Image
          testID={`${testID}-thumbnail`}
          source={{ uri: youTubeThumbnailUrl(video.videoId) }}
          className="h-full w-full"
          resizeMode="cover"
        />
        <View className="absolute inset-0 items-center justify-center">
          <View
            testID={`${testID}-play-badge`}
            className="h-8 w-8 items-center justify-center rounded-full bg-black/60"
          >
            <Ionicons name="play" size={16} color="white" style={{ marginLeft: 2 }} />
          </View>
        </View>
        {video.startSeconds != null && (
          <View testID={`${testID}-timestamp`} className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5">
            <Text className="text-[10px] font-medium text-white">{formatTimestamp(video.startSeconds)}</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={playing} transparent animationType="fade" onRequestClose={() => setPlaying(false)}>
        <Pressable
          testID={`${testID}-backdrop`}
          className="flex-1 justify-center bg-black/95"
          onPress={() => setPlaying(false)}
        >
          {/* The player swallows touches, so the backdrop stays tappable around it. */}
          <View style={{ width, height: (width * 9) / 16 }}>
            {playing && (
              <YoutubePlayer
                height={(width * 9) / 16}
                width={width}
                play
                videoId={video.videoId}
                initialPlayerParams={{ start: video.startSeconds ?? undefined, modestbranding: true }}
                webViewProps={{ allowsInlineMediaPlayback: true, mediaPlaybackRequiresUserAction: false }}
              />
            )}
          </View>

          <Pressable
            testID={`${testID}-watch-on-youtube`}
            onPress={() => Linking.openURL(buildYouTubeUrl(video))}
            className="mt-4 flex-row items-center justify-center"
            hitSlop={8}
          >
            <Ionicons name="logo-youtube" size={16} color="#DC2626" />
            <Text className="ml-2 text-sm font-medium text-white">Watch on YouTube</Text>
          </Pressable>

          <View className="absolute right-4 top-12 h-10 w-10 items-center justify-center rounded-full bg-black/60">
            <Ionicons name="close" size={24} color="white" />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

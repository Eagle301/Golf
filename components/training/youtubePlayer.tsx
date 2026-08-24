import { createElement, type ComponentType } from 'react';
import { youTubeEmbedUrl } from '@/lib/training/youtube';

export interface YoutubePlayerProps {
  height: number;
  width: number;
  play?: boolean;
  videoId: string;
  initialPlayerParams?: { start?: number; modestbranding?: boolean };
  /** Native-only WebView tweaks - ignored on web. */
  webViewProps?: Record<string, unknown>;
}

/**
 * Web resolution of the drill video player (native uses
 * react-native-youtube-iframe, see youtubePlayer.native.ts - that library
 * can't bundle for web since its WebView.web.js requires the unmaintained
 * react-native-web-webview). In a browser a plain YouTube iframe just works,
 * so this renders one with the same props the native player takes.
 */
export const YoutubePlayer: ComponentType<YoutubePlayerProps> = function WebYoutubePlayer({
  height,
  width,
  videoId,
  initialPlayerParams,
}: YoutubePlayerProps) {
  const src = youTubeEmbedUrl({ videoId, startSeconds: initialPlayerParams?.start ?? null });

  // createElement keeps this a plain DOM iframe without needing the DOM lib's
  // JSX intrinsic types in a react-native tsconfig.
  return createElement('iframe', {
    src,
    width,
    height,
    style: { border: 0 },
    allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
    allowFullScreen: true,
  });
};

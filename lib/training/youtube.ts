/**
 * Parsing and URL-building for the YouTube links attached to drills. A drill
 * stores one canonical watch URL (with an optional `t=` start time); every
 * consumer derives thumbnails and embed players from the parsed form.
 */

export interface YouTubeVideo {
  videoId: string;
  /** Where playback should start, in whole seconds - null to play from the beginning. */
  startSeconds: number | null;
}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** "1h2m3s" / "2m5s" / "95s" / "95" -> whole seconds, or null if unrecognized. */
function parseYouTubeTimeParam(raw: string): number | null {
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match || (match[1] == null && match[2] == null && match[3] == null)) return null;
  const [, h, m, s] = match;
  return (h ? parseInt(h, 10) * 3600 : 0) + (m ? parseInt(m, 10) * 60 : 0) + (s ? parseInt(s, 10) : 0);
}

/**
 * Extracts the video id and optional start time from any common YouTube URL
 * shape (watch, youtu.be, Shorts, embed, with or without a protocol).
 * Returns null when the text isn't a YouTube video link.
 */
export function parseYouTubeUrl(url: string): YouTubeVideo | null {
  const trimmed = url.trim();
  if (trimmed === '') return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\.|^m\./, '');
  let videoId: string | null = null;

  if (host === 'youtu.be') {
    videoId = parsed.pathname.slice(1).split('/')[0] || null;
  } else if (host === 'youtube.com') {
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments[0] === 'watch') {
      videoId = parsed.searchParams.get('v');
    } else if (segments[0] === 'shorts' || segments[0] === 'embed') {
      videoId = segments[1] ?? null;
    }
  }

  if (!videoId || !VIDEO_ID.test(videoId)) return null;

  const timeParam = parsed.searchParams.get('t') ?? parsed.searchParams.get('start');
  const startSeconds = timeParam ? parseYouTubeTimeParam(timeParam) : null;

  return { videoId, startSeconds: startSeconds && startSeconds > 0 ? startSeconds : null };
}

/** YouTube's free 480x360 thumbnail for a video - no API key needed. */
export function youTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/** Iframe player URL, autoplaying inline from the video's start time. */
export function youTubeEmbedUrl(video: YouTubeVideo): string {
  const base = `https://www.youtube.com/embed/${video.videoId}?autoplay=1&playsinline=1`;
  return video.startSeconds != null ? `${base}&start=${video.startSeconds}` : base;
}

/** Canonical watch URL for storage, so every saved drill link has one shape. */
export function buildYouTubeUrl(video: YouTubeVideo): string {
  const base = `https://www.youtube.com/watch?v=${video.videoId}`;
  return video.startSeconds != null ? `${base}&t=${video.startSeconds}` : base;
}

/** "1:25" / "1:02:03" / "95" -> whole seconds, or null if unrecognized. */
export function parseTimestamp(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  if (!/^\d+(:[0-5]?\d){0,2}$/.test(trimmed)) return null;
  return trimmed
    .split(':')
    .map((part) => parseInt(part, 10))
    .reduce((total, part) => total * 60 + part, 0);
}

/** Whole seconds -> "m:ss", or "h:mm:ss" from an hour up. */
export function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

import {
  parseYouTubeUrl,
  youTubeThumbnailUrl,
  youTubeEmbedUrl,
  buildYouTubeUrl,
  parseTimestamp,
  formatTimestamp,
} from '../youtube';

describe('parseYouTubeUrl', () => {
  it('parses a standard watch URL', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
      videoId: 'dQw4w9WgXcQ',
      startSeconds: null,
    });
  });

  it('parses a short youtu.be URL', () => {
    expect(parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toEqual({
      videoId: 'dQw4w9WgXcQ',
      startSeconds: null,
    });
  });

  it('parses a Shorts URL', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toEqual({
      videoId: 'dQw4w9WgXcQ',
      startSeconds: null,
    });
  });

  it('parses an embed URL', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toEqual({
      videoId: 'dQw4w9WgXcQ',
      startSeconds: null,
    });
  });

  it('parses a mobile URL without a protocol', () => {
    expect(parseYouTubeUrl('m.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
      videoId: 'dQw4w9WgXcQ',
      startSeconds: null,
    });
  });

  it('picks up a plain seconds timestamp from t=', () => {
    expect(parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ?t=95')).toEqual({
      videoId: 'dQw4w9WgXcQ',
      startSeconds: 95,
    });
  });

  it('picks up a suffixed timestamp like t=1m35s', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m35s')).toEqual({
      videoId: 'dQw4w9WgXcQ',
      startSeconds: 95,
    });
  });

  it('picks up an hours timestamp like t=1h2m3s', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1h2m3s')).toEqual({
      videoId: 'dQw4w9WgXcQ',
      startSeconds: 3723,
    });
  });

  it('picks up start= on embed URLs', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ?start=42')).toEqual({
      videoId: 'dQw4w9WgXcQ',
      startSeconds: 42,
    });
  });

  it('returns null for non-YouTube URLs', () => {
    expect(parseYouTubeUrl('https://vimeo.com/123456')).toBeNull();
  });

  it('returns null for garbage and empty input', () => {
    expect(parseYouTubeUrl('not a url')).toBeNull();
    expect(parseYouTubeUrl('')).toBeNull();
  });

  it('returns null when the video id has the wrong length', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/watch?v=short')).toBeNull();
  });
});

describe('youTubeThumbnailUrl', () => {
  it('builds the hqdefault thumbnail URL', () => {
    expect(youTubeThumbnailUrl('dQw4w9WgXcQ')).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });
});

describe('youTubeEmbedUrl', () => {
  it('builds an embed URL without a start time', () => {
    expect(youTubeEmbedUrl({ videoId: 'dQw4w9WgXcQ', startSeconds: null })).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&playsinline=1'
    );
  });

  it('includes the start parameter when a start time is set', () => {
    expect(youTubeEmbedUrl({ videoId: 'dQw4w9WgXcQ', startSeconds: 95 })).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&playsinline=1&start=95'
    );
  });
});

describe('buildYouTubeUrl', () => {
  it('builds a canonical watch URL', () => {
    expect(buildYouTubeUrl({ videoId: 'dQw4w9WgXcQ', startSeconds: null })).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    );
  });

  it('appends the start time in seconds', () => {
    expect(buildYouTubeUrl({ videoId: 'dQw4w9WgXcQ', startSeconds: 95 })).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=95'
    );
  });
});

describe('parseTimestamp', () => {
  it('parses m:ss', () => {
    expect(parseTimestamp('1:25')).toBe(85);
  });

  it('parses h:mm:ss', () => {
    expect(parseTimestamp('1:02:03')).toBe(3723);
  });

  it('parses bare seconds', () => {
    expect(parseTimestamp('95')).toBe(95);
  });

  it('returns null for empty or invalid input', () => {
    expect(parseTimestamp('')).toBeNull();
    expect(parseTimestamp('abc')).toBeNull();
    expect(parseTimestamp('1:xx')).toBeNull();
  });
});

describe('formatTimestamp', () => {
  it('formats seconds under an hour as m:ss', () => {
    expect(formatTimestamp(85)).toBe('1:25');
    expect(formatTimestamp(5)).toBe('0:05');
  });

  it('formats an hour or more as h:mm:ss', () => {
    expect(formatTimestamp(3723)).toBe('1:02:03');
  });
});

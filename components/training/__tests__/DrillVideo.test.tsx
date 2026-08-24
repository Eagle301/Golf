jest.mock('react-native-youtube-iframe', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: (props: any) => <View testID="youtube-player" {...props} /> };
});

import { Linking } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { DrillVideo } from '../DrillVideo';

describe('DrillVideo', () => {
  const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=95';

  it('renders nothing for an unparseable URL', () => {
    render(<DrillVideo url="https://vimeo.com/123" testID="video" />);
    expect(screen.queryByTestId('video')).toBeNull();
  });

  it('shows the YouTube thumbnail with a play badge', () => {
    render(<DrillVideo url={url} testID="video" />);
    const thumbnail = screen.getByTestId('video-thumbnail');
    expect(thumbnail.props.source.uri).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
    expect(screen.getByTestId('video-play-badge')).toBeTruthy();
  });

  it('shows the start timestamp on the thumbnail', () => {
    render(<DrillVideo url={url} testID="video" />);
    expect(screen.getByText('1:35')).toBeTruthy();
  });

  it('opens the player at the start time when tapped', () => {
    render(<DrillVideo url={url} testID="video" />);
    fireEvent.press(screen.getByTestId('video'));

    const player = screen.getByTestId('youtube-player');
    expect(player.props.videoId).toBe('dQw4w9WgXcQ');
    expect(player.props.play).toBe(true);
    expect(player.props.initialPlayerParams).toEqual(expect.objectContaining({ start: 95 }));
  });

  it('offers a watch-on-YouTube escape hatch for videos that refuse to embed', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as any);

    render(<DrillVideo url={url} testID="video" />);
    fireEvent.press(screen.getByTestId('video'));
    fireEvent.press(screen.getByTestId('video-watch-on-youtube'));

    expect(openURL).toHaveBeenCalledWith('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=95');
  });

  it('omits the timestamp badge when the video plays from the beginning', () => {
    render(<DrillVideo url="https://youtu.be/dQw4w9WgXcQ" testID="video" />);
    expect(screen.queryByTestId('video-timestamp')).toBeNull();
  });
});

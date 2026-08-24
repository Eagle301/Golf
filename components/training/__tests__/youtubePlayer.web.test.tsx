import { render } from '@testing-library/react-native';

// jest resolves the .native module for bare imports, so load the web
// implementation by its exact filename.
const { YoutubePlayer: WebYoutubePlayer } = require('../youtubePlayer.tsx');

describe('YoutubePlayer (web)', () => {
  it('renders a plain YouTube iframe at the start time', () => {
    const tree = render(
      <WebYoutubePlayer height={180} width={320} play videoId="dQw4w9WgXcQ" initialPlayerParams={{ start: 95 }} />
    );

    const iframe = tree.UNSAFE_root.findByType('iframe' as any);
    expect(iframe.props.src).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&playsinline=1&start=95');
    expect(iframe.props.allowFullScreen).toBe(true);
  });

  it('omits the start parameter when there is none', () => {
    const tree = render(<WebYoutubePlayer height={180} width={320} play videoId="dQw4w9WgXcQ" initialPlayerParams={{}} />);

    const iframe = tree.UNSAFE_root.findByType('iframe' as any);
    expect(iframe.props.src).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&playsinline=1');
  });
});

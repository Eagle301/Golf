import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ExpandablePhoto } from '../ExpandablePhoto';

const URI = 'https://example.test/drill.png';

describe('ExpandablePhoto', () => {
  it('renders the thumbnail with the given uri and classes', () => {
    render(<ExpandablePhoto uri={URI} className="h-14 w-14 rounded-lg" testID="drill-0-photo" />);

    const thumb = screen.getByTestId('drill-0-photo');
    expect(thumb.props.source).toEqual({ uri: URI });
    expect(thumb.props.className).toBe('h-14 w-14 rounded-lg');
  });

  it('does not show the full-size photo until the thumbnail is tapped', () => {
    render(<ExpandablePhoto uri={URI} testID="drill-0-photo" />);

    expect(screen.queryByTestId('drill-0-photo-full')).toBeNull();
  });

  it('opens the full-size photo when the thumbnail is tapped', () => {
    render(<ExpandablePhoto uri={URI} testID="drill-0-photo" />);

    fireEvent.press(screen.getByTestId('drill-0-photo-expand'));

    const full = screen.getByTestId('drill-0-photo-full');
    expect(full.props.source).toEqual({ uri: URI });
    // contain, so a tall setup diagram isn't cropped to the screen's aspect.
    expect(full.props.resizeMode).toBe('contain');
  });

  it('closes again when the backdrop is tapped', () => {
    render(<ExpandablePhoto uri={URI} testID="drill-0-photo" />);

    fireEvent.press(screen.getByTestId('drill-0-photo-expand'));
    expect(screen.getByTestId('drill-0-photo-full')).toBeTruthy();

    fireEvent.press(screen.getByTestId('drill-0-photo-backdrop'));
    expect(screen.queryByTestId('drill-0-photo-full')).toBeNull();
  });

  it('renders an overlay outside the tappable area, so it does not open the viewer', () => {
    render(
      <ExpandablePhoto uri={URI} testID="drill-0-photo" overlay={<Text testID="badge">x</Text>} />
    );

    expect(screen.getByTestId('badge')).toBeTruthy();
    expect(screen.queryByTestId('drill-0-photo-full')).toBeNull();
  });
});

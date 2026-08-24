jest.mock('react-native-youtube-iframe', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: (props: any) => <View testID="youtube-player" {...props} /> };
});

import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { DrillRow } from '../DrillRow';
import type { DrillInput } from '@/lib/hooks/useRoutines';

const baseDrill: DrillInput = {
  name: 'Drill A',
  target_value: null,
  photo_url: null,
  video_url: null,
  result_type: 'count',
};

function renderRow(drill: DrillInput, overrides: Partial<React.ComponentProps<typeof DrillRow>> = {}) {
  const props = {
    drill,
    onChange: jest.fn(),
    onRemove: jest.fn(),
    onPickPhoto: jest.fn(),
    testIDPrefix: 'drill-0',
    position: 1,
    ...overrides,
  };
  return { ...render(<DrillRow {...props} />), props };
}

describe('DrillRow layout', () => {
  it('shows the drill position so the running order is visible', () => {
    renderRow(baseDrill, { position: 3 });
    expect(screen.getByTestId('drill-0-position')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('edits the drill name', () => {
    const onChange = jest.fn();
    renderRow(baseDrill, { onChange });
    fireEvent.changeText(screen.getByTestId('drill-0-name'), 'Renamed');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: 'Renamed' }));
  });

  it('removes and reorders the drill', () => {
    const onRemove = jest.fn();
    const onMoveUp = jest.fn();
    const onMoveDown = jest.fn();
    renderRow(baseDrill, { onRemove, onMoveUp, onMoveDown });

    fireEvent.press(screen.getByTestId('drill-0-move-up'));
    fireEvent.press(screen.getByTestId('drill-0-move-down'));
    fireEvent.press(screen.getByTestId('drill-0-remove'));

    expect(onMoveUp).toHaveBeenCalled();
    expect(onMoveDown).toHaveBeenCalled();
    expect(onRemove).toHaveBeenCalled();
  });

  it('hides reorder controls that do not apply', () => {
    renderRow(baseDrill);
    expect(screen.queryByTestId('drill-0-move-up')).toBeNull();
    expect(screen.queryByTestId('drill-0-move-down')).toBeNull();
  });
});

describe('DrillRow result type', () => {
  it('offers the three result types', () => {
    renderRow(baseDrill);
    expect(screen.getByTestId('drill-0-type-check')).toBeTruthy();
    expect(screen.getByTestId('drill-0-type-target')).toBeTruthy();
    expect(screen.getByTestId('drill-0-type-count')).toBeTruthy();
  });

  it('only shows the target input for out-of drills', () => {
    renderRow(baseDrill);
    expect(screen.queryByTestId('drill-0-target')).toBeNull();
  });

  it('shows the target input when the drill is an out-of drill', () => {
    renderRow({ ...baseDrill, result_type: 'target', target_value: 10 });
    expect(screen.getByTestId('drill-0-target')).toBeTruthy();
  });

  it('switches the result type', () => {
    const onChange = jest.fn();
    renderRow(baseDrill, { onChange });
    fireEvent.press(screen.getByTestId('drill-0-type-target'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ result_type: 'target' }));
  });

  it('clears the target when switching away from out-of', () => {
    const onChange = jest.fn();
    renderRow({ ...baseDrill, result_type: 'target', target_value: 10 }, { onChange });
    fireEvent.press(screen.getByTestId('drill-0-type-check'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ result_type: 'check', target_value: null }));
  });

  it('edits the target value', () => {
    const onChange = jest.fn();
    renderRow({ ...baseDrill, result_type: 'target', target_value: 10 }, { onChange });
    fireEvent.changeText(screen.getByTestId('drill-0-target'), '12');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ target_value: 12 }));
  });
});

describe('DrillRow media disclosure', () => {
  it('keeps photo and video controls collapsed behind add buttons', () => {
    renderRow(baseDrill);
    expect(screen.getByTestId('drill-0-add-photo')).toBeTruthy();
    expect(screen.getByTestId('drill-0-add-video')).toBeTruthy();
    expect(screen.queryByTestId('drill-0-take-photo')).toBeNull();
    expect(screen.queryByTestId('drill-0-video-url')).toBeNull();
  });

  it('reveals the photo controls on demand', () => {
    renderRow(baseDrill);
    fireEvent.press(screen.getByTestId('drill-0-add-photo'));
    expect(screen.getByTestId('drill-0-take-photo')).toBeTruthy();
    expect(screen.getByTestId('drill-0-choose-photo')).toBeTruthy();
  });

  it('reveals the video field on demand', () => {
    renderRow(baseDrill);
    fireEvent.press(screen.getByTestId('drill-0-add-video'));
    expect(screen.getByTestId('drill-0-video-url')).toBeTruthy();
  });

  it('shows an existing photo expanded without tapping anything', () => {
    renderRow({ ...baseDrill, photo_url: 'https://example.com/p.jpg' });
    expect(screen.getByTestId('drill-0-photo')).toBeTruthy();
    expect(screen.queryByTestId('drill-0-add-photo')).toBeNull();
  });

  it('shows an existing video expanded without tapping anything', () => {
    renderRow({ ...baseDrill, video_url: 'https://youtu.be/dQw4w9WgXcQ' });
    expect(screen.getByTestId('drill-0-video-url')).toBeTruthy();
    expect(screen.getByTestId('drill-0-video-thumbnail')).toBeTruthy();
    expect(screen.queryByTestId('drill-0-add-video')).toBeNull();
  });

  it('attaches a picked photo', async () => {
    const onChange = jest.fn();
    const onPickPhoto = jest.fn().mockResolvedValue('https://example.com/new.jpg');
    renderRow(baseDrill, { onChange, onPickPhoto });

    fireEvent.press(screen.getByTestId('drill-0-add-photo'));
    fireEvent.press(screen.getByTestId('drill-0-take-photo'));

    await waitFor(() => expect(onPickPhoto).toHaveBeenCalledWith('camera'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ photo_url: 'https://example.com/new.jpg' }));
  });

  it('surfaces a photo upload failure', async () => {
    const onPickPhoto = jest.fn().mockRejectedValue(new Error('upload exploded'));
    renderRow(baseDrill, { onPickPhoto });

    fireEvent.press(screen.getByTestId('drill-0-add-photo'));
    fireEvent.press(screen.getByTestId('drill-0-take-photo'));

    await waitFor(() => expect(screen.getByTestId('drill-0-photo-error')).toBeTruthy());
    expect(screen.getByText('upload exploded')).toBeTruthy();
  });

  it('removes an attached photo', () => {
    const onChange = jest.fn();
    renderRow({ ...baseDrill, photo_url: 'https://example.com/p.jpg' }, { onChange });
    fireEvent.press(screen.getByTestId('drill-0-remove-photo'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ photo_url: null }));
  });
});

describe('DrillRow video field', () => {
  it('stores the typed YouTube link on the drill', () => {
    const onChange = jest.fn();
    renderRow(baseDrill, { onChange });
    fireEvent.press(screen.getByTestId('drill-0-add-video'));
    fireEvent.changeText(screen.getByTestId('drill-0-video-url'), 'https://youtu.be/dQw4w9WgXcQ');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ video_url: 'https://youtu.be/dQw4w9WgXcQ' })
    );
  });

  it('clears the video when the link is emptied', () => {
    const onChange = jest.fn();
    renderRow({ ...baseDrill, video_url: 'https://youtu.be/dQw4w9WgXcQ' }, { onChange });
    fireEvent.changeText(screen.getByTestId('drill-0-video-url'), '');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ video_url: null }));
  });

  it('shows the start-at field once the link is valid', () => {
    renderRow({ ...baseDrill, video_url: 'https://youtu.be/dQw4w9WgXcQ' });
    expect(screen.getByTestId('drill-0-video-start')).toBeTruthy();
  });

  it('hides the thumbnail and start-at field for an invalid link', () => {
    renderRow({ ...baseDrill, video_url: 'https://vimeo.com/123' });
    expect(screen.queryByTestId('drill-0-video-thumbnail')).toBeNull();
    expect(screen.queryByTestId('drill-0-video-start')).toBeNull();
  });

  it('prefills the start-at field from a pasted timestamped link', () => {
    renderRow({ ...baseDrill, video_url: 'https://youtu.be/dQw4w9WgXcQ?t=95' });
    expect(screen.getByTestId('drill-0-video-start').props.value).toBe('1:35');
  });

  it('writes the typed start time into a canonical video URL', () => {
    const onChange = jest.fn();
    renderRow({ ...baseDrill, video_url: 'https://youtu.be/dQw4w9WgXcQ' }, { onChange });
    fireEvent.changeText(screen.getByTestId('drill-0-video-start'), '1:35');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=95' })
    );
  });

  it('drops the start time when the field is cleared', () => {
    const onChange = jest.fn();
    renderRow({ ...baseDrill, video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=95' }, { onChange });
    fireEvent.changeText(screen.getByTestId('drill-0-video-start'), '');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
    );
  });
});

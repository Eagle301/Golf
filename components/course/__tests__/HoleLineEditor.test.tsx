const mockInjectJavaScript = jest.fn();

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    WebView: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({ injectJavaScript: mockInjectJavaScript }));
      // testID last: the component passes its own, which would win otherwise.
      return <View {...props} testID="webview-mock" />;
    }),
  };
});

import { render, screen, act } from '@testing-library/react-native';
import { HoleLineEditor } from '../HoleLineEditor';

const course = { name: 'Landið', club: 'GR', latitude: 64.14977, longitude: -21.76237 };
const oneLine = [{ hole_number: 1, path: [[64.15, -21.765], [64.152, -21.76]] as [number, number][] }];
const twoPoints = [
  { hole_number: 1, path: [[64.15, -21.765], [64.152, -21.76], [64.153, -21.758]] as [number, number][] },
];

function ready() {
  act(() => {
    screen.getByTestId('webview-mock').props.onMessage({
      nativeEvent: { data: JSON.stringify({ type: 'ready' }) },
    });
  });
}

describe('HoleLineEditor', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps the same document when the lines change, instead of reloading it', () => {
    const { rerender } = render(
      <HoleLineEditor course={course} holes={oneLine} activeHoleNumber={1} onEdit={jest.fn()} />
    );
    const first = screen.getByTestId('webview-mock').props.source;

    rerender(<HoleLineEditor course={course} holes={twoPoints} activeHoleNumber={1} onEdit={jest.fn()} />);

    // Same object, so react-native-webview has no reason to reload: a new
    // source means Leaflet and every satellite tile load again.
    expect(screen.getByTestId('webview-mock').props.source).toBe(first);
  });

  it('pushes the new lines into the live document', () => {
    const { rerender } = render(
      <HoleLineEditor course={course} holes={oneLine} activeHoleNumber={1} onEdit={jest.fn()} />
    );
    ready();
    mockInjectJavaScript.mockClear();

    rerender(<HoleLineEditor course={course} holes={twoPoints} activeHoleNumber={1} onEdit={jest.fn()} />);

    expect(mockInjectJavaScript).toHaveBeenCalledTimes(1);
    const script = mockInjectJavaScript.mock.calls[0][0];
    expect(script).toContain('__applyState');
    expect(script).toContain('64.153');
  });

  it('does not push anything when nothing changed', () => {
    const { rerender } = render(
      <HoleLineEditor course={course} holes={oneLine} activeHoleNumber={1} onEdit={jest.fn()} />
    );
    ready();
    mockInjectJavaScript.mockClear();

    rerender(<HoleLineEditor course={course} holes={oneLine} activeHoleNumber={1} onEdit={jest.fn()} />);

    expect(mockInjectJavaScript).not.toHaveBeenCalled();
  });

  it('waits for the document before pushing, then sends the current state', () => {
    const { rerender } = render(
      <HoleLineEditor course={course} holes={oneLine} activeHoleNumber={1} onEdit={jest.fn()} />
    );

    // An edit lands before the document has finished loading.
    rerender(<HoleLineEditor course={course} holes={twoPoints} activeHoleNumber={1} onEdit={jest.fn()} />);
    expect(mockInjectJavaScript).not.toHaveBeenCalled();

    ready();

    expect(mockInjectJavaScript).toHaveBeenCalledTimes(1);
    expect(mockInjectJavaScript.mock.calls[0][0]).toContain('64.153');
  });

  it('reports edits from the document', () => {
    const onEdit = jest.fn();
    render(<HoleLineEditor course={course} holes={oneLine} activeHoleNumber={1} onEdit={onEdit} />);

    screen.getByTestId('webview-mock').props.onMessage({
      nativeEvent: { data: JSON.stringify({ type: 'point-added', latitude: 64.1, longitude: -21.7 }) },
    });

    expect(onEdit).toHaveBeenCalledWith({ type: 'point-added', latitude: 64.1, longitude: -21.7 });
  });

  it('does not mistake the document telling us it is ready for an edit', () => {
    const onEdit = jest.fn();
    render(<HoleLineEditor course={course} holes={oneLine} activeHoleNumber={1} onEdit={onEdit} />);

    ready();

    expect(onEdit).not.toHaveBeenCalled();
  });
});

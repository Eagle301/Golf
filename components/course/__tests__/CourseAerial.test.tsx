jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: (props: any) => <View {...props} testID="webview-mock" /> };
});

import { render, screen } from '@testing-library/react-native';
import { CourseAerial } from '../CourseAerial';

const course = {
  name: 'Landið',
  club: 'GR',
  latitude: 64.14977,
  longitude: -21.76237,
  holes: [{ hole_number: 1, path: [[64.15, -21.765], [64.152, -21.76]] as [number, number][] }],
};

describe('CourseAerial', () => {
  it('keeps the same document when re-rendered with the same course', () => {
    const { rerender } = render(<CourseAerial course={course} />);
    const first = screen.getByTestId('webview-mock').props.source;

    // A parent re-render hands down an equal but freshly built object.
    rerender(<CourseAerial course={{ ...course, holes: [...course.holes] }} />);

    // A new source object would reload Leaflet and every satellite tile.
    expect(screen.getByTestId('webview-mock').props.source).toBe(first);
  });

  it('rebuilds when the lines actually change', () => {
    const { rerender } = render(<CourseAerial course={course} />);
    const first = screen.getByTestId('webview-mock').props.source;

    rerender(
      <CourseAerial
        course={{
          ...course,
          holes: [{ hole_number: 1, path: [[64.15, -21.765], [64.155, -21.755]] } as any],
        }}
      />
    );

    expect(screen.getByTestId('webview-mock').props.source).not.toBe(first);
  });
});

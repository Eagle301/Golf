import { useMemo } from 'react';
import { WebView } from 'react-native-webview';
import { buildCourseAerialHtml, type CourseAerial as CourseAerialData } from '@/lib/courseMapHtml';

export interface CourseAerialProps {
  course: CourseAerialData;
}

export function CourseAerial({ course }: CourseAerialProps) {
  // Keyed on the content, not the object: a parent re-render hands down an
  // equal-but-new course, and a new `source` reloads Leaflet and every tile.
  const key = JSON.stringify(course);
  const source = useMemo(() => ({ html: buildCourseAerialHtml(course) }), [key]);

  return <WebView testID="course-aerial" originWhitelist={['*']} source={source} style={{ flex: 1 }} />;
}

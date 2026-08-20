import { WebView } from 'react-native-webview';
import { buildCourseMapHtml, handleCourseMapMessage, type CourseMarker } from '@/lib/courseMapHtml';

export interface CourseMapProps {
  markers: CourseMarker[];
  onPlayCourse: (courseId: string) => void;
  onEditCourse: (courseId: string) => void;
}

export function CourseMap({ markers, onPlayCourse, onEditCourse }: CourseMapProps) {
  return (
    <WebView
      testID="course-map"
      originWhitelist={['*']}
      source={{ html: buildCourseMapHtml(markers) }}
      onMessage={(event) =>
        handleCourseMapMessage(event.nativeEvent.data, { onPlayCourse, onEditCourse })
      }
      style={{ flex: 1 }}
    />
  );
}

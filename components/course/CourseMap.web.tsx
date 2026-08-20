import { useEffect } from 'react';
import { buildCourseMapHtml, handleCourseMapMessage } from '@/lib/courseMapHtml';
import type { CourseMapProps } from './CourseMap';

export type { CourseMapProps };

export function CourseMap({ markers, onPlayCourse, onEditCourse }: CourseMapProps) {
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (typeof event.data !== 'string') return;
      handleCourseMapMessage(event.data, { onPlayCourse, onEditCourse });
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onPlayCourse, onEditCourse]);

  return (
    <iframe
      data-testid="course-map"
      title="Course map"
      srcDoc={buildCourseMapHtml(markers)}
      style={{ flex: 1, width: '100%', border: 'none' }}
    />
  );
}

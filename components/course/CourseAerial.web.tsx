import { useMemo } from 'react';
import { buildCourseAerialHtml } from '@/lib/courseMapHtml';
import type { CourseAerialProps } from './CourseAerial';

export type { CourseAerialProps };

export function CourseAerial({ course }: CourseAerialProps) {
  // See the native twin: keyed on content so an equal-but-new course object
  // doesn't reload the document.
  const key = JSON.stringify(course);
  const srcDoc = useMemo(() => buildCourseAerialHtml(course), [key]);

  return (
    <iframe
      data-testid="course-aerial"
      title={`${course.name} aerial map`}
      srcDoc={srcDoc}
      style={{ flex: 1, width: '100%', height: '100%', border: 'none' }}
    />
  );
}

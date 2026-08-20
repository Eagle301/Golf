import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { organizeCoursesForStart } from '@/lib/courseStartList';
import type { CachedCourse, CachedTeeBox } from '@/lib/offline/types';

interface CourseStartListProps {
  courses: CachedCourse[];
  roundCounts: Record<string, number>;
  onStart: (course: CachedCourse, tee: CachedTeeBox) => void;
}

function teeLabel(tee: CachedTeeBox): string {
  const parts = [tee.name];
  if (tee.total_length_meters != null) parts.push(`${tee.total_length_meters} m`);
  if (tee.course_rating != null && tee.slope_rating != null) {
    parts.push(`CR ${tee.course_rating}/${tee.slope_rating}`);
  }
  return parts.join(' · ');
}

interface CourseRowProps {
  course: CachedCourse;
  expanded: boolean;
  onPress: () => void;
  onStart: (course: CachedCourse, tee: CachedTeeBox) => void;
}

function CourseRow({ course, expanded, onPress, onStart }: CourseRowProps) {
  return (
    <View className="border-b border-gray-200 dark:border-border-dark">
      <Pressable testID={`start-round-${course.id}`} onPress={onPress} className="flex-row items-center py-3">
        <View className="flex-1">
          <Text className="text-base font-medium text-text-primary dark:text-text-primary-dark">
            {course.name}
          </Text>
          <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">
            {course.club ? `${course.club} · ` : ''}Par {course.total_par ?? '-'} · {course.hole_count} holes ·{' '}
            {course.tees.map((t) => t.name).join(' / ')}
          </Text>
        </View>
        {course.tees.length > 1 && (
          <Text className="text-text-secondary dark:text-text-secondary-dark">{expanded ? '▾' : '▸'}</Text>
        )}
      </Pressable>
      {expanded && (
        <View className="pb-3">
          {course.tees.map((tee) => (
            <Pressable
              key={tee.id}
              testID={`start-round-${course.id}-tee-${tee.id}`}
              onPress={() => onStart(course, tee)}
              className="mb-2 rounded-lg bg-brand/10 px-4 py-3 dark:bg-accent-gold-dark/10"
            >
              <Text className="font-medium text-text-primary dark:text-text-primary-dark">{teeLabel(tee)}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export function CourseStartList({ courses, roundCounts, onStart }: CourseStartListProps) {
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const { mostPlayed, others } = organizeCoursesForStart(courses, roundCounts);

  function handleCoursePress(course: CachedCourse) {
    if (course.tees.length === 1) {
      onStart(course, course.tees[0]);
      return;
    }
    setExpandedCourseId((prev) => (prev === course.id ? null : course.id));
  }

  const renderRows = (list: CachedCourse[]) =>
    list.map((course) => (
      <CourseRow
        key={course.id}
        course={course}
        expanded={expandedCourseId === course.id}
        onPress={() => handleCoursePress(course)}
        onStart={onStart}
      />
    ));

  return (
    <View>
      {mostPlayed.length > 0 && (
        <>
          <Text className="mb-1 text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
            Most played
          </Text>
          {renderRows(mostPlayed)}
        </>
      )}
      {others.length > 0 && (
        <>
          <Text
            className={`mb-1 text-sm font-medium text-text-secondary dark:text-text-secondary-dark ${
              mostPlayed.length > 0 ? 'mt-4' : ''
            }`}
          >
            {mostPlayed.length > 0 ? 'All courses' : 'Courses'}
          </Text>
          {renderRows(others)}
        </>
      )}
    </View>
  );
}

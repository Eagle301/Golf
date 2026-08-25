import { View, Text } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { CourseAerial } from '@/components/course/CourseAerial';
import { HeaderBackButton } from '@/components/ui/HeaderBackButton';
import { useHoleGeometry } from '@/lib/hooks/useHoleGeometry';

/**
 * Route params arrive as strings (or absent), so a coordinate is only usable
 * once it parses to a finite number inside its real-world range - otherwise
 * Leaflet would happily centre on nowhere.
 */
function parseCoordinate(raw: string | undefined, limit: number): number | null {
  if (raw == null || raw.trim() === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || Math.abs(value) > limit) return null;
  return value;
}

/**
 * Read-only satellite view of one course. Takes the course's name and
 * coordinates as params rather than an id, so every caller that already
 * holds them - the course editor, a round in progress - can open it without
 * another fetch.
 */
export default function CourseAerialScreen() {
  const { id, name, club, lat, lng, hole } = useLocalSearchParams<{
    id?: string;
    name?: string;
    club?: string;
    lat?: string;
    lng?: string;
    hole?: string;
  }>();

  // Hole lines are drawn when the caller knows which course this is; a bare
  // coordinate still gets the imagery.
  const { holes } = useHoleGeometry(id);

  const latitude = parseCoordinate(lat, 90);
  const longitude = parseCoordinate(lng, 180);
  const courseName = name ?? 'Course';
  // A hole to zoom to, when the caller knows which hole is being played.
  const focusHoleNumber = Number.isInteger(Number(hole)) && hole !== '' ? Number(hole) : undefined;

  return (
    <>
      <Stack.Screen
        options={{
          title: courseName,
          headerLeft: () => <HeaderBackButton fallback="/courses" />,
        }}
      />
      {latitude != null && longitude != null ? (
        <View className="flex-1 bg-background dark:bg-background-dark" testID="course-aerial-screen">
          <CourseAerial
            course={{
              name: courseName,
              club: club ?? null,
              latitude,
              longitude,
              holes: holes.map((h) => ({ hole_number: h.hole_number, path: h.path })),
              focusHoleNumber,
            }}
          />
        </View>
      ) : (
        <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-background-dark">
          <Text className="text-center text-text-secondary dark:text-text-secondary-dark">
            This course has no location yet.
          </Text>
        </View>
      )}
    </>
  );
}

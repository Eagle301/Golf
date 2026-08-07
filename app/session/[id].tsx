import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ExpandablePhoto } from '@/components/ui/ExpandablePhoto';
import { HeaderBackButton } from '@/components/ui/HeaderBackButton';
import { useTrainingSession, deleteTrainingSession } from '@/lib/hooks/useTrainingSession';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session, loading, error } = useTrainingSession(id);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    setDeleteModalOpen(false);
    setDeleting(true);
    await deleteTrainingSession(id);
    router.replace('/training');
  }

  let body: React.ReactNode;

  if (loading) {
    body = (
      <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark">
        <ActivityIndicator testID="session-detail-loading" />
      </View>
    );
  } else if (error || !session) {
    body = (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-background-dark">
        <Text className="text-center text-red-600">{error ?? 'Session not found.'}</Text>
      </View>
    );
  } else {
    body = (
      <>
        <ScrollView className="flex-1 bg-background px-4 pt-4 dark:bg-background-dark" testID="session-detail">
          <Text className="text-xl font-semibold text-text-primary dark:text-text-primary-dark">
            {session.routineName}
          </Text>
          <Text className="mb-4 text-sm text-text-secondary dark:text-text-secondary-dark">
            {session.datePlayed}
          </Text>

          {session.drills.map((drill) => (
            <View
              key={drill.drill_id}
              testID={`session-detail-drill-${drill.drill_id}`}
              className="mb-3 flex-row items-center rounded-xl border border-gray-200 p-3 dark:border-border-dark dark:bg-surface-dark"
            >
              {drill.photo_url && (
                <View className="mr-3">
                  <ExpandablePhoto
                    uri={drill.photo_url}
                    className="h-12 w-12 rounded-lg"
                    testID={`session-detail-drill-${drill.drill_id}-photo`}
                  />
                </View>
              )}
              <View className="flex-1">
                <Text className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                  {drill.name}
                </Text>
                {drill.target_value != null && (
                  <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">
                    Target {drill.target_value}
                  </Text>
                )}
              </View>
              <Text className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
                {drill.value ?? '-'}
              </Text>
            </View>
          ))}

          {session.note && (
            <View className="mt-2">
              <Text className="mb-1 text-sm font-medium text-text-primary dark:text-text-primary-dark">Note</Text>
              <Text className="text-text-secondary dark:text-text-secondary-dark">{session.note}</Text>
            </View>
          )}

          <Button
            testID="delete-session-button"
            variant="destructive"
            label="Delete Session"
            disabled={deleting}
            onPress={() => setDeleteModalOpen(true)}
            containerClassName="mb-8 mt-6"
          />
        </ScrollView>
        <ConfirmDialog
          visible={deleteModalOpen}
          title="Delete session?"
          message="This cannot be undone."
          confirmLabel="Delete"
          onCancel={() => setDeleteModalOpen(false)}
          onConfirm={confirmDelete}
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => <HeaderBackButton fallback="/training" />,
        }}
      />
      {body}
    </>
  );
}

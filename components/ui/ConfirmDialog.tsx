import { View, Text, Modal, Pressable } from 'react-native';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ visible, title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        testID="confirm-dialog-backdrop"
        className="flex-1 items-center justify-center bg-black/50"
        onPress={onCancel}
      >
        <View className="w-72 rounded bg-white p-4">
          <Text className="mb-1 text-center text-base font-semibold">{title}</Text>
          <Text className="mb-4 text-center text-sm text-gray-600">{message}</Text>
          <Pressable
            testID="confirm-dialog-confirm"
            onPress={onConfirm}
            className="mb-2 items-center rounded bg-red-600 py-3"
          >
            <Text className="font-medium text-white">{confirmLabel}</Text>
          </Pressable>
          <Pressable
            testID="confirm-dialog-cancel"
            onPress={onCancel}
            className="items-center rounded border border-gray-300 py-3"
          >
            <Text className="font-medium text-gray-700">Cancel</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

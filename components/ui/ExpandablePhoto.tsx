import { useState } from 'react';
import { View, Image, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ExpandablePhotoProps {
  uri: string;
  /** Classes for the thumbnail itself - size and radius, e.g. "h-14 w-14 rounded-lg". */
  className?: string;
  testID?: string;
  /** Rendered on top of the thumbnail, e.g. a remove badge. Kept outside the
   * tappable area so it doesn't open the viewer. */
  overlay?: React.ReactNode;
}

/**
 * A drill photo thumbnail that opens full screen when tapped. A drill's photo
 * is usually a setup diagram, which is unreadable at thumbnail size - so the
 * thumbnail on its own is close to useless.
 */
export function ExpandablePhoto({ uri, className, testID, overlay }: ExpandablePhotoProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View>
      <Pressable testID={testID ? `${testID}-expand` : undefined} onPress={() => setExpanded(true)}>
        <Image source={{ uri }} className={className} testID={testID} />
      </Pressable>
      {overlay}

      <Modal
        visible={expanded}
        transparent
        animationType="fade"
        onRequestClose={() => setExpanded(false)}
      >
        <Pressable
          testID={testID ? `${testID}-backdrop` : undefined}
          className="flex-1 items-center justify-center bg-black/90 p-4"
          onPress={() => setExpanded(false)}
        >
          <Image
            testID={testID ? `${testID}-full` : undefined}
            source={{ uri }}
            className="h-full w-full"
            resizeMode="contain"
          />
          <View className="absolute right-4 top-12 h-10 w-10 items-center justify-center rounded-full bg-black/60">
            <Ionicons name="close" size={24} color="white" />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

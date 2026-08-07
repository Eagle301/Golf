import { Pressable } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface HeaderBackButtonProps {
  /** Where to go when there's nothing to go back to - a web reload or a deep
   * link lands on a screen with an empty stack, and the default header back
   * button silently disappears in that case. */
  fallback: Href;
}

/**
 * Header back button that's always rendered, unlike the stack's default one.
 * Pass as `headerLeft` in a screen's `Stack.Screen` options.
 */
export function HeaderBackButton({ fallback }: HeaderBackButtonProps) {
  const router = useRouter();

  return (
    <Pressable
      testID="header-back-button"
      onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
      className="ml-2"
      hitSlop={8}
    >
      <Ionicons name="chevron-back" color="#FFFFFF" size={26} />
    </Pressable>
  );
}

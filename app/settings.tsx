import { View, Text } from 'react-native';
import { useThemePreference } from '@/lib/hooks/useThemePreference';
import type { ThemePreference } from '@/lib/theme/themePreference';
import { useParIndicatorPreference } from '@/lib/hooks/useParIndicatorPreference';
import type { ParIndicatorPreference } from '@/lib/parIndicatorPreference';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const PAR_INDICATOR_OPTIONS: { value: ParIndicatorPreference; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'par', label: 'Par' },
  { value: 'net_par', label: 'Net Par' },
];

export default function SettingsScreen() {
  const { preference, setPreference } = useThemePreference();
  const { preference: parIndicatorPreference, setPreference: setParIndicatorPreference } =
    useParIndicatorPreference();

  return (
    <View className="flex-1 bg-background px-4 pt-4 dark:bg-background-dark" testID="settings-screen">
      <Text className="mb-2 text-sm font-medium text-text-primary dark:text-text-primary-dark">Theme</Text>
      <Card className="mb-4 flex-row px-2 py-2">
        {THEME_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            testID={`theme-option-${opt.value}`}
            label={opt.label}
            variant={preference === opt.value ? 'primary' : 'secondary'}
            onPress={() => setPreference(opt.value)}
            containerClassName="flex-1 mx-1"
          />
        ))}
      </Card>

      <Text className="mb-2 text-sm font-medium text-text-primary dark:text-text-primary-dark">
        Par Indicator
      </Text>
      <Card className="flex-row px-2 py-2">
        {PAR_INDICATOR_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            testID={`par-indicator-option-${opt.value}`}
            label={opt.label}
            variant={parIndicatorPreference === opt.value ? 'primary' : 'secondary'}
            onPress={() => setParIndicatorPreference(opt.value)}
            containerClassName="flex-1 mx-1"
          />
        ))}
      </Card>

      <Text className="mb-2 mt-4 text-sm font-medium text-text-primary dark:text-text-primary-dark">
        Account
      </Text>
      <Button
        testID="sign-out-button"
        label="Sign Out"
        variant="destructive"
        onPress={() => supabase.auth.signOut()}
      />
    </View>
  );
}

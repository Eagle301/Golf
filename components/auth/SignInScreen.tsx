import { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';

export function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) setError(signInError.message);
  }

  return (
    <View
      className="flex-1 items-center justify-center bg-background px-6 dark:bg-background-dark"
      testID="sign-in-screen"
    >
      <Text className="mb-6 text-xl font-semibold text-text-primary dark:text-text-primary-dark">
        Golf Improvement
      </Text>

      <TextInput
        testID="sign-in-email"
        className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-text-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <TextInput
        testID="sign-in-password"
        className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-text-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#9CA3AF"
        autoComplete="password"
        secureTextEntry
        onSubmitEditing={handleSignIn}
      />

      {error && (
        <Text testID="sign-in-error" className="mb-3 text-center text-sm text-red-600">
          {error}
        </Text>
      )}

      <Button
        testID="sign-in-submit"
        label={submitting ? 'Signing in...' : 'Sign In'}
        onPress={handleSignIn}
        disabled={submitting || !email || !password}
        containerClassName="w-full"
      />
    </View>
  );
}

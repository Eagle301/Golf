# Theming Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the Augusta Green light/dark theming system (color tokens, NativeWind dark-mode wiring, persisted theme preference) and restyle `Button`/`Avatar` plus a new `Card` component, per `docs/superpowers/specs/2026-07-26-theming-foundation-design.md`.

**Architecture:** Semantic color tokens live once in `lib/theme/colors.ts` and are mirrored into `tailwind.config.js` as flat `dark:`-suffixed Tailwind color keys (e.g. `background` / `background-dark`), since NativeWind resolves `dark:` variants at the class level, not via nested color objects. A `lib/theme/themePreference.ts` module persists the user's `'system' | 'light' | 'dark'` choice to AsyncStorage; `lib/hooks/useThemePreference.ts` wraps NativeWind's `useColorScheme()` to apply that persisted preference on launch. The hook is invoked once from `app/_layout.tsx`, alongside the existing `useRoundSync()` call.

**Tech Stack:** React Native (Expo Router), NativeWind v4 (`dark:` class variants + `useColorScheme` from the `nativewind` package), `@react-native-async-storage/async-storage`, Jest + `@testing-library/react-native`.

## Global Constraints

- Brand color `#1B3B2B` is identical in light and dark mode (headers, primary CTAs, active nav).
- Light tokens: `background #EBF0E6`, `surface #F5F7F2`, `text-primary #111827`, `text-secondary #4B5563`, `accent #34D399`, `accent-blue #1D4ED8`, `accent-gold #EAB308`.
- Dark tokens: `background #121614`, `surface #1E2621`, `text-primary #F3F4F6`, `text-secondary #9CA3AF`, `accent-gold #F59E0B`, `border #2D3A32` (accent and accent-blue are unchanged from light mode).
- No new nav tabs, no Settings UI, no other components (StatBadge/ScorecardTable/LeaderboardRow/ChartContainer) in this phase — those are deferred to later plans.
- `Button` and `Avatar` public APIs (props) must not change — only internal class strings.
- Follow the existing co-located `__tests__` convention and the `@/` import alias (see `jest.config` `moduleNameMapper`).

---

### Task 1: Color tokens

**Files:**
- Create: `lib/theme/colors.ts`
- Test: `lib/theme/__tests__/colors.test.ts`

**Interfaces:**
- Produces: `colors: { brand: string; light: { background, surface, textPrimary, textSecondary, accent, accentBlue, accentGold: string }; dark: { background, surface, textPrimary, textSecondary, accent, accentBlue, accentGold, border: string } }` exported from `lib/theme/colors.ts`.

- [ ] **Step 1: Write the failing test**

Create `lib/theme/__tests__/colors.test.ts`:

```ts
import { colors } from '../colors';

describe('colors', () => {
  it('defines the brand color once for both themes', () => {
    expect(colors.brand).toBe('#1B3B2B');
  });

  it('defines all required light-mode tokens', () => {
    expect(colors.light).toEqual({
      background: '#EBF0E6',
      surface: '#F5F7F2',
      textPrimary: '#111827',
      textSecondary: '#4B5563',
      accent: '#34D399',
      accentBlue: '#1D4ED8',
      accentGold: '#EAB308',
    });
  });

  it('defines all required dark-mode tokens', () => {
    expect(colors.dark).toEqual({
      background: '#121614',
      surface: '#1E2621',
      textPrimary: '#F3F4F6',
      textSecondary: '#9CA3AF',
      accent: '#34D399',
      accentBlue: '#1D4ED8',
      accentGold: '#F59E0B',
      border: '#2D3A32',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/theme/__tests__/colors.test.ts`
Expected: FAIL with "Cannot find module '../colors'"

- [ ] **Step 3: Write minimal implementation**

Create `lib/theme/colors.ts`:

```ts
export const colors = {
  brand: '#1B3B2B',
  light: {
    background: '#EBF0E6',
    surface: '#F5F7F2',
    textPrimary: '#111827',
    textSecondary: '#4B5563',
    accent: '#34D399',
    accentBlue: '#1D4ED8',
    accentGold: '#EAB308',
  },
  dark: {
    background: '#121614',
    surface: '#1E2621',
    textPrimary: '#F3F4F6',
    textSecondary: '#9CA3AF',
    accent: '#34D399',
    accentBlue: '#1D4ED8',
    accentGold: '#F59E0B',
    border: '#2D3A32',
  },
} as const;

export type ThemeColors = typeof colors;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/theme/__tests__/colors.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/theme/colors.ts lib/theme/__tests__/colors.test.ts
git commit -m "feat: add Augusta Green light/dark color tokens"
```

---

### Task 2: Tailwind dark-mode config + semantic color classes

**Files:**
- Modify: `tailwind.config.js`
- Test: `lib/theme/__tests__/tailwindColors.test.ts`

**Interfaces:**
- Consumes: `colors` from `lib/theme/colors.ts` (Task 1) — values only, compared in the test (the config file itself uses literal hex strings, since Tailwind loads this file directly with plain `require`, not through Babel/TS).
- Produces: Tailwind color classes usable by any component: `bg-brand`, `bg-background`/`bg-background-dark`, `bg-surface`/`bg-surface-dark`, `text-text-primary`/`text-text-primary-dark`, `text-text-secondary`/`text-text-secondary-dark`, `bg-accent`, `bg-accent-blue`, `bg-accent-gold`/`bg-accent-gold-dark`, `border-border`. `darkMode: 'class'` is enabled so `dark:` variants work with NativeWind's `useColorScheme`.

- [ ] **Step 1: Write the failing test**

Create `lib/theme/__tests__/tailwindColors.test.ts`:

```ts
import tailwindConfig from '../../../tailwind.config.js';
import { colors } from '../colors';

describe('tailwind color tokens', () => {
  it('enables class-based dark mode', () => {
    expect(tailwindConfig.darkMode).toBe('class');
  });

  it('matches the semantic color tokens defined in lib/theme/colors.ts', () => {
    expect(tailwindConfig.theme.extend.colors).toEqual({
      brand: colors.brand,
      background: colors.light.background,
      'background-dark': colors.dark.background,
      surface: colors.light.surface,
      'surface-dark': colors.dark.surface,
      'text-primary': colors.light.textPrimary,
      'text-primary-dark': colors.dark.textPrimary,
      'text-secondary': colors.light.textSecondary,
      'text-secondary-dark': colors.dark.textSecondary,
      accent: colors.light.accent,
      'accent-blue': colors.light.accentBlue,
      'accent-gold': colors.light.accentGold,
      'accent-gold-dark': colors.dark.accentGold,
      border: colors.dark.border,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/theme/__tests__/tailwindColors.test.ts`
Expected: FAIL (`tailwindConfig.darkMode` is `undefined`, and `theme.extend.colors` is `undefined`)

- [ ] **Step 3: Write minimal implementation**

Replace the contents of `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: '#1B3B2B',
        background: '#EBF0E6',
        'background-dark': '#121614',
        surface: '#F5F7F2',
        'surface-dark': '#1E2621',
        'text-primary': '#111827',
        'text-primary-dark': '#F3F4F6',
        'text-secondary': '#4B5563',
        'text-secondary-dark': '#9CA3AF',
        accent: '#34D399',
        'accent-blue': '#1D4ED8',
        'accent-gold': '#EAB308',
        'accent-gold-dark': '#F59E0B',
        border: '#2D3A32',
      },
    },
  },
  plugins: [],
};
```

Note: Tailwind's built-in `text-primary`/`text-secondary` utility classes don't otherwise exist, so these keys are safe additions with no collisions in this project's `content` glob.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/theme/__tests__/tailwindColors.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.js lib/theme/__tests__/tailwindColors.test.ts
git commit -m "feat: enable class-based dark mode and semantic color tokens in Tailwind config"
```

---

### Task 3: Theme preference persistence

**Files:**
- Create: `lib/theme/themePreference.ts`
- Test: `lib/theme/__tests__/themePreference.test.ts`

**Interfaces:**
- Produces: `type ThemePreference = 'system' | 'light' | 'dark'`, `getThemePreference(): Promise<ThemePreference>` (defaults to `'system'` when nothing is stored or the stored value is invalid), `setThemePreference(preference: ThemePreference): Promise<void>`.

- [ ] **Step 1: Write the failing test**

Create `lib/theme/__tests__/themePreference.test.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getThemePreference, setThemePreference } from '../themePreference';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('themePreference', () => {
  it('defaults to system when nothing is stored', async () => {
    expect(await getThemePreference()).toBe('system');
  });

  it('persists and reloads a chosen preference', async () => {
    await setThemePreference('dark');
    expect(await getThemePreference()).toBe('dark');
  });

  it('falls back to system for a corrupted stored value', async () => {
    await AsyncStorage.setItem('golf.themePreference', 'not-a-real-value');
    expect(await getThemePreference()).toBe('system');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/theme/__tests__/themePreference.test.ts`
Expected: FAIL with "Cannot find module '../themePreference'"

- [ ] **Step 3: Write minimal implementation**

Create `lib/theme/themePreference.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_PREFERENCE_KEY = 'golf.themePreference';

export async function getThemePreference(): Promise<ThemePreference> {
  const raw = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return 'system';
}

export async function setThemePreference(preference: ThemePreference): Promise<void> {
  await AsyncStorage.setItem(THEME_PREFERENCE_KEY, preference);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/theme/__tests__/themePreference.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/theme/themePreference.ts lib/theme/__tests__/themePreference.test.ts
git commit -m "feat: persist theme preference to AsyncStorage"
```

---

### Task 4: useThemePreference hook

**Files:**
- Create: `lib/hooks/useThemePreference.ts`
- Test: `lib/hooks/__tests__/useThemePreference.test.ts`

**Interfaces:**
- Consumes: `getThemePreference`, `setThemePreference`, `ThemePreference` from `lib/theme/themePreference.ts` (Task 3); `useColorScheme` from the `nativewind` package (`{ colorScheme: 'light' | 'dark' | undefined; setColorScheme(scheme: 'light' | 'dark' | 'system'): void }`).
- Produces: `useThemePreference(): { preference: ThemePreference; colorScheme: 'light' | 'dark' | undefined; setPreference(next: ThemePreference): Promise<void> }`.

- [ ] **Step 1: Write the failing test**

Create `lib/hooks/__tests__/useThemePreference.test.ts`:

```ts
const mockSetColorScheme = jest.fn();

jest.mock('nativewind', () => ({
  useColorScheme: () => ({
    colorScheme: 'light',
    setColorScheme: mockSetColorScheme,
    toggleColorScheme: jest.fn(),
  }),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { setThemePreference } from '@/lib/theme/themePreference';
import { useThemePreference } from '../useThemePreference';

beforeEach(async () => {
  await AsyncStorage.clear();
  mockSetColorScheme.mockClear();
});

describe('useThemePreference', () => {
  it('applies the system default on first launch', async () => {
    const { result } = renderHook(() => useThemePreference());

    await waitFor(() => expect(mockSetColorScheme).toHaveBeenCalledWith('system'));
    expect(result.current.preference).toBe('system');
  });

  it('applies a previously persisted preference on mount', async () => {
    await setThemePreference('dark');
    const { result } = renderHook(() => useThemePreference());

    await waitFor(() => expect(result.current.preference).toBe('dark'));
    expect(mockSetColorScheme).toHaveBeenCalledWith('dark');
  });

  it('updates and persists a new preference', async () => {
    const { result } = renderHook(() => useThemePreference());
    await waitFor(() => expect(result.current.preference).toBe('system'));

    await act(async () => {
      await result.current.setPreference('dark');
    });

    expect(result.current.preference).toBe('dark');
    expect(mockSetColorScheme).toHaveBeenCalledWith('dark');
    expect(await AsyncStorage.getItem('golf.themePreference')).toBe('dark');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/hooks/__tests__/useThemePreference.test.ts`
Expected: FAIL with "Cannot find module '../useThemePreference'"

- [ ] **Step 3: Write minimal implementation**

Create `lib/hooks/useThemePreference.ts`:

```ts
import { useEffect, useState } from 'react';
import { useColorScheme } from 'nativewind';
import {
  getThemePreference,
  setThemePreference,
  type ThemePreference,
} from '@/lib/theme/themePreference';

export interface UseThemePreferenceResult {
  preference: ThemePreference;
  colorScheme: 'light' | 'dark' | undefined;
  setPreference: (next: ThemePreference) => Promise<void>;
}

export function useThemePreference(): UseThemePreferenceResult {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const stored = await getThemePreference();
      if (cancelled) return;
      setPreferenceState(stored);
      setColorScheme(stored);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [setColorScheme]);

  async function setPreference(next: ThemePreference): Promise<void> {
    setPreferenceState(next);
    setColorScheme(next);
    await setThemePreference(next);
  }

  return { preference, colorScheme, setPreference };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/hooks/__tests__/useThemePreference.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/useThemePreference.ts lib/hooks/__tests__/useThemePreference.test.ts
git commit -m "feat: add useThemePreference hook applying persisted theme on launch"
```

---

### Task 5: Wire theme preference into the root layout

**Files:**
- Modify: `app/_layout.tsx:1-9` (imports and body)
- Modify: `app/__tests__/_layout.test.tsx:1-2` (add mock)

**Interfaces:**
- Consumes: `useThemePreference` from `lib/hooks/useThemePreference.ts` (Task 4).

- [ ] **Step 1: Write the failing test**

Modify `app/__tests__/_layout.test.tsx` — add the mock alongside the existing ones, import `useThemePreference`, and add a new test asserting it's called:

```tsx
jest.mock('@/lib/hooks/useDevAutoSignIn', () => ({ useDevAutoSignIn: jest.fn() }));
jest.mock('@/lib/hooks/useRoundSync', () => ({ useRoundSync: jest.fn() }));
jest.mock('@/lib/hooks/useThemePreference', () => ({ useThemePreference: jest.fn() }));

import { render, screen } from '@testing-library/react-native';
import { useDevAutoSignIn } from '@/lib/hooks/useDevAutoSignIn';
import { useThemePreference } from '@/lib/hooks/useThemePreference';
import RootLayout from '../_layout';

describe('RootLayout', () => {
  it('shows a loading indicator until auth is ready', () => {
    (useDevAutoSignIn as jest.Mock).mockReturnValue({ ready: false, error: null });
    render(<RootLayout />);
    expect(screen.getByTestId('auth-loading')).toBeTruthy();
  });

  it('shows an error message when auto sign-in fails', () => {
    (useDevAutoSignIn as jest.Mock).mockReturnValue({ ready: true, error: 'invalid credentials' });
    render(<RootLayout />);
    expect(screen.getByText(/invalid credentials/)).toBeTruthy();
  });

  it('applies the persisted theme preference on launch', () => {
    (useDevAutoSignIn as jest.Mock).mockReturnValue({ ready: false, error: null });
    render(<RootLayout />);
    expect(useThemePreference).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest app/__tests__/_layout.test.tsx`
Expected: FAIL on "applies the persisted theme preference on launch" — `useThemePreference` mock was never called, since `app/_layout.tsx` doesn't import or call it yet.

- [ ] **Step 3: Wire the hook into the root layout**

Modify `app/_layout.tsx`:

```tsx
import '../global.css';
import { Stack } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { useDevAutoSignIn } from '@/lib/hooks/useDevAutoSignIn';
import { useRoundSync } from '@/lib/hooks/useRoundSync';
import { useThemePreference } from '@/lib/hooks/useThemePreference';

export default function RootLayout() {
  const { ready, error } = useDevAutoSignIn();
  useRoundSync();
  useThemePreference();

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark">
        <ActivityIndicator testID="auth-loading" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-background-dark">
        <Text className="text-center text-red-600">Sign-in failed: {error}</Text>
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="round/[id]" options={{ title: 'Round' }} />
      <Stack.Screen name="round/scorecard" options={{ title: 'Scorecard' }} />
      <Stack.Screen name="course/[id]" options={{ title: 'Course' }} />
    </Stack>
  );
}
```

(The `bg-white` → `bg-background`/`bg-background-dark` swap is in scope here since this file is already being touched to wire the hook, and it's the app's outermost background.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest app/__tests__/_layout.test.tsx`
Expected: PASS (3 tests — `useThemePreference`'s mock returns `undefined` by default, which `RootLayout` ignores since it doesn't use the return value)

- [ ] **Step 5: Commit**

```bash
git add app/_layout.tsx app/__tests__/_layout.test.tsx
git commit -m "feat: apply persisted theme preference on app launch"
```

---

### Task 6: Card component

**Files:**
- Create: `components/ui/Card.tsx`
- Test: `components/ui/__tests__/Card.test.tsx`

**Interfaces:**
- Produces: `Card({ className?: string; testID?: string; children: ReactNode } & ViewProps)` — a themed container component, default-exported as a named export `Card` (matching `Button`/`Avatar`'s named-export convention).

- [ ] **Step 1: Write the failing test**

Create `components/ui/__tests__/Card.test.tsx`:

```tsx
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Card } from '../Card';

describe('Card', () => {
  it('renders its children', () => {
    render(
      <Card testID="my-card">
        <Text>Hole 4</Text>
      </Card>
    );
    expect(screen.getByText('Hole 4')).toBeTruthy();
  });

  it('applies the themed surface and radius classes', () => {
    render(<Card testID="my-card" />);
    expect(screen.getByTestId('my-card').props.className).toEqual(
      expect.stringContaining('bg-surface')
    );
    expect(screen.getByTestId('my-card').props.className).toEqual(
      expect.stringContaining('dark:bg-surface-dark')
    );
  });

  it('merges a passed-in className with the default classes', () => {
    render(<Card testID="my-card" className="mt-4" />);
    expect(screen.getByTestId('my-card').props.className).toEqual(
      expect.stringContaining('mt-4')
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest components/ui/__tests__/Card.test.tsx`
Expected: FAIL with "Cannot find module '../Card'"

- [ ] **Step 3: Write minimal implementation**

Create `components/ui/Card.tsx`:

```tsx
import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  className?: string;
}

/** Themed container: soft surface + shadow in light mode, bordered surface in dark mode. */
export function Card({ className = '', children, ...viewProps }: CardProps) {
  return (
    <View
      className={`rounded-2xl bg-surface p-4 shadow-sm dark:border dark:border-border dark:bg-surface-dark dark:shadow-none ${className}`}
      {...viewProps}
    >
      {children}
    </View>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest components/ui/__tests__/Card.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add components/ui/Card.tsx components/ui/__tests__/Card.test.tsx
git commit -m "feat: add themed Card container component"
```

---

### Task 7: Restyle Button

**Files:**
- Modify: `components/ui/Button.tsx`
- Modify: `components/ui/__tests__/Button.test.tsx`

**Interfaces:**
- Produces: unchanged `Button` props (`label`, `variant`, `disabled`, `containerClassName`, `testID`, plus `PressableProps`). Only internal class strings change.

- [ ] **Step 1: Write the failing tests**

Add to `components/ui/__tests__/Button.test.tsx` (append new `describe` block, keep the existing two tests as-is):

```tsx
describe('Button theming', () => {
  // Button's testID lives on the outer Pressable (a composite component whose
  // children is a pressed-state render-prop function), not on the styled
  // inner View - so we assert against the full rendered JSON tree rather than
  // reading `.props.className` off a single queried instance.
  it('styles the primary variant as a brand-green pill with a dark-mode gold fill', () => {
    const { toJSON } = render(<Button testID="btn" label="Continue" onPress={() => {}} variant="primary" />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('bg-brand');
    expect(tree).toContain('dark:bg-accent-gold-dark');
    expect(tree).toContain('rounded-full');
  });

  it('styles the secondary variant as an outlined pill', () => {
    const { toJSON } = render(<Button testID="btn" label="Cancel" onPress={() => {}} variant="secondary" />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('border-brand');
    expect(tree).toContain('rounded-full');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest components/ui/__tests__/Button.test.tsx`
Expected: FAIL — current classes are `rounded bg-green-600 py-3` (no `bg-brand`, no `rounded-full`, no `dark:` classes)

- [ ] **Step 3: Write minimal implementation**

Replace the class maps in `components/ui/Button.tsx` (keep the rest of the file — imports, `ButtonProps`, `ButtonVariant`, and the `Button` function body — unchanged):

```ts
const CONTAINER: Record<ButtonVariant, string> = {
  primary: 'rounded-full bg-brand py-3 dark:bg-accent-gold-dark',
  secondary: 'rounded-full border border-brand bg-transparent py-3 dark:border-text-primary-dark',
  destructive: 'rounded-full border border-red-600 py-3',
  link: 'py-2',
};

const CONTAINER_DISABLED: Record<ButtonVariant, string> = {
  primary: 'rounded-full bg-gray-300 py-3 dark:bg-gray-700',
  secondary: 'rounded-full border border-gray-300 bg-transparent py-3 dark:border-gray-700',
  destructive: 'rounded-full border border-gray-300 py-3 dark:border-gray-700',
  link: 'py-2',
};

const TEXT: Record<ButtonVariant, string> = {
  primary: 'font-medium text-white dark:text-gray-900',
  secondary: 'font-medium text-brand dark:text-text-primary-dark',
  destructive: 'font-medium text-red-600',
  link: 'font-medium text-brand dark:text-accent-gold-dark',
};

const TEXT_DISABLED: Record<ButtonVariant, string> = {
  primary: 'font-medium text-white dark:text-gray-500',
  secondary: 'font-medium text-gray-400',
  destructive: 'font-medium text-gray-400',
  link: 'font-medium text-gray-400',
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest components/ui/__tests__/Button.test.tsx`
Expected: PASS (4 tests: the original 2 + the 2 new theming tests)

- [ ] **Step 5: Commit**

```bash
git add components/ui/Button.tsx components/ui/__tests__/Button.test.tsx
git commit -m "feat: restyle Button with Augusta Green pill variants and dark mode"
```

---

### Task 8: Restyle Avatar

**Files:**
- Modify: `components/ui/Avatar.tsx:16`
- Modify: `components/ui/__tests__/Avatar.test.tsx`

**Interfaces:**
- Produces: unchanged `Avatar` props (`name`, `size`, `testID`). Only the fill color changes.

- [ ] **Step 1: Write the failing test**

Add to `components/ui/__tests__/Avatar.test.tsx` (append, keep existing tests as-is):

```tsx
it('fills with the brand color', () => {
  render(<Avatar name="Jane Golfer" testID="avatar" />);
  expect(screen.getByTestId('avatar').props.className).toEqual(
    expect.stringContaining('bg-brand')
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest components/ui/__tests__/Avatar.test.tsx`
Expected: FAIL — current class is `bg-green-700`, not `bg-brand`

- [ ] **Step 3: Write minimal implementation**

In `components/ui/Avatar.tsx`, change line 16 from:

```tsx
      className="items-center justify-center rounded-full bg-green-700"
```

to:

```tsx
      className="items-center justify-center rounded-full bg-brand"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest components/ui/__tests__/Avatar.test.tsx`
Expected: PASS (4 tests: the original 3 + the new theming test)

- [ ] **Step 5: Commit**

```bash
git add components/ui/Avatar.tsx components/ui/__tests__/Avatar.test.tsx
git commit -m "feat: restyle Avatar fill with brand color"
```

---

## Final verification

- [ ] Run the full test suite: `npx jest`
- Expected: all tests pass, including the 8 tasks' new/updated suites above and every pre-existing suite (unaffected by these changes).

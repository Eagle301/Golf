# Phase 2a: Nav Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Theme the tab bar (icons, active/inactive tint, background) and every screen header across the app to the Phase 1 brand palette, with correct light/dark behavior.

**Architecture:** Two new pure, fully-unit-tested modules under `lib/theme/` compute the literal hex/name values that React Navigation's `screenOptions` API needs (it does not accept NativeWind `className` strings). `app/(tabs)/_layout.tsx` and `app/_layout.tsx` (plus the three screens with their own header options) consume these modules via `useColorScheme()` from `nativewind`. The `Tabs`/`Stack` component trees themselves are not directly testable in this codebase's Jest setup (verified empirically — rendering them outside expo-router's real file-based context throws `"No filename found. This is likely a bug in expo-router."`, and the existing `app/__tests__/_layout.test.tsx` file only ever exercises the loading/error early-return branches, never the `<Stack>` return), so all logic worth testing is pushed into the two pure modules; the `_layout.tsx`/screen wiring itself is thin, untested glue, verified only by the full existing suite continuing to pass and manual verification.

**Tech Stack:** Expo Router (`expo-router`), NativeWind v4 (`nativewind`'s `useColorScheme`), `@expo/vector-icons` (Ionicons), Jest + `@testing-library/react-native`.

## Global Constraints

- No new bottom-nav tabs — only the existing three (Dashboard/Rounds/Courses) get icons.
- No new custom header component — restyle the default Expo Router header via `screenOptions`/`options`, per the approved spec.
- Tab bar active tint: brand token (`colors.brand` hex `#1B3B2B` in light, `colors.dark.accentGold` hex `#F59E0B` in dark — matches the Button primary variant's dark-mode gold fill from Phase 1 for visual consistency).
- Tab bar inactive tint: `colors.light.textSecondary` (`#4B5563`) in light, `colors.dark.textSecondary` (`#9CA3AF`) in dark.
- Tab bar / header background: `colors.light.surface` (`#F5F7F2`) in light, `colors.dark.surface` (`#1E2621`) in dark.
- Header title/tint color: `colors.light.textPrimary` (`#111827`) in light, `colors.dark.textPrimary` (`#F3F4F6`) in dark.
- Icon set: Ionicons via `@expo/vector-icons/Ionicons` (already resolvable — confirmed via `require.resolve('@expo/vector-icons/build/Ionicons.js')` — no new dependency to add).
- Tab icons: Dashboard → `home`/`home-outline`, Rounds → `list`/`list-outline`, Courses → `golf`/`golf-outline` (filled when focused, outline when not).
- `@testing-library/react-native`'s `render()` cannot render `expo-router`'s `Tabs`/`Stack.Screen` trees directly outside a real route context in this project's Jest setup — do not attempt to add tests that render `TabsLayout` or `RootLayout` and assert on tab bar/header props. Test only the pure helper modules.

---

### Task 1: Navigation color helper

**Files:**
- Create: `lib/theme/navigationColors.ts`
- Test: `lib/theme/__tests__/navigationColors.test.ts`

**Interfaces:**
- Consumes: `colors` from `lib/theme/colors.ts` (existing — `colors.brand`, `colors.light.*`, `colors.dark.*`, all plain hex string constants).
- Produces: `getNavigationColors(scheme: 'light' | 'dark' | undefined | null): NavigationColors`, where
  ```ts
  export interface NavigationColors {
    headerBackground: string;
    headerTint: string;
    tabBarBackground: string;
    tabBarActiveTint: string;
    tabBarInactiveTint: string;
  }
  ```
  Task 2 and Task 3 both call this function.

- [ ] **Step 1: Write the failing test**

Create `lib/theme/__tests__/navigationColors.test.ts`:

```ts
import { getNavigationColors } from '../navigationColors';

describe('getNavigationColors', () => {
  it('returns light-mode colors for "light"', () => {
    expect(getNavigationColors('light')).toEqual({
      headerBackground: '#F5F7F2',
      headerTint: '#111827',
      tabBarBackground: '#F5F7F2',
      tabBarActiveTint: '#1B3B2B',
      tabBarInactiveTint: '#4B5563',
    });
  });

  it('returns dark-mode colors for "dark"', () => {
    expect(getNavigationColors('dark')).toEqual({
      headerBackground: '#1E2621',
      headerTint: '#F3F4F6',
      tabBarBackground: '#1E2621',
      tabBarActiveTint: '#F59E0B',
      tabBarInactiveTint: '#9CA3AF',
    });
  });

  it('defaults to light-mode colors when scheme is undefined or null', () => {
    expect(getNavigationColors(undefined)).toEqual(getNavigationColors('light'));
    expect(getNavigationColors(null)).toEqual(getNavigationColors('light'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/theme/__tests__/navigationColors.test.ts`
Expected: FAIL with "Cannot find module '../navigationColors'"

- [ ] **Step 3: Write minimal implementation**

Create `lib/theme/navigationColors.ts`:

```ts
import { colors } from './colors';

export interface NavigationColors {
  headerBackground: string;
  headerTint: string;
  tabBarBackground: string;
  tabBarActiveTint: string;
  tabBarInactiveTint: string;
}

export function getNavigationColors(
  scheme: 'light' | 'dark' | undefined | null
): NavigationColors {
  if (scheme === 'dark') {
    return {
      headerBackground: colors.dark.surface,
      headerTint: colors.dark.textPrimary,
      tabBarBackground: colors.dark.surface,
      tabBarActiveTint: colors.dark.accentGold,
      tabBarInactiveTint: colors.dark.textSecondary,
    };
  }

  return {
    headerBackground: colors.light.surface,
    headerTint: colors.light.textPrimary,
    tabBarBackground: colors.light.surface,
    tabBarActiveTint: colors.brand,
    tabBarInactiveTint: colors.light.textSecondary,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/theme/__tests__/navigationColors.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/theme/navigationColors.ts lib/theme/__tests__/navigationColors.test.ts
git commit -m "feat: add navigation color helper for header/tab-bar theming"
```

---

### Task 2: Tab icon helper

**Files:**
- Create: `lib/theme/tabIcons.ts`
- Test: `lib/theme/__tests__/tabIcons.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `getTabIconName(routeName: string, focused: boolean): keyof typeof Ionicons.glyphMap`, consumed by Task 3's `app/(tabs)/_layout.tsx` wiring. Also exports `TAB_ICON_NAMES` (the raw route→{focused, unfocused} map) for direct inspection in tests.

- [ ] **Step 1: Write the failing test**

Create `lib/theme/__tests__/tabIcons.test.ts`:

```ts
import { getTabIconName } from '../tabIcons';

describe('getTabIconName', () => {
  it('returns the filled home icon when Dashboard is focused', () => {
    expect(getTabIconName('index', true)).toBe('home');
  });

  it('returns the outline home icon when Dashboard is not focused', () => {
    expect(getTabIconName('index', false)).toBe('home-outline');
  });

  it('returns the filled list icon when Rounds is focused', () => {
    expect(getTabIconName('rounds', true)).toBe('list');
  });

  it('returns the outline list icon when Rounds is not focused', () => {
    expect(getTabIconName('rounds', false)).toBe('list-outline');
  });

  it('returns the filled golf icon when Courses is focused', () => {
    expect(getTabIconName('courses', true)).toBe('golf');
  });

  it('returns the outline golf icon when Courses is not focused', () => {
    expect(getTabIconName('courses', false)).toBe('golf-outline');
  });

  it('falls back to a question-mark icon for an unknown route', () => {
    expect(getTabIconName('unknown-route', true)).toBe('help-circle');
    expect(getTabIconName('unknown-route', false)).toBe('help-circle-outline');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/theme/__tests__/tabIcons.test.ts`
Expected: FAIL with "Cannot find module '../tabIcons'"

- [ ] **Step 3: Write minimal implementation**

Create `lib/theme/tabIcons.ts`:

```ts
import type { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

export const TAB_ICON_NAMES: Record<string, { focused: IconName; unfocused: IconName }> = {
  index: { focused: 'home', unfocused: 'home-outline' },
  rounds: { focused: 'list', unfocused: 'list-outline' },
  courses: { focused: 'golf', unfocused: 'golf-outline' },
};

const FALLBACK_ICON: { focused: IconName; unfocused: IconName } = {
  focused: 'help-circle',
  unfocused: 'help-circle-outline',
};

export function getTabIconName(routeName: string, focused: boolean): IconName {
  const icons = TAB_ICON_NAMES[routeName] ?? FALLBACK_ICON;
  return focused ? icons.focused : icons.unfocused;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/theme/__tests__/tabIcons.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/theme/tabIcons.ts lib/theme/__tests__/tabIcons.test.ts
git commit -m "feat: add tab icon name helper"
```

---

### Task 3: Wire tab bar theming and icons into the tabs layout

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: `getNavigationColors` from Task 1 (`lib/theme/navigationColors.ts`), `getTabIconName` from Task 2 (`lib/theme/tabIcons.ts`), `useColorScheme` from `nativewind`.
- Produces: nothing consumed by later tasks — this is a leaf screen file.

**No test for this step** — per Global Constraints, `expo-router`'s `Tabs` cannot be rendered directly in this project's Jest setup outside a real route context (verified: throws `"No filename found. This is likely a bug in expo-router."`). Verification is: (a) the full existing suite still passes (nothing here changes any tested behavior), and (b) manual visual check in Expo Go / the simulator.

- [ ] **Step 1: Replace the tabs layout**

Replace the full contents of `app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { getNavigationColors } from '@/lib/theme/navigationColors';
import { getTabIconName } from '@/lib/theme/tabIcons';

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const nav = getNavigationColors(colorScheme);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: nav.tabBarActiveTint,
        tabBarInactiveTintColor: nav.tabBarInactiveTint,
        tabBarStyle: { backgroundColor: nav.tabBarBackground },
        headerStyle: { backgroundColor: nav.headerBackground },
        headerTintColor: nav.headerTint,
        tabBarIcon: ({ color, focused, size }) => (
          <Ionicons name={getTabIconName(route.name, focused)} color={color} size={size} />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="rounds" options={{ title: 'Rounds' }} />
      <Tabs.Screen name="courses" options={{ title: 'Courses' }} />
    </Tabs>
  );
}
```

- [ ] **Step 2: Run the full test suite to confirm no regressions**

Run: `npx jest`
Expected: PASS (all suites — same count as before this task, since this file has no dedicated test)

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/_layout.tsx"
git commit -m "feat: theme tab bar and add per-tab icons"
```

---

### Task 4: Wire header theming into the root stack and remaining screens

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `app/round/[id].tsx` (header `options` only — do not touch the existing `headerRight` scorecard-link button)
- Modify: `app/round/scorecard.tsx`
- Modify: `app/course/[id].tsx`
- Test: `app/__tests__/_layout.test.tsx` (verify no regressions — no new assertions added, see note below)

**Interfaces:**
- Consumes: `getNavigationColors` from Task 1, `useColorScheme` from `nativewind`.
- Produces: nothing consumed by later tasks.

**No new tests in this task** — same rendering limitation as Task 3 applies to `<Stack>`/`<Stack.Screen>`. The existing `app/__tests__/_layout.test.tsx` only exercises the loading/error branches (never the `<Stack>` return), so it is unaffected by this change; it is re-run to confirm that remains true (no accidental breakage of the loading/error paths).

- [ ] **Step 1: Theme the root stack's screenOptions**

In `app/_layout.tsx`, add the `useColorScheme` import and apply themed `screenOptions` to the root `<Stack>`. Replace:

```tsx
import '../global.css';
import { Stack } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { useDevAutoSignIn } from '@/lib/hooks/useDevAutoSignIn';
import { useRoundSync } from '@/lib/hooks/useRoundSync';
import { useThemePreference } from '@/lib/hooks/useThemePreference';
```

with:

```tsx
import '../global.css';
import { Stack } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useDevAutoSignIn } from '@/lib/hooks/useDevAutoSignIn';
import { useRoundSync } from '@/lib/hooks/useRoundSync';
import { useThemePreference } from '@/lib/hooks/useThemePreference';
import { getNavigationColors } from '@/lib/theme/navigationColors';
```

Then, inside `RootLayout`, add the color lookup right after the existing hook calls:

```tsx
export default function RootLayout() {
  const { ready, error } = useDevAutoSignIn();
  useRoundSync();
  useThemePreference();
  const { colorScheme } = useColorScheme();
  const nav = getNavigationColors(colorScheme);
```

Finally, replace the closing `<Stack>` block:

```tsx
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

with:

```tsx
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: nav.headerBackground },
        headerTintColor: nav.headerTint,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="round/[id]" options={{ title: 'Round' }} />
      <Stack.Screen name="round/scorecard" options={{ title: 'Scorecard' }} />
      <Stack.Screen name="course/[id]" options={{ title: 'Course' }} />
    </Stack>
  );
}
```

- [ ] **Step 2: Run the root layout test to confirm no regressions**

Run: `npx jest app/__tests__/_layout.test.tsx`
Expected: PASS (3 tests — unchanged, since these tests only hit the loading/error branches)

- [ ] **Step 3: Remove now-redundant per-screen header options**

`app/round/[id].tsx`, `app/round/scorecard.tsx`, and `app/course/[id].tsx` inherit their header background/tint from the root `Stack`'s `screenOptions` set in Step 1 — no per-screen changes are needed for header color theming. Read each file's `Stack.Screen` (in `app/_layout.tsx`, already covers all three) and any local `Stack.Screen options` calls inside the screen files themselves:

Run: `npx jest --listTests > /dev/null; true` (no-op sanity check that the project still parses)

Then search for any screen-local header overrides that would fight the new root theming:

```bash
grep -rn "headerStyle\|headerTintColor" "app/round/[id].tsx" "app/round/scorecard.tsx" "app/course/[id].tsx"
```

Expected: no matches (these files only use `options={{ title: ... }}` or the existing `headerRight`, not `headerStyle`/`headerTintColor` — confirmed by the Phase 2a survey). If a match is found, remove only the conflicting `headerStyle`/`headerTintColor` keys from that screen's `options`, leaving `title`/`headerRight` untouched, so the root `screenOptions` themed values apply.

- [ ] **Step 4: Run the full test suite to confirm no regressions**

Run: `npx jest`
Expected: PASS (all suites — same count as before this task)

- [ ] **Step 5: Commit**

```bash
git add app/_layout.tsx "app/round/[id].tsx" app/round/scorecard.tsx "app/course/[id].tsx"
git commit -m "feat: theme header bar across all screens via root stack screenOptions"
```

---

## Self-Review Notes

- **Spec coverage:** Tab icons (spec 2a bullet 1) → Tasks 2, 3. Tab bar active/inactive/background tint (spec 2a bullet 2-4) → Tasks 1, 3. Header theming across all `Stack`/`Tabs` screens (spec 2a bullet 5-6) → Tasks 1, 4. The spec's "exact glyph names finalized during planning" open question is resolved: `home`/`list`/`golf` (+ `-outline` variants), confirmed to exist in `Ionicons.glyphMap` as standard Ionicons names.
- **Placeholder scan:** none found — every step has complete code and exact commands.
- **Type consistency:** `NavigationColors` (Task 1) and `getTabIconName`'s return type (Task 2) are both consumed as-written by Task 3's `app/(tabs)/_layout.tsx` and Task 4's `app/_layout.tsx` — field names (`headerBackground`, `headerTint`, `tabBarBackground`, `tabBarActiveTint`, `tabBarInactiveTint`) match exactly between producer and consumers.
- **Testability gap (flagged, not a placeholder):** Tasks 3 and 4 have no dedicated new tests, because `Tabs`/`Stack` cannot be rendered standalone in this project's Jest environment (empirically verified before writing this plan). This mirrors the Phase 1 precedent where `useThemePreference`'s AsyncStorage wiring itself wasn't deeply tested beyond what was practical — here, all logic dense enough to be worth testing (color computation, icon selection) lives in the two pure modules from Tasks 1-2, which are fully unit tested.

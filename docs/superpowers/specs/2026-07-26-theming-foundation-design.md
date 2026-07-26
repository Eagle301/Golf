# Theming Foundation + Core Components — Design Spec

Date: 2026-07-26
Status: Approved

## Context

The user wants a full front-end redesign of the Golf app (React Native / Expo Router
/ NativeWind) based on a detailed brand palette and component spec ("Augusta
Green" theme, light/dark mode, 5-tab bottom nav, new UI component library).

The full redesign is too large for a single spec. This is **Phase 1** of a
multi-phase effort:

- **Phase 1 (this spec):** theming infrastructure (color tokens, light/dark
  switching, persistence) + restyle of the two existing generic UI components
  (`Button`, `Avatar`) + a new `Card` component.
- **Phase 2+ (future specs):** bottom nav / header shell redesign (including
  the two nav tabs — Play, Community — that don't exist as screens yet),
  remaining component library pieces (StatBadge, ScorecardTable restyle,
  LeaderboardRow, ChartContainer), and retrofitting existing screens
  (Dashboard, Rounds, Courses, Round detail, Scorecard) to the new look.

Current state relevant to this phase:

- `components/ui/Button.tsx`, `components/ui/Avatar.tsx` exist and are
  generic/theme-agnostic today (hardcoded Tailwind color classes, no dark
  mode).
- No dark mode or theme-preference infrastructure exists anywhere in the app.
- `tailwind.config.js` has no `darkMode` setting and no extended color
  tokens — components currently use raw Tailwind palette classes
  (`bg-green-600`, `bg-gray-300`, etc.) directly.
- NativeWind v4 (already a dependency) supports `dark:` class variants driven
  by `useColorScheme()`, including a `setColorScheme` override — this maps
  directly onto the "system + manual override" requirement without adding a
  new library.

## Goals

- Establish a semantic color token system (light + dark) matching the
  provided brand palette.
- Enable dark mode across the app via NativeWind `dark:` variants.
- Support system-driven theme by default, with a persisted manual override
  (`'system' | 'light' | 'dark'`), available for a future Settings toggle.
- Restyle `Button` and `Avatar` to the new palette without changing their
  public APIs (no call-site changes required).
- Add a new themed `Card` container component for future screens to use.

## Non-goals (deferred to later phases)

- Bottom nav / header bar redesign, and the new Play/Community tabs.
- StatBadge, ScorecardTable, LeaderboardRow, ChartContainer components.
- Any Settings screen UI for the theme toggle (the hook is built to support
  one later, but no UI is added now).
- Retrofitting Dashboard, Rounds, Courses, Round detail, or Scorecard screens.

## Design

### Color tokens

New file `lib/theme/colors.ts` exports the palette as plain JS constants (for
use anywhere a raw color value is needed — chart libraries, `StatusBar`
style, native shadow colors) plus the same values are added to
`tailwind.config.js` under `theme.extend.colors` as semantic names:

| Token | Light | Dark |
|---|---|---|
| `brand` | `#1B3B2B` (same both modes — headers, primary CTAs, active nav) | `#1B3B2B` |
| `background` | `#EBF0E6` | `#121614` |
| `surface` | `#F5F7F2` | `#1E2621` |
| `text-primary` | `#111827` | `#F3F4F6` |
| `text-secondary` | `#4B5563` | `#9CA3AF` |
| `accent` | `#34D399` | `#34D399` |
| `accent-blue` | `#1D4ED8` | `#1D4ED8` |
| `accent-gold` | `#EAB308` | `#F59E0B` |
| `border` | transparent (cards use shadow instead) | `#2D3A32` |

`tailwind.config.js` gains `darkMode: 'class'` so `dark:` variants work with
NativeWind's colorScheme-driven root class.

### Theme preference hook

New `lib/hooks/useThemePreference.ts`:

- Wraps NativeWind's `useColorScheme()` (`colorScheme`, `setColorScheme`).
- On mount, reads a persisted preference (`'system' | 'light' | 'dark'`) from
  AsyncStorage under a dedicated key and applies it via `setColorScheme`
  before first paint (loading state mirrors the existing
  `useDevAutoSignIn` pattern in `app/_layout.tsx` — brief blank/loading frame
  is acceptable).
- Exposes `{ preference, setPreference }` where `setPreference` updates both
  NativeWind's color scheme and AsyncStorage.
- No UI consumes `setPreference` yet in this phase — the hook is invoked
  once at the root layout to apply the persisted/system preference, same
  pattern as `useRoundSync()` in `app/_layout.tsx`.

### Component changes

**`Button` (`components/ui/Button.tsx`)** — API unchanged
(`variant`, `disabled`, `containerClassName`, `testID`, `label`). Class maps
updated to use semantic tokens and pill shape (`rounded-full`):

- `primary`: `bg-brand dark:bg-accent-gold` background, white text in light
  mode / dark text in dark mode (gold background needs dark text for
  contrast).
- `secondary`: muted forest-green outline/pill, themed text.
- `destructive`: kept as an outlined red pill (unchanged semantics, updated
  radius).
- `link`: unchanged structurally, themed text color.
- Disabled states: muted gray in both modes, kept distinct from
  `secondary`.

**`Avatar` (`components/ui/Avatar.tsx`)** — swap `bg-green-700` →
`bg-brand`. No other changes; already theme-agnostic (solid fill + white
initials).

**`Card` (new: `components/ui/Card.tsx`)** — themed container:

```
bg-surface dark:bg-surface-dark rounded-2xl
+ light mode: subtle drop shadow
+ dark mode: border border-border (1px, #2D3A32), no shadow
```

Accepts a `className` passthrough prop (matching `Button`'s
`containerClassName` convention) for spacing/layout, and renders `children`.
No variants needed for this phase — just the one container style described
in the spec.

### Testing

Following the existing co-located `__tests__` convention
(`@testing-library/react-native`):

- Update `components/ui/__tests__/Button.test.tsx` for new class
  expectations per variant.
- Update `components/ui/__tests__/Avatar.test.tsx` for the `bg-brand` class.
- Add `components/ui/__tests__/Card.test.tsx` covering render + className
  passthrough.
- No dedicated test for the theme hook's AsyncStorage persistence beyond
  what's practical to mock — follow whatever pattern `useDevAutoSignIn`'s
  existing tests (if any) already use for AsyncStorage mocking.

## Open questions / risks

- None blocking. The gold-background-needs-dark-text contrast detail on the
  primary button (dark mode) is called out above so it doesn't get missed
  during implementation.

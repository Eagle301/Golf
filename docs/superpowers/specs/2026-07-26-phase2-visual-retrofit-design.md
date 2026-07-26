# Phase 2: App-Wide Visual Retrofit — Design Spec

Date: 2026-07-26
Status: Approved

## Context

Phase 1 (theming foundation — committed and pushed to `origin/main`) established
semantic color tokens, dark mode, and restyled the two existing generic UI
components (`Button`, `Avatar`) plus a new `Card` component. None of the
app's actual screens use these tokens or components yet — every screen and
supporting component still uses hardcoded Tailwind grays/greens/whites with
no dark-mode variants (confirmed via codebase survey).

Phase 2 retrofits the app itself to the new visual language established in
Phase 1. It is too large for a single spec/plan, so it is split into four
independently shippable sub-phases, executed in order:

- **2a. Nav shell** — tab bar icons + active/inactive theming, header bar
  theming across all screens.
- **2b. Dashboard** — `app/(tabs)/index.tsx` + the 5 chart components in
  `components/dashboard/`.
- **2c. Rounds + Courses** — `app/(tabs)/rounds.tsx`, `app/(tabs)/courses.tsx`,
  `app/course/[id].tsx`.
- **2d. Round detail + Scorecard** — `app/round/[id].tsx`,
  `components/round/Scorecard.tsx`, `components/round/RoundOverviewScorecard.tsx`,
  `app/round/scorecard.tsx`.

No new nav tabs are in scope (only the existing Dashboard/Rounds/Courses
three).

## Goals

- Retheme every screen and supporting component to the Phase 1 semantic
  tokens (`bg-background`, `bg-surface`, `bg-brand`, `text-primary`,
  `text-secondary`, and their `dark:` variants), with dark mode working
  correctly everywhere.
- Adopt `Card` for ad-hoc container styling app-wide (dashboard sections,
  chart wrappers, list rows where a card affordance fits, stat-summary
  blocks).
- Adopt `Button` for all raw `Pressable` action buttons (start-round,
  add-course FAB, save/delete, hole-count toggle pills).
- Add tab bar icons (Ionicons via `@expo/vector-icons`, already an
  available dependency — outline inactive / filled active, brand-tinted).
- Theme headers via `screenOptions` (`headerStyle`, `headerTintColor`,
  `headerTitleStyle`) — no new custom header component.

## Non-goals (explicit exclusions)

- No new bottom-nav tabs.
- No new header component — default Expo Router header, restyled in place.
- The Scorecard grid's score-color coding (birdie/par/bogey/etc., currently
  hardcoded orange/red/blue/gray) is **left untouched** — only the
  surrounding chrome (header row, stat-summary blocks, backgrounds) is
  retokenized.
- In-SVG data-visualization fill colors inside the 5 dashboard chart
  components (chart lines, donut segments) are left untouched — these
  encode data, not chrome. Only the chart's surrounding container/text is
  retokenized.
- No changes to business logic, data fetching, or existing test assertions
  beyond updating themed-class expectations.

## Design

### 2a. Nav shell

**`app/(tabs)/_layout.tsx`:**
- Add per-tab Ionicons (via `@expo/vector-icons`, already resolvable —
  no new dependency): outline glyph inactive, filled glyph active.
  Suggested glyphs: Dashboard → `home-outline`/`home`, Rounds →
  `list-outline`/`list`, Courses → `golf-outline`/`golf` (exact glyph
  names finalized during planning against the installed Ionicons set).
- `tabBarActiveTintColor`: brand token (`colors.brand` in light,
  `accent-gold-dark` hex in dark — read via `useColorScheme()` since
  `screenOptions` needs literal color values, not className strings).
- `tabBarInactiveTintColor`: `text-secondary` token equivalent.
- `tabBarStyle`: background themed to `surface`/`surface-dark`.

**Headers (all `Stack`/`Tabs` screens):**
- `screenOptions` (or per-screen `options`) sets `headerStyle.backgroundColor`
  to `surface`/`surface-dark`, `headerTintColor` to `text-primary`/dark
  equivalent, `headerTitleStyle.color` matching.
- Because React Navigation's `screenOptions` colors are plain values (not
  NativeWind classNames), these read from `lib/theme/colors.ts` directly
  gated on `useColorScheme()`, mirroring how `StatusBar` style would be
  chosen.

### 2b. Dashboard

- `app/(tabs)/index.tsx`: root `ScrollView` background →
  `bg-background dark:bg-background-dark`. Every ad-hoc card container
  (`rounded-lg bg-white`, `bg-gray-50`, `bg-gray-100`) → `Card` with
  `className` passthrough for spacing.
- 5 components in `components/dashboard/` (`ScoreDifferentialChart`,
  `GirDonutChart`, `FairwayDistributionChart`, `ScoringByParChart`,
  `ScoringCategoryBreakdown`): each chart's outer container wrapped in
  `Card`; surrounding text (titles, labels, tooltip text) retokenized to
  `text-primary`/`text-secondary`. Chart fill/stroke colors (SVG `fill`/
  `stroke` props) untouched.

### 2c. Rounds + Courses

- `app/(tabs)/rounds.tsx`: root background → tokens. Resume-round banner
  (`bg-yellow-100`) → `accent-gold`-tinted background (light) /
  `accent-gold-dark`-tinted (dark) since no dedicated warning/banner token
  exists — reuses the existing accent-gold token rather than adding a new
  one. Start-round pill buttons (`bg-green-600` raw `Pressable`) →
  `Button` (`primary` variant). History rows → `Card` or themed dividers,
  judged per row density during planning.
- `app/(tabs)/courses.tsx`: root background → tokens. Add/FAB button
  (`bg-green-600`) → `Button`. List rows → themed dividers/`Card`.
- `app/course/[id].tsx`: root background → tokens. `TextInput` borders
  (`border-gray-300`) → themed border token. Hole-count toggle pills
  (`bg-green-600`/`bg-gray-200`) → `Button` variants (selected = primary,
  unselected = secondary) — the toggle's two-state look is expressible via
  existing Button variants without new bespoke styling. Save/delete
  buttons (raw `Pressable`) → `Button` (`primary`/`destructive`).

### 2d. Round detail + Scorecard

- `app/round/[id].tsx`: retheme all chrome — backgrounds, stat pills
  (`bg-gray-100`/`bg-gray-200`) → tokens, fairway-miss picker `Modal` →
  `bg-surface`/`dark:bg-surface-dark`. Score/putts selector circles:
  selected state → `bg-brand`, unselected → `bg-surface`/`border` token —
  kept visually distinct from the Scorecard grid's score-color coding
  (different UI, different color language, no collision since one is
  selection state and the other is score-relative-to-par encoding).
- `components/round/Scorecard.tsx` /
  `components/round/RoundOverviewScorecard.tsx`: header row
  (`bg-green-700`) → `bg-brand`. Score-color cells (orange/red/blue/gray)
  **untouched**. Stat-summary blocks (`bg-gray-100`/`bg-gray-50`) →
  `Card`/tokens.
- `app/round/scorecard.tsx`: root `ScrollView` background → tokens only
  (no structural changes — it's a thin wrapper delegating to `Scorecard`).

### Testing

Following the Phase 1 pattern: existing co-located `__tests__` files for
each touched screen/component get updated/added assertions for themed
classes (`toContain()` on rendered `className` strings, matching the
Button/Avatar/Card test style from Phase 1). No new test infrastructure;
no changes to assertions covering business logic, data fetching, or
navigation behavior.

## Open questions / risks

- Exact Ionicons glyph names for each tab are chosen during planning
  (verified against the installed `@expo/vector-icons` Ionicons set) —
  not a design-level blocking decision.
- `screenOptions` header/tab-bar colors need literal hex values gated on
  `useColorScheme()` rather than className strings, since React
  Navigation's native styling API doesn't accept NativeWind classes
  directly. This is a known constraint, not a risk — `lib/theme/colors.ts`
  already exports plain hex constants for exactly this kind of use case.

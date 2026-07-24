# Course Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the signed-in dev user create, list, edit, and delete golf courses (with their 18 holes) from the Expo app, backed by the existing Supabase schema.

**Architecture:** A dev auto-sign-in hook establishes a real Supabase Auth session on app launch (no login UI yet). Plain React hooks in `lib/hooks/useCourses.ts` wrap `supabase-js` calls for reading/writing courses and holes. Two Expo Router screens (`app/(tabs)/courses.tsx` list, `app/course/[id].tsx` add/edit form) consume those hooks, with a small `HoleRow` component for the per-hole inputs.

**Tech Stack:** Expo Router, React Native, NativeWind, `@supabase/supabase-js`, Jest + `jest-expo` + `@testing-library/react-native` (new — being added in Task 1).

## Global Constraints

- Plain hooks only for data fetching — no query library (e.g. no TanStack Query), per the approved spec.
- Units are meters only, single tee set per course (no multi-tee support).
- All Supabase access goes through the existing client at `lib/supabase.ts` (RLS-enforced via `auth.uid()`).
- TypeScript strict mode is on project-wide (`tsconfig.json` has `"strict": true`) — every new file must pass `npx tsc --noEmit`.
- Follow the existing NativeWind/Tailwind `className` styling convention already used in the scaffolded screens (see `app/(tabs)/index.tsx`).
- No login/signup UI in this plan — auto-sign-in with a hardcoded dev user is a deliberate, temporary placeholder (see spec).

---

### Task 1: Testing infrastructure

**Files:**
- Modify: `package.json`
- Create: `__tests__/smoke.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npm test` command (`jest`) that later tasks' tests run under. Jest is configured with `preset: "jest-expo"` and a `moduleNameMapper` so `@/*` imports resolve the same way they do in the app.

- [ ] **Step 1: Install test dependencies**

Run:
```bash
npm install --save-dev jest jest-expo@~54.0.0 @testing-library/react-native react-test-renderer@19.1.0 @types/jest --legacy-peer-deps
```

- [ ] **Step 2: Add Jest config and test script to `package.json`**

Add `"test": "jest"` to `"scripts"`, and a top-level `"jest"` key:

```json
"jest": {
  "preset": "jest-expo",
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/$1"
  }
}
```

- [ ] **Step 3: Write a smoke test**

Create `__tests__/smoke.test.ts`:

```ts
describe('smoke test', () => {
  it('confirms the test environment is wired up', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run it and verify it passes**

Run: `npx jest __tests__/smoke.test.ts`
Expected: `PASS __tests__/smoke.test.ts`

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json __tests__/smoke.test.ts
git commit -m "test: add Jest + React Native Testing Library infrastructure"
```

---

### Task 2: Create the dev test user in Supabase Auth

**Files:**
- Modify: `.env`
- Modify: `.env.example`

**Interfaces:**
- Consumes: nothing.
- Produces: a real row in `auth.users` (and, via the existing `on_auth_user_created` trigger, a matching row in `public.profiles`) that Task 3's auto-sign-in hook will authenticate as. Credentials are read from `EXPO_PUBLIC_DEV_USER_EMAIL` / `EXPO_PUBLIC_DEV_USER_PASSWORD`.

- [ ] **Step 1: Insert the dev user via the `supabase-golf` MCP connector**

Call `mcp__supabase-golf__execute_sql` with this exact query (uses Supabase's `extensions` schema `pgcrypto` functions, the standard way to seed an auth user directly via SQL):

```sql
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'dev@golfapp.test',
  extensions.crypt('DevTest123!', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{}'
);
```

- [ ] **Step 2: Verify the user and profile were created**

Call `mcp__supabase-golf__execute_sql` with:

```sql
select u.id, u.email, p.full_name
from auth.users u
join public.profiles p on p.id = u.id
where u.email = 'dev@golfapp.test';
```

Expected: one row, confirming both `auth.users` and the trigger-created `public.profiles` row exist.

- [ ] **Step 3: Add the credentials to `.env` and `.env.example`**

Append to `.env` (already gitignored):
```
EXPO_PUBLIC_DEV_USER_EMAIL=dev@golfapp.test
EXPO_PUBLIC_DEV_USER_PASSWORD=DevTest123!
```

Append to `.env.example` (committed, values blank):
```
EXPO_PUBLIC_DEV_USER_EMAIL=
EXPO_PUBLIC_DEV_USER_PASSWORD=
```

- [ ] **Step 4: Commit**

```bash
git add .env.example
git commit -m "chore: add dev user env var placeholders"
```

(`.env` itself is gitignored and is not committed.)

---

### Task 3: Dev auto sign-in hook + wire into root layout

**Files:**
- Create: `lib/hooks/useDevAutoSignIn.ts`
- Test: `lib/hooks/__tests__/useDevAutoSignIn.test.ts`
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: `supabase` from `@/lib/supabase` (its `auth.getSession()` and `auth.signInWithPassword()` methods); `EXPO_PUBLIC_DEV_USER_EMAIL` / `EXPO_PUBLIC_DEV_USER_PASSWORD` env vars from Task 2.
- Produces: `useDevAutoSignIn(): { ready: boolean; error: string | null }`. `ready` becomes `true` once a session exists or has just been created (or sign-in failed); `error` holds a message on failure. `app/_layout.tsx` blocks rendering the `Stack` until `ready` is `true`.

- [ ] **Step 1: Write the failing test**

Create `lib/hooks/__tests__/useDevAutoSignIn.test.ts`:

```ts
jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: jest.fn(), signInWithPassword: jest.fn() } },
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { supabase } from '@/lib/supabase';
import { useDevAutoSignIn } from '../useDevAutoSignIn';

describe('useDevAutoSignIn', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      EXPO_PUBLIC_DEV_USER_EMAIL: 'dev@golfapp.test',
      EXPO_PUBLIC_DEV_USER_PASSWORD: 'DevTest123!',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('skips sign-in when a session already exists', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
    });

    const { result } = renderHook(() => useDevAutoSignIn());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('signs in with the dev credentials when there is no session', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ error: null });

    const { result } = renderHook(() => useDevAutoSignIn());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'dev@golfapp.test',
      password: 'DevTest123!',
    });
    expect(result.current.error).toBeNull();
  });

  it('surfaces the error message when sign-in fails', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: { message: 'invalid credentials' },
    });

    const { result } = renderHook(() => useDevAutoSignIn());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.error).toBe('invalid credentials');
  });
});
```

- [ ] **Step 2: Run it and verify it fails**

Run: `npx jest lib/hooks/__tests__/useDevAutoSignIn.test.ts`
Expected: FAIL — `Cannot find module '../useDevAutoSignIn'`

- [ ] **Step 3: Implement the hook**

Create `lib/hooks/useDevAutoSignIn.ts`:

```ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface UseDevAutoSignInResult {
  ready: boolean;
  error: string | null;
}

export function useDevAutoSignIn(): UseDevAutoSignInResult {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function signIn() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (!cancelled) setReady(true);
        return;
      }

      const email = process.env.EXPO_PUBLIC_DEV_USER_EMAIL;
      const password = process.env.EXPO_PUBLIC_DEV_USER_PASSWORD;

      if (!email || !password) {
        if (!cancelled) {
          setError('Missing EXPO_PUBLIC_DEV_USER_EMAIL / EXPO_PUBLIC_DEV_USER_PASSWORD.');
          setReady(true);
        }
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (!cancelled) {
        if (signInError) {
          setError(signInError.message);
        }
        setReady(true);
      }
    }

    signIn();

    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, error };
}
```

- [ ] **Step 4: Run it and verify it passes**

Run: `npx jest lib/hooks/__tests__/useDevAutoSignIn.test.ts`
Expected: `PASS` — all 3 tests pass.

- [ ] **Step 5: Wire the hook into the root layout**

Modify `app/_layout.tsx` to:

```tsx
import '../global.css';
import { Stack } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { useDevAutoSignIn } from '@/lib/hooks/useDevAutoSignIn';

export default function RootLayout() {
  const { ready, error } = useDevAutoSignIn();

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator testID="auth-loading" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-red-600">Sign-in failed: {error}</Text>
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="round/[id]" options={{ title: 'Round' }} />
      <Stack.Screen name="course/[id]" options={{ title: 'Course' }} />
    </Stack>
  );
}
```

- [ ] **Step 6: Write a test for the loading/error branches**

Create `app/__tests__/_layout.test.tsx`:

```tsx
jest.mock('@/lib/hooks/useDevAutoSignIn');

import { render, screen } from '@testing-library/react-native';
import { useDevAutoSignIn } from '@/lib/hooks/useDevAutoSignIn';
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
});
```

- [ ] **Step 7: Run it and verify it passes**

Run: `npx jest app/__tests__/_layout.test.tsx`
Expected: `PASS` — both tests pass.

- [ ] **Step 8: Manually verify against the real Supabase project**

Run: `npx expo start`, open the app (web preview or Expo Go), confirm no "Sign-in failed" message appears, and that `supabase.auth.getSession()` (e.g. via a temporary `console.log` or the Supabase dashboard's Auth > Users "last sign in" column for `dev@golfapp.test`) shows a fresh sign-in. Remove any temporary debug logging before committing.

- [ ] **Step 9: Commit**

```bash
git add lib/hooks/useDevAutoSignIn.ts lib/hooks/__tests__/useDevAutoSignIn.test.ts app/_layout.tsx app/__tests__/_layout.test.tsx
git commit -m "feat: auto sign in as dev user on app launch"
```

---

### Task 4: Course data hooks (`useCourses`, `useCourse`, `saveCourse`, `deleteCourse`)

**Files:**
- Create: `lib/testUtils/supabaseMock.ts`
- Create: `lib/hooks/useCourses.ts`
- Test: `lib/hooks/__tests__/useCourses.test.ts`

**Interfaces:**
- Consumes: `supabase` from `@/lib/supabase`; `Course`, `Hole` types from `@/types/database` (for reference only — this task defines its own narrower `CourseListItem`/`HoleInput` shapes).
- Produces (used by Tasks 5–7):
  - `export interface HoleInput { hole_number: number; par: 3 | 4 | 5 | null; length_meters: number | null }`
  - `export interface CourseListItem { id: string; name: string; total_par: number | null; total_length_meters: number | null }`
  - `export interface SaveCourseInput { id?: string; name: string; holes: HoleInput[] }`
  - `export class CourseValidationError extends Error {}`
  - `export function useCourses(): { courses: CourseListItem[]; loading: boolean; error: string | null; refetch: () => Promise<void> }`
  - `export function useCourse(id: string): { course: { id: string | null; name: string }; holes: HoleInput[]; loading: boolean; error: string | null; refetch: () => Promise<void> }`
  - `export async function saveCourse(input: SaveCourseInput): Promise<string>` — returns the course's id.
  - `export async function deleteCourse(id: string): Promise<void>`

- [ ] **Step 1: Write the shared Supabase query-builder test mock**

Create `lib/testUtils/supabaseMock.ts`:

```ts
export function createQueryBuilderMock<T>(result: { data: T; error: any }) {
  const builder: any = {};
  const chainMethods = ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'order'];
  chainMethods.forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  builder.single = jest.fn(() => Promise.resolve(result));
  builder.then = (onFulfilled: any, onRejected: any) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  return builder;
}
```

(This isn't a test file itself, so it lives outside any `__tests__` directory — Jest would otherwise try to run it as an empty test suite and fail.)

- [ ] **Step 2: Write the failing tests**

Create `lib/hooks/__tests__/useCourses.test.ts`:

```ts
jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), auth: { getUser: jest.fn() } },
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { supabase } from '@/lib/supabase';
import { createQueryBuilderMock } from '@/lib/testUtils/supabaseMock';
import {
  useCourses,
  useCourse,
  saveCourse,
  deleteCourse,
  CourseValidationError,
  type HoleInput,
} from '../useCourses';

describe('useCourses', () => {
  it('loads courses from supabase', async () => {
    const mockCourses = [{ id: '1', name: 'Test Course', total_par: 72, total_length_meters: 6000 }];
    (supabase.from as jest.Mock).mockReturnValue(createQueryBuilderMock({ data: mockCourses, error: null }));

    const { result } = renderHook(() => useCourses());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.courses).toEqual(mockCourses);
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      createQueryBuilderMock({ data: null, error: { message: 'network down' } })
    );

    const { result } = renderHook(() => useCourses());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('network down');
    expect(result.current.courses).toEqual([]);
  });
});

describe('useCourse', () => {
  it('returns 18 blank holes for a new course without hitting the network', () => {
    const { result } = renderHook(() => useCourse('new'));

    expect(result.current.loading).toBe(false);
    expect(result.current.holes).toHaveLength(18);
    expect(result.current.holes[0]).toEqual({ hole_number: 1, par: null, length_meters: null });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('loads an existing course and merges holes by hole_number', async () => {
    const courseBuilder = createQueryBuilderMock({ data: { id: 'abc', name: 'Pebble' }, error: null });
    const holesBuilder = createQueryBuilderMock({
      data: [{ hole_number: 1, par: 4, length_meters: 380 }],
      error: null,
    });
    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      table === 'courses' ? courseBuilder : holesBuilder
    );

    const { result } = renderHook(() => useCourse('abc'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.course).toEqual({ id: 'abc', name: 'Pebble' });
    expect(result.current.holes).toHaveLength(18);
    expect(result.current.holes[0]).toEqual({ hole_number: 1, par: 4, length_meters: 380 });
    expect(result.current.holes[1]).toEqual({ hole_number: 2, par: null, length_meters: null });
  });
});

describe('saveCourse', () => {
  const validHoles: HoleInput[] = Array.from({ length: 18 }, (_, i) => ({
    hole_number: i + 1,
    par: 4,
    length_meters: 350,
  }));

  it('throws CourseValidationError when name is empty', async () => {
    await expect(saveCourse({ name: '', holes: validHoles })).rejects.toThrow(CourseValidationError);
  });

  it('throws CourseValidationError when a hole is missing par', async () => {
    const holes = [...validHoles];
    holes[0] = { ...holes[0], par: null };
    await expect(saveCourse({ name: 'Test', holes })).rejects.toThrow(CourseValidationError);
  });

  it('inserts a new course and upserts holes, returning the new id', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const insertBuilder = createQueryBuilderMock({ data: { id: 'new-course-id' }, error: null });
    const upsertBuilder = createQueryBuilderMock({ data: null, error: null });
    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      table === 'courses' ? insertBuilder : upsertBuilder
    );

    const id = await saveCourse({ name: 'New Course', holes: validHoles });

    expect(id).toBe('new-course-id');
    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        name: 'New Course',
        total_par: 72,
        total_length_meters: 6300,
      })
    );
    expect(upsertBuilder.upsert).toHaveBeenCalledWith(expect.any(Array), {
      onConflict: 'course_id,hole_number',
    });
  });

  it('updates an existing course when id is provided', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const updateBuilder = createQueryBuilderMock({ data: null, error: null });
    const upsertBuilder = createQueryBuilderMock({ data: null, error: null });
    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      table === 'courses' ? updateBuilder : upsertBuilder
    );

    const id = await saveCourse({ id: 'existing-id', name: 'Updated', holes: validHoles });

    expect(id).toBe('existing-id');
    expect(updateBuilder.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated' }));
    expect(updateBuilder.eq).toHaveBeenCalledWith('id', 'existing-id');
  });
});

describe('deleteCourse', () => {
  it('deletes the course', async () => {
    const deleteBuilder = createQueryBuilderMock({ data: null, error: null });
    (supabase.from as jest.Mock).mockReturnValue(deleteBuilder);

    await deleteCourse('abc');

    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(deleteBuilder.eq).toHaveBeenCalledWith('id', 'abc');
  });

  it('surfaces a friendly error on FK violation', async () => {
    const deleteBuilder = createQueryBuilderMock({
      data: null,
      error: { code: '23503', message: 'fk violation' },
    });
    (supabase.from as jest.Mock).mockReturnValue(deleteBuilder);

    await expect(deleteCourse('abc')).rejects.toThrow(
      "This course has rounds logged against it and can't be deleted."
    );
  });
});
```

- [ ] **Step 3: Run it and verify it fails**

Run: `npx jest lib/hooks/__tests__/useCourses.test.ts`
Expected: FAIL — `Cannot find module '../useCourses'`

- [ ] **Step 4: Implement `lib/hooks/useCourses.ts`**

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface HoleInput {
  hole_number: number;
  par: 3 | 4 | 5 | null;
  length_meters: number | null;
}

export interface CourseListItem {
  id: string;
  name: string;
  total_par: number | null;
  total_length_meters: number | null;
}

export interface SaveCourseInput {
  id?: string;
  name: string;
  holes: HoleInput[];
}

export class CourseValidationError extends Error {}

function blankHoles(): HoleInput[] {
  return Array.from({ length: 18 }, (_, i) => ({ hole_number: i + 1, par: null, length_meters: null }));
}

export interface UseCoursesResult {
  courses: CourseListItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCourses(): UseCoursesResult {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('courses')
      .select('id, name, total_par, total_length_meters')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setCourses((data as CourseListItem[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return { courses, loading, error, refetch: fetchCourses };
}

export interface UseCourseResult {
  course: { id: string | null; name: string };
  holes: HoleInput[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCourse(id: string): UseCourseResult {
  const isNew = id === 'new';
  const [course, setCourse] = useState<{ id: string | null; name: string }>({ id: null, name: '' });
  const [holes, setHoles] = useState<HoleInput[]>(blankHoles());
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);

  const fetchCourse = useCallback(async () => {
    if (isNew) {
      setCourse({ id: null, name: '' });
      setHoles(blankHoles());
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [courseResult, holesResult] = await Promise.all([
      supabase.from('courses').select('id, name').eq('id', id).single(),
      supabase.from('holes').select('hole_number, par, length_meters').eq('course_id', id).order('hole_number'),
    ]);

    if (courseResult.error) {
      setError(courseResult.error.message);
      setLoading(false);
      return;
    }
    if (holesResult.error) {
      setError(holesResult.error.message);
      setLoading(false);
      return;
    }

    setCourse({ id: courseResult.data.id, name: courseResult.data.name });

    const holesByNumber = new Map<number, HoleInput>(
      ((holesResult.data as HoleInput[]) ?? []).map((h) => [h.hole_number, h])
    );
    setHoles(
      Array.from({ length: 18 }, (_, i) => {
        const holeNumber = i + 1;
        return holesByNumber.get(holeNumber) ?? { hole_number: holeNumber, par: null, length_meters: null };
      })
    );
    setLoading(false);
  }, [id, isNew]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  return { course, holes, loading, error, refetch: fetchCourse };
}

function validateSaveCourseInput(input: SaveCourseInput): void {
  if (!input.name.trim()) {
    throw new CourseValidationError('Course name is required.');
  }
  if (input.holes.length !== 18) {
    throw new CourseValidationError('All 18 holes must be filled in.');
  }
  for (const hole of input.holes) {
    if (hole.par !== 3 && hole.par !== 4 && hole.par !== 5) {
      throw new CourseValidationError(`Hole ${hole.hole_number} needs a par of 3, 4, or 5.`);
    }
    if (!hole.length_meters || hole.length_meters <= 0) {
      throw new CourseValidationError(`Hole ${hole.hole_number} needs a length in meters.`);
    }
  }
}

export async function saveCourse(input: SaveCourseInput): Promise<string> {
  validateSaveCourseInput(input);

  const totalPar = input.holes.reduce((sum, h) => sum + (h.par ?? 0), 0);
  const totalLength = input.holes.reduce((sum, h) => sum + (h.length_meters ?? 0), 0);

  let courseId = input.id;

  if (!courseId || courseId === 'new') {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated.');
    }

    const { data, error } = await supabase
      .from('courses')
      .insert({
        user_id: user.id,
        name: input.name,
        total_par: totalPar,
        total_length_meters: totalLength,
      })
      .select('id')
      .single();

    if (error) throw error;
    courseId = data.id;
  } else {
    const { error } = await supabase
      .from('courses')
      .update({ name: input.name, total_par: totalPar, total_length_meters: totalLength })
      .eq('id', courseId);

    if (error) throw error;
  }

  const { error: holesError } = await supabase.from('holes').upsert(
    input.holes.map((h) => ({
      course_id: courseId,
      hole_number: h.hole_number,
      par: h.par,
      length_meters: h.length_meters,
    })),
    { onConflict: 'course_id,hole_number' }
  );

  if (holesError) throw holesError;

  return courseId;
}

export async function deleteCourse(id: string): Promise<void> {
  const { error } = await supabase.from('courses').delete().eq('id', id);

  if (error) {
    if (error.code === '23503') {
      throw new Error("This course has rounds logged against it and can't be deleted.");
    }
    throw error;
  }
}
```

- [ ] **Step 5: Run it and verify it passes**

Run: `npx jest lib/hooks/__tests__/useCourses.test.ts`
Expected: `PASS` — all tests pass (10 tests across the 4 `describe` blocks).

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/testUtils/supabaseMock.ts lib/hooks/useCourses.ts lib/hooks/__tests__/useCourses.test.ts
git commit -m "feat: add course data hooks (useCourses, useCourse, saveCourse, deleteCourse)"
```

---

### Task 5: `HoleRow` component

**Files:**
- Create: `components/course/HoleRow.tsx`
- Test: `components/course/__tests__/HoleRow.test.tsx`

**Interfaces:**
- Consumes: `HoleInput` type from `@/lib/hooks/useCourses` (Task 4).
- Produces: `HoleRow({ hole: HoleInput; onChange: (hole: HoleInput) => void }): JSX.Element`, with `testID`s `par-{hole_number}-{3|4|5}` and `length-{hole_number}` used by Task 7's screen tests.

- [ ] **Step 1: Write the failing test**

Create `components/course/__tests__/HoleRow.test.tsx`:

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { HoleRow } from '../HoleRow';

describe('HoleRow', () => {
  const baseHole = { hole_number: 1, par: null, length_meters: null };

  it('renders the hole number', () => {
    const { getByText } = render(<HoleRow hole={baseHole} onChange={jest.fn()} />);
    expect(getByText('1')).toBeTruthy();
  });

  it('calls onChange with the selected par', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<HoleRow hole={baseHole} onChange={onChange} />);
    fireEvent.press(getByTestId('par-1-4'));
    expect(onChange).toHaveBeenCalledWith({ ...baseHole, par: 4 });
  });

  it('calls onChange with a parsed length in meters', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<HoleRow hole={baseHole} onChange={onChange} />);
    fireEvent.changeText(getByTestId('length-1'), '350');
    expect(onChange).toHaveBeenCalledWith({ ...baseHole, length_meters: 350 });
  });
});
```

- [ ] **Step 2: Run it and verify it fails**

Run: `npx jest components/course/__tests__/HoleRow.test.tsx`
Expected: FAIL — `Cannot find module '../HoleRow'`

- [ ] **Step 3: Implement `components/course/HoleRow.tsx`**

```tsx
import { View, Text, TextInput, Pressable } from 'react-native';
import type { HoleInput } from '@/lib/hooks/useCourses';

interface HoleRowProps {
  hole: HoleInput;
  onChange: (hole: HoleInput) => void;
}

const PAR_OPTIONS: Array<3 | 4 | 5> = [3, 4, 5];

export function HoleRow({ hole, onChange }: HoleRowProps) {
  return (
    <View className="flex-row items-center justify-between border-b border-gray-200 py-3">
      <Text className="w-10 text-base font-medium">{hole.hole_number}</Text>
      <View className="flex-row">
        {PAR_OPTIONS.map((par) => (
          <Pressable
            key={par}
            testID={`par-${hole.hole_number}-${par}`}
            onPress={() => onChange({ ...hole, par })}
            className={`mx-1 h-9 w-9 items-center justify-center rounded-full ${
              hole.par === par ? 'bg-green-600' : 'bg-gray-200'
            }`}
          >
            <Text className={hole.par === par ? 'text-white' : 'text-gray-700'}>{par}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        testID={`length-${hole.hole_number}`}
        className="w-20 rounded border border-gray-300 px-2 py-1 text-right"
        keyboardType="number-pad"
        placeholder="m"
        value={hole.length_meters != null ? String(hole.length_meters) : ''}
        onChangeText={(text) => {
          const parsed = text === '' ? null : parseInt(text, 10);
          onChange({ ...hole, length_meters: Number.isNaN(parsed as number) ? null : parsed });
        }}
      />
    </View>
  );
}
```

- [ ] **Step 4: Run it and verify it passes**

Run: `npx jest components/course/__tests__/HoleRow.test.tsx`
Expected: `PASS` — all 3 tests pass.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/course/HoleRow.tsx components/course/__tests__/HoleRow.test.tsx
git commit -m "feat: add HoleRow component for course hole input"
```

---

### Task 6: Course list screen

**Files:**
- Modify: `app/(tabs)/courses.tsx`
- Test: `app/(tabs)/__tests__/courses.test.tsx`

**Interfaces:**
- Consumes: `useCourses` from `@/lib/hooks/useCourses` (Task 4); `useRouter` from `expo-router`.
- Produces: default-exported `CoursesScreen`, with `testID`s `add-course-button`, `add-first-course-button`, `course-row-{id}` — not consumed elsewhere but documented for consistency.

- [ ] **Step 1: Write the failing test**

Create `app/(tabs)/__tests__/courses.test.tsx`:

```tsx
jest.mock('@/lib/hooks/useCourses');
jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

import { render, fireEvent, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { useCourses } from '@/lib/hooks/useCourses';
import CoursesScreen from '../courses';

describe('CoursesScreen', () => {
  const push = jest.fn();

  beforeEach(() => {
    push.mockClear();
    (useRouter as jest.Mock).mockReturnValue({ push });
  });

  it('shows a loading indicator while loading', () => {
    (useCourses as jest.Mock).mockReturnValue({ courses: [], loading: true, error: null });
    render(<CoursesScreen />);
    expect(screen.getByTestId('courses-loading')).toBeTruthy();
  });

  it('shows an empty state with an add button when there are no courses', () => {
    (useCourses as jest.Mock).mockReturnValue({ courses: [], loading: false, error: null });
    render(<CoursesScreen />);
    fireEvent.press(screen.getByTestId('add-first-course-button'));
    expect(push).toHaveBeenCalledWith('/course/new');
  });

  it('lists courses and navigates to the edit screen on tap', () => {
    (useCourses as jest.Mock).mockReturnValue({
      courses: [{ id: 'abc', name: 'Pebble Beach', total_par: 72, total_length_meters: 6300 }],
      loading: false,
      error: null,
    });
    render(<CoursesScreen />);
    expect(screen.getByText('Pebble Beach')).toBeTruthy();
    fireEvent.press(screen.getByTestId('course-row-abc'));
    expect(push).toHaveBeenCalledWith('/course/abc');
  });
});
```

- [ ] **Step 2: Run it and verify it fails**

Run: `npx jest "app/\(tabs\)/__tests__/courses.test.tsx"`
Expected: FAIL — `courses-loading` / `add-first-course-button` testIDs not found (current placeholder screen just renders static text).

- [ ] **Step 3: Implement `app/(tabs)/courses.tsx`**

Replace its contents with:

```tsx
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useCourses } from '@/lib/hooks/useCourses';

export default function CoursesScreen() {
  const { courses, loading, error } = useCourses();
  const router = useRouter();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator testID="courses-loading" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-red-600">{error}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 pt-4">
        <Text className="text-xl font-semibold">Courses</Text>
        <Pressable
          testID="add-course-button"
          onPress={() => router.push('/course/new')}
          className="h-9 w-9 items-center justify-center rounded-full bg-green-600"
        >
          <Text className="text-lg text-white">+</Text>
        </Pressable>
      </View>

      {courses.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-4 text-center text-gray-500">No courses yet.</Text>
          <Pressable
            testID="add-first-course-button"
            onPress={() => router.push('/course/new')}
            className="rounded bg-green-600 px-4 py-2"
          >
            <Text className="text-white">Add your first course</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          className="px-4"
          data={courses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              testID={`course-row-${item.id}`}
              onPress={() => router.push(`/course/${item.id}`)}
              className="border-b border-gray-200 py-3"
            >
              <Text className="text-base font-medium">{item.name}</Text>
              <Text className="text-sm text-gray-500">
                Par {item.total_par ?? '-'} · {item.total_length_meters ?? '-'} m
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
```

- [ ] **Step 4: Run it and verify it passes**

Run: `npx jest "app/\(tabs\)/__tests__/courses.test.tsx"`
Expected: `PASS` — all 3 tests pass.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/courses.tsx" "app/(tabs)/__tests__/courses.test.tsx"
git commit -m "feat: build course list screen"
```

---

### Task 7: Course add/edit form screen

**Files:**
- Modify: `app/course/[id].tsx`
- Test: `app/course/__tests__/[id].test.tsx`

**Interfaces:**
- Consumes: `useCourse`, `saveCourse`, `deleteCourse`, `CourseValidationError`, `HoleInput` from `@/lib/hooks/useCourses` (Task 4); `HoleRow` from `@/components/course/HoleRow` (Task 5); `useLocalSearchParams`, `useRouter` from `expo-router`.
- Produces: default-exported `CourseFormScreen` — terminal screen for this feature, nothing downstream depends on it.

- [ ] **Step 1: Write the failing test**

Create `app/course/__tests__/[id].test.tsx`:

```tsx
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));
jest.mock('@/lib/hooks/useCourses');

import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as useCoursesModule from '@/lib/hooks/useCourses';
import CourseFormScreen from '../[id]';

describe('CourseFormScreen', () => {
  const push = jest.fn();
  const back = jest.fn();

  const validHoles = Array.from({ length: 18 }, (_, i) => ({
    hole_number: i + 1,
    par: 4 as const,
    length_meters: 350,
  }));

  const blankHoles = Array.from({ length: 18 }, (_, i) => ({
    hole_number: i + 1,
    par: null,
    length_meters: null,
  }));

  beforeEach(() => {
    push.mockClear();
    back.mockClear();
    (useRouter as jest.Mock).mockReturnValue({ push, back });
  });

  it('disables Save until all holes are filled in', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'new' });
    (useCoursesModule.useCourse as jest.Mock).mockReturnValue({
      course: { id: null, name: '' },
      holes: blankHoles,
      loading: false,
      error: null,
    });

    render(<CourseFormScreen />);

    expect(screen.getByTestId('save-course-button').props.accessibilityState.disabled).toBe(true);
  });

  it('saves a new course and navigates back', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'new' });
    (useCoursesModule.useCourse as jest.Mock).mockReturnValue({
      course: { id: null, name: '' },
      holes: validHoles,
      loading: false,
      error: null,
    });
    (useCoursesModule.saveCourse as jest.Mock) = jest.fn().mockResolvedValue('new-id');

    render(<CourseFormScreen />);
    fireEvent.changeText(screen.getByTestId('course-name-input'), 'Test Course');
    fireEvent.press(screen.getByTestId('save-course-button'));

    await waitFor(() => expect(back).toHaveBeenCalled());
    expect(useCoursesModule.saveCourse).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test Course', holes: validHoles })
    );
  });

  it('shows the delete button only when editing an existing course', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'abc' });
    (useCoursesModule.useCourse as jest.Mock).mockReturnValue({
      course: { id: 'abc', name: 'Existing' },
      holes: validHoles,
      loading: false,
      error: null,
    });

    render(<CourseFormScreen />);
    expect(screen.getByTestId('delete-course-button')).toBeTruthy();
  });

  it('does not show the delete button for a new course', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'new' });
    (useCoursesModule.useCourse as jest.Mock).mockReturnValue({
      course: { id: null, name: '' },
      holes: blankHoles,
      loading: false,
      error: null,
    });

    render(<CourseFormScreen />);
    expect(screen.queryByTestId('delete-course-button')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and verify it fails**

Run: `npx jest "app/course/__tests__/\[id\].test.tsx"`
Expected: FAIL — the current placeholder screen has none of these testIDs.

- [ ] **Step 3: Implement `app/course/[id].tsx`**

Replace its contents with:

```tsx
import { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { HoleRow } from '@/components/course/HoleRow';
import {
  useCourse,
  saveCourse,
  deleteCourse,
  CourseValidationError,
  type HoleInput,
} from '@/lib/hooks/useCourses';

export default function CourseFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { course, holes: initialHoles, loading, error: loadError } = useCourse(id);

  const [name, setName] = useState('');
  const [holes, setHoles] = useState<HoleInput[]>(initialHoles);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(course.name);
  }, [course.name]);

  useEffect(() => {
    setHoles(initialHoles);
  }, [initialHoles]);

  const isValid =
    name.trim().length > 0 &&
    holes.every((h) => (h.par === 3 || h.par === 4 || h.par === 5) && !!h.length_meters && h.length_meters > 0);

  const totalPar = holes.reduce((sum, h) => sum + (h.par ?? 0), 0);
  const totalLength = holes.reduce((sum, h) => sum + (h.length_meters ?? 0), 0);

  function updateHole(updated: HoleInput) {
    setHoles((prev) => prev.map((h) => (h.hole_number === updated.hole_number ? updated : h)));
  }

  async function handleSave() {
    setSaveError(null);
    setSaving(true);
    try {
      await saveCourse({ id: course.id ?? undefined, name, holes });
      router.back();
    } catch (err) {
      if (err instanceof CourseValidationError) {
        setSaveError(err.message);
      } else {
        setSaveError(err instanceof Error ? err.message : 'Failed to save course.');
      }
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert('Delete course?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCourse(course.id!);
            router.back();
          } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Failed to delete course.');
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator testID="course-form-loading" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-red-600">{loadError}</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white px-4 pt-4" testID="course-form">
      <Text className="mb-1 text-sm font-medium text-gray-700">Course name</Text>
      <TextInput
        testID="course-name-input"
        className="mb-4 rounded border border-gray-300 px-3 py-2"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Pebble Beach"
      />

      {holes.map((hole) => (
        <HoleRow key={hole.hole_number} hole={hole} onChange={updateHole} />
      ))}

      <Text className="my-3 text-sm text-gray-600">
        Total par {totalPar} · {totalLength} m
      </Text>

      {saveError && <Text className="mb-3 text-red-600">{saveError}</Text>}

      <Pressable
        testID="save-course-button"
        disabled={!isValid || saving}
        onPress={handleSave}
        className={`mb-3 items-center rounded py-3 ${isValid && !saving ? 'bg-green-600' : 'bg-gray-300'}`}
      >
        <Text className="font-medium text-white">{saving ? 'Saving...' : 'Save'}</Text>
      </Pressable>

      {course.id && (
        <Pressable
          testID="delete-course-button"
          onPress={handleDelete}
          className="mb-8 items-center rounded border border-red-600 py-3"
        >
          <Text className="font-medium text-red-600">Delete Course</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
```

- [ ] **Step 4: Run it and verify it passes**

Run: `npx jest "app/course/__tests__/\[id\].test.tsx"`
Expected: `PASS` — all 4 tests pass.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Run the full test suite**

Run: `npx jest`
Expected: all suites pass (Tasks 1, 3, 4, 5, 6, 7).

- [ ] **Step 7: Commit**

```bash
git add "app/course/[id].tsx" "app/course/__tests__/[id].test.tsx"
git commit -m "feat: build course add/edit form screen"
```

- [ ] **Step 8: Manual verification in the running app**

Run: `npx expo start`, open in the browser preview or Expo Go (confirm dev auto-sign-in succeeds first). Walk through: empty state → add a course with 18 holes → verify it appears in the list with correct total par/length → tap it → edit the name → Save → verify the change persisted → delete it → verify it's removed from the list and from the `courses` table (check via `mcp__supabase-golf__execute_sql`, `select * from courses`).

---

## Plan Self-Review Notes

- **Spec coverage:** auto-sign-in prerequisite (Task 2–3), `useCourses`/`useCourse`/`saveCourse`/`deleteCourse` (Task 4), `components/course/HoleRow.tsx` new folder (Task 5), course list screen (Task 6), add/edit form with live totals, validation, and conditional delete (Task 7) — all spec sections have a corresponding task.
- **Type consistency:** `HoleInput`, `CourseListItem`, `SaveCourseInput`, `CourseValidationError` are defined once in Task 4 and referenced identically (same names/shapes) in Tasks 5–7.
- **Out of scope items from the spec** (login UI, multi-tee, course detail/hole-averages screen) are intentionally not tasked here.

import { render, fireEvent, screen } from '@testing-library/react-native';
import { CourseStartList } from '../CourseStartList';
import type { CachedCourse, CachedTeeBox } from '@/lib/offline/types';

function tee(id: string, name: string, length: number): CachedTeeBox {
  return {
    id,
    name,
    course_rating: 69.3,
    slope_rating: 123,
    total_length_meters: length,
    lengths: [],
  };
}

function course(id: string, name: string, tees: CachedTeeBox[], club: string | null = null): CachedCourse {
  return { id, name, club, hole_count: 18, total_par: 71, holes: [], tees };
}

const singleTee = course('c1', 'Húsafell', [tee('t1', 'Gulur', 2496)]);
const multiTee = course('c2', 'Leirdalsvöllur', [tee('t2', '54', 5426), tee('t3', '52', 5144)]);

describe('CourseStartList', () => {
  it('shows a Most played section only when there is history', () => {
    const withHistory = render(
      <CourseStartList courses={[singleTee, multiTee]} roundCounts={{ c2: 3 }} onStart={jest.fn()} />
    );
    expect(withHistory.getByText('Most played')).toBeTruthy();

    const noHistory = render(
      <CourseStartList courses={[singleTee, multiTee]} roundCounts={{}} onStart={jest.fn()} />
    );
    expect(noHistory.queryByText('Most played')).toBeNull();
  });

  it('starts a single-tee course immediately with its only tee', () => {
    const onStart = jest.fn();
    render(<CourseStartList courses={[singleTee]} roundCounts={{}} onStart={onStart} />);

    fireEvent.press(screen.getByTestId('start-round-c1'));

    expect(onStart).toHaveBeenCalledWith(singleTee, singleTee.tees[0]);
  });

  it('expands a multi-tee course and starts with the chosen tee', () => {
    const onStart = jest.fn();
    render(<CourseStartList courses={[multiTee]} roundCounts={{}} onStart={onStart} />);

    expect(screen.queryByTestId('start-round-c2-tee-t3')).toBeNull();
    fireEvent.press(screen.getByTestId('start-round-c2'));
    expect(onStart).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('start-round-c2-tee-t3'));
    expect(onStart).toHaveBeenCalledWith(multiTee, multiTee.tees[1]);
  });

  it('collapses the open course when another is expanded', () => {
    const secondMulti = course('c3', 'Grafarholtsvöllur', [tee('t4', '57', 5482), tee('t5', '52', 5118)]);
    render(<CourseStartList courses={[multiTee, secondMulti]} roundCounts={{}} onStart={jest.fn()} />);

    fireEvent.press(screen.getByTestId('start-round-c2'));
    expect(screen.getByTestId('start-round-c2-tee-t2')).toBeTruthy();

    fireEvent.press(screen.getByTestId('start-round-c3'));
    expect(screen.queryByTestId('start-round-c2-tee-t2')).toBeNull();
    expect(screen.getByTestId('start-round-c3-tee-t4')).toBeTruthy();
  });

  it('shows the tee names in the course row subtitle', () => {
    render(<CourseStartList courses={[multiTee]} roundCounts={{}} onStart={jest.fn()} />);
    expect(screen.getByText('Par 71 · 18 holes · 54 / 52')).toBeTruthy();
  });

  it('prefixes the subtitle with the club when the course has one', () => {
    const clubCourse = course('c9', 'Mýrin', [tee('t9', '47', 2366)], 'GKG');
    render(<CourseStartList courses={[clubCourse]} roundCounts={{}} onStart={jest.fn()} />);
    expect(screen.getByText('GKG · Par 71 · 18 holes · 47')).toBeTruthy();
  });

  it('shows length and rating on expanded tee buttons', () => {
    render(<CourseStartList courses={[multiTee]} roundCounts={{}} onStart={jest.fn()} />);
    fireEvent.press(screen.getByTestId('start-round-c2'));
    expect(screen.getByText('54 · 5426 m · CR 69.3/123')).toBeTruthy();
  });
});

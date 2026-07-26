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

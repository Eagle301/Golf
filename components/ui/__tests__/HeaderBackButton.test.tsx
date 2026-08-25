jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

import { render, screen, fireEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { HeaderBackButton } from '../HeaderBackButton';

function mockRouter(canGoBack: boolean) {
  const router = {
    canGoBack: () => canGoBack,
    back: jest.fn(),
    replace: jest.fn(),
  };
  (useRouter as jest.Mock).mockReturnValue(router);
  return router;
}

describe('HeaderBackButton', () => {
  it('goes back when there is somewhere to go back to', () => {
    const router = mockRouter(true);
    render(<HeaderBackButton fallback="/rounds" />);

    fireEvent.press(screen.getByTestId('header-back-button'));

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('replaces with the fallback route when the stack is empty', () => {
    const router = mockRouter(false);
    render(<HeaderBackButton fallback="/courses" />);

    fireEvent.press(screen.getByTestId('header-back-button'));

    expect(router.replace).toHaveBeenCalledWith('/courses');
    expect(router.back).not.toHaveBeenCalled();
  });

  it('still renders when the stack is empty, rather than disappearing', () => {
    mockRouter(false);
    render(<HeaderBackButton fallback="/rounds" />);

    expect(screen.getByTestId('header-back-button')).toBeTruthy();
  });
});

describe('HeaderBackButton with its own handler', () => {
  it('calls the handler instead of navigating, so a screen can intercept the back press', () => {
    const router = mockRouter(true);
    const onPress = jest.fn();
    render(<HeaderBackButton fallback="/courses" onPress={onPress} />);

    fireEvent.press(screen.getByTestId('header-back-button'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

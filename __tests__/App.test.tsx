import ReactTestRenderer from 'react-test-renderer';
import { Button } from 'react-native';
import { App } from '@/App';

// The native provider renders nothing without device measurements.
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
// Native module, unavailable under Node.
jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));

test('starts on the home screen', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });

  expect(renderer?.root.findByType(Button).props.title).toBe('Diagnostics');
  await ReactTestRenderer.act(() => renderer?.unmount());
});

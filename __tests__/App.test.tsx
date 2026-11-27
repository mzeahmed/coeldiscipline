import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import { App } from '../src/app/App';

// The native provider renders nothing without device measurements.
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

test('renders the application name', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });

  expect(renderer?.root.findByType(Text).props.children).toBe('CoelDiscipline');
});

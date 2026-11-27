import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './navigation';

/** Application root. Screens and providers are composed here. */
export function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

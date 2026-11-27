import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { HomeScreen } from '@/modules/Dashboard';
import { DiagnosticsScreen, runDiagnostics } from '@/modules/Diagnostics';

type RootStackParamList = {
  Home: undefined;
  Diagnostics: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function HomeRoute({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Home'>) {
  return (
    <HomeScreen onOpenDiagnostics={() => navigation.navigate('Diagnostics')} />
  );
}

function DiagnosticsRoute() {
  return <DiagnosticsScreen runChecks={runDiagnostics} />;
}

export function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeRoute}
        options={{ title: 'CoelDiscipline' }}
      />
      <Stack.Screen name="Diagnostics" component={DiagnosticsRoute} />
    </Stack.Navigator>
  );
}

import { Button, StyleSheet, View } from 'react-native';

interface HomeScreenProps {
  readonly onOpenDiagnostics: () => void;
}

/** Placeholder until the dashboard (step 5). */
export function HomeScreen({ onOpenDiagnostics }: HomeScreenProps) {
  return (
    <View style={styles.container}>
      <Button title="Diagnostics" onPress={onOpenDiagnostics} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

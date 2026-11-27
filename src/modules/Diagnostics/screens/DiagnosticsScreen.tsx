import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme } from 'react-native';
import type { CheckResult } from '../domain/checkResult';

interface DiagnosticsScreenProps {
  readonly runChecks: () => Promise<CheckResult[]>;
}

/** Temporary developer screen (step 1 spike), not translated. */
export function DiagnosticsScreen({ runChecks }: DiagnosticsScreenProps) {
  const [results, setResults] = useState<CheckResult[]>([]);
  const textStyle = useColorScheme() === 'dark' ? styles.textDark : styles.text;

  useEffect(() => {
    runChecks().then(setResults, error =>
      setResults([{ name: 'Checks', passed: false, detail: String(error) }]),
    );
  }, [runChecks]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {results.map(result => (
        <Text key={result.name} style={textStyle}>
          {result.passed ? 'PASS' : 'FAIL'} {result.name}: {result.detail}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  text: { color: '#111111' },
  textDark: { color: '#f5f5f5' },
});

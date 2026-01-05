import { Box, Text, useInput } from 'ink';
import { useRouter } from '../components/Router';

export function SettingsScreen() {
  const { pop } = useRouter();

  useInput((_input, key) => {
    if (key.escape) {
      pop();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>Settings</Text>
      </Box>
      <Text dimColor>Coming soon...</Text>
      <Box marginTop={1}>
        <Text dimColor>Press ESC to go back</Text>
      </Box>
    </Box>
  );
}

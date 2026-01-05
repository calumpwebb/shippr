import React from 'react';
import { Box, Text } from 'ink';
import { clearToken } from '../utils/credentials';
import { useRouter } from './Router';

export function Dashboard() {
  const { replace } = useRouter();

  const handleLogout = () => {
    clearToken();
    replace('auth');
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="green">✓ Logged In Successfully!</Text>
      </Box>
      <Text>Welcome to the dashboard.</Text>
      <Box marginTop={1}>
        <Text dimColor>(Press Ctrl+C to logout and exit)</Text>
      </Box>
    </Box>
  );
}

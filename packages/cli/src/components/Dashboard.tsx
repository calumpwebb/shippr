import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { clearToken } from '../utils/credentials';
import { useRouter } from './Router';

export function Dashboard() {
  const { replace } = useRouter();

  const items = [
    { label: 'Refresh', value: 'refresh' as const },
    { label: 'Sign out', value: 'signout' as const },
  ];

  const handleSelect = (item: { value: 'refresh' | 'signout' }) => {
    if (item.value === 'signout') {
      clearToken();
      replace('auth');
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="green">✓ Logged In</Text>
      </Box>
      <Text>Welcome to the dashboard.</Text>
      <Box marginTop={1}>
        <SelectInput items={items} onSelect={handleSelect} />
      </Box>
    </Box>
  );
}

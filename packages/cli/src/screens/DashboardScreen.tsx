import { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { clearToken } from '../utils/credentials';
import { useRouter } from '../components/Router';
import { trpcClient } from '../utils/trpc';

export function DashboardScreen() {
  const { reset } = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const items = [
    { label: isRefreshing ? 'Refreshing...' : 'Refresh', value: 'refresh' as const },
    { label: 'Sign out', value: 'signout' as const },
  ];

  const handleSelect = async (item: { value: 'refresh' | 'signout' }) => {
    if (item.value === 'refresh') {
      setIsRefreshing(true);
      await trpcClient.refresh.query();
      setIsRefreshing(false);
    } else if (item.value === 'signout') {
      clearToken();
      reset('welcome');
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

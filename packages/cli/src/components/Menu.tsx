import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

type MenuProps = {
  onSelect: (choice: 'login' | 'signup') => void;
};

export function Menu({ onSelect }: MenuProps) {
  const items = [
    { label: 'Login', value: 'login' as const },
    { label: 'Create Account', value: 'signup' as const },
  ];

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>Welcome! Please select an option:</Text>
      </Box>
      <SelectInput items={items} onSelect={(item) => onSelect(item.value)} />
    </Box>
  );
}

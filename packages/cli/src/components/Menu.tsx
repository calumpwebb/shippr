import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Footer } from './Footer';

type MenuProps = {
  onSelect: (choice: 'login' | 'signup') => void;
};

const items = [
  { label: 'Login', value: 'login' as const },
  { label: 'Create Account', value: 'signup' as const },
];

export function Menu({ onSelect }: MenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((i) => (i > 0 ? i - 1 : i));
    } else if (key.downArrow) {
      setSelectedIndex((i) => (i < items.length - 1 ? i + 1 : i));
    } else if (key.tab) {
      setSelectedIndex((i) => (i + 1) % items.length);
    } else if (key.return) {
      onSelect(items[selectedIndex].value);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>Welcome!</Text>
      </Box>
      {items.map((item, index) => (
        <Box key={item.value}>
          <Text color={index === selectedIndex ? 'green' : undefined}>
            {index === selectedIndex ? '❯ ' : '  '}
            {item.label}
          </Text>
        </Box>
      ))}
      <Footer />
    </Box>
  );
}

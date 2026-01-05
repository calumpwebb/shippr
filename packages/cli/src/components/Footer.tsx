import React from 'react';
import { Box, Text } from 'ink';

export function Footer() {
  return (
    <Box marginTop={1}>
      <Text dimColor>(↑/↓/TAB to navigate, ESC back, Ctrl+C quit)</Text>
    </Box>
  );
}

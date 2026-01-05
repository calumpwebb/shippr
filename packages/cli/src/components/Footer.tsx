import React from 'react';
import { Box, Text } from 'ink';

export function Footer() {
  return (
    <Box marginTop={1}>
      <Text dimColor>(↑/↓/TAB to navigate, Enter to select, ESC to go back, Ctrl+C to quit)</Text>
    </Box>
  );
}

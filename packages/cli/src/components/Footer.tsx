import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';

export function Footer() {
  const [confirmExit, setConfirmExit] = useState(false);
  const { exit } = useApp();

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      if (confirmExit) {
        exit();
      } else {
        setConfirmExit(true);
      }
    } else if (confirmExit) {
      setConfirmExit(false);
    }
  });

  return (
    <Box marginTop={1}>
      {confirmExit ? (
        <Text color="yellow">Press Ctrl+C again to exit!</Text>
      ) : (
        <Text dimColor>(↑/↓/TAB to navigate, ESC back, Ctrl+C quit)</Text>
      )}
    </Box>
  );
}

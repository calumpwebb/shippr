import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { useRouter } from './Router';

export function Footer() {
  const [confirmExit, setConfirmExit] = useState(false);
  const { exit } = useApp();
  const { canGoBack, currentRoute } = useRouter();

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

  const hints = ['↑/↓/TAB navigate', canGoBack && 'ESC back', 'Ctrl+C quit']
    .filter(Boolean)
    .join(', ');

  return (
    <Box marginTop={1}>
      {confirmExit ? (
        <Text color="yellow">Press Ctrl+C again to exit!</Text>
      ) : (
        <Text dimColor>
          ({hints}) [route: <Text color="cyan">{currentRoute}</Text>]
        </Text>
      )}
    </Box>
  );
}

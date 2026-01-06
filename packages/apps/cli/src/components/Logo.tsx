import { Box, Text } from 'ink'

export function Logo(): React.ReactNode {
  // prettier-ignore - preserve intentional spacing in ASCII art
  return (
    <Box flexDirection="column">
      <Text>█▀▀ █ █ █ █▀█ █▀█ █▀█</Text>
      <Text>▀▀█ █▀█ █ █▀▀ █▀▀ ██▀</Text>
      <Text>▀▀▀ ▀ ▀ ▀ ▀ ▀ ▀ ▀</Text>
    </Box>
  )
}

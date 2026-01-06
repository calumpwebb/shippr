import { Box, Text } from 'ink'

// prettier-ignore - preserve intentional spacing in ASCII art
const LOGO_LINES = ['█▀▀ █ █ █ █▀█ █▀█ █▀█', '▀▀█ █▀█ █ █▀▀ █▀▀ ██▀', '▀▀▀ ▀ ▀ ▀ ▀   ▀   ▀ ▀']

export function Logo(): React.ReactNode {
  return (
    <Box flexDirection="column">
      {LOGO_LINES.map((line, i) => (
        <Text key={i}>{line}</Text>
      ))}
    </Box>
  )
}

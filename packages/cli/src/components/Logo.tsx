import { Box, Text } from 'ink'

export function Logo(): React.ReactNode {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text>╭─────────────╮</Text>
      <Text>│ S H I P P R │</Text>
      <Text>╰─────────────╯</Text>
    </Box>
  )
}

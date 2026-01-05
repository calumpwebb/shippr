import { Box, Text, useInput } from 'ink'
import { useRouter } from '../components/Router'
import { colors } from '../utils/colors'

export function SettingsScreen(): React.ReactNode {
  const { pop } = useRouter()

  useInput((_input, key) => {
    if (key.escape) {
      pop()
    }
  })

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Settings</Text>
      </Box>
      <Text color={colors.muted}>Coming soon...</Text>
      <Box marginTop={1}>
        <Text color={colors.muted}>Press ESC to go back</Text>
      </Box>
    </Box>
  )
}

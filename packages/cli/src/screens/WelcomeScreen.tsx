import { Box, Text } from 'ink'
import { useRouter } from '../components/Router'
import { Menu } from '../components/Menu'

const items = [
  { label: 'Login', value: 'login' as const },
  { label: 'Create Account', value: 'create-account' as const },
  { label: 'Forgot Password', value: 'forgot-password' as const },
]

export function WelcomeScreen(): React.ReactNode {
  const { push } = useRouter()

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Welcome!</Text>
      </Box>
      <Menu items={items} onSelect={push} />
    </Box>
  )
}

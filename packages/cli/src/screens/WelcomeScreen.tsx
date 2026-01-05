import { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import { useRouter } from '../components/Router'

const items = [
  { label: 'Login', value: 'login' as const },
  { label: 'Create Account', value: 'create-account' as const },
  { label: 'Forgot Password', value: 'forgot-password' as const },
]

export function WelcomeScreen() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { push } = useRouter()

  useInput((_input, key) => {
    if (key.upArrow) {
      setSelectedIndex((i) => (i > 0 ? i - 1 : i))
    } else if (key.downArrow) {
      setSelectedIndex((i) => (i < items.length - 1 ? i + 1 : i))
    } else if (key.tab) {
      setSelectedIndex((i) => (i + 1) % items.length)
    } else if (key.return) {
      push(items[selectedIndex].value)
    }
  })

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
    </Box>
  )
}

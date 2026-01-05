import { useState } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import { useRouter } from './Router'
import { colors } from '../utils/colors'

export function Footer(): React.ReactNode {
  const [confirmExit, setConfirmExit] = useState(false)
  const { exit } = useApp()
  const { canGoBack } = useRouter()

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      if (confirmExit) {
        exit()
      } else {
        setConfirmExit(true)
      }
    } else if (confirmExit) {
      setConfirmExit(false)
    }
  })

  const hints = ['↑/↓/TAB navigate', canGoBack && 'ESC back', 'Ctrl+C quit']
    .filter(Boolean)
    .join(', ')

  return (
    <Box>
      {confirmExit ? (
        <Text color={colors.warning}>Press Ctrl+C again to exit!</Text>
      ) : (
        <Text italic color={colors.footer}>
          ({hints})
        </Text>
      )}
    </Box>
  )
}

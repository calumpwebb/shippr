import { useState } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import { useRouter } from './RouterContext'
import { colors } from '../utils/colors'
import packageJson from '../../package.json'

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
    <Box justifyContent="space-between">
      {confirmExit ? (
        <Text color={colors.warning}>Press Ctrl+C again to exit!</Text>
      ) : (
        <Text italic color={colors.footer}>
          ({hints})
        </Text>
      )}
      <Text italic color={colors.footer}>
        v{packageJson.version}
      </Text>
    </Box>
  )
}

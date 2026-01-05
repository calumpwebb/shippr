import { useState } from 'react'
import { Box, Text } from 'ink'
import { Menu } from '../components/Menu'
import { clearToken } from '../utils/credentials'
import { useRouter } from '../components/Router'
import { trpcClient, toApiError } from '../utils/trpc'
import { colors } from '../utils/colors'

export function DashboardScreen(): React.ReactNode {
  const { reset } = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')

  const items = [
    { label: isRefreshing ? 'Refreshing...' : 'Refresh', value: 'refresh' as const },
    { label: 'Sign out', value: 'signout' as const },
  ]

  async function handleSelect(value: 'refresh' | 'signout'): Promise<void> {
    if (value === 'refresh') {
      setIsRefreshing(true)
      setError('')
      try {
        await trpcClient.user.refresh.query()
      } catch (err) {
        const apiError = toApiError(err)
        setError(apiError.message)
      }
      setIsRefreshing(false)
    } else if (value === 'signout') {
      clearToken()
      reset('welcome')
    }
  }

  return (
    <Box flexDirection="column">
      <Text>Welcome to the dashboard.</Text>
      <Box marginTop={1}>
        <Text bold color="green">
          ✓ Logged In
        </Text>
      </Box>
      {error && (
        <Box marginTop={1}>
          <Text color={colors.error}>{error}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Menu items={items} onSelect={handleSelect} />
      </Box>
    </Box>
  )
}

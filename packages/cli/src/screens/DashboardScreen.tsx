import { useState } from 'react'
import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'
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

  async function handleSelect(item: { value: 'refresh' | 'signout' }): Promise<void> {
    if (item.value === 'refresh') {
      setIsRefreshing(true)
      setError('')
      try {
        await trpcClient.user.refresh.query()
      } catch (err) {
        const apiError = toApiError(err)
        setError(apiError.message)
      }
      setIsRefreshing(false)
    } else if (item.value === 'signout') {
      clearToken()
      reset('welcome')
    }
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="green">
          ✓ Logged In
        </Text>
      </Box>
      <Text>Welcome to the dashboard.</Text>
      {error && (
        <Box marginTop={1}>
          <Text color={colors.error}>{error}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <SelectInput items={items} onSelect={handleSelect} />
      </Box>
    </Box>
  )
}

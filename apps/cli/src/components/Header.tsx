import { useState, useEffect } from 'react'
import { Box, Text } from 'ink'
import { trpcClient } from '../utils/trpc'
import { Logo } from './Logo'

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

export function Header(): React.ReactNode {
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [motd, setMotd] = useState<string | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return (): void => clearInterval(interval)
  }, [])

  useEffect(() => {
    function fetchMotd(): void {
      trpcClient.motd.getRandom
        .query()
        .then((result) => {
          setMotd(result.message)
        })
        .catch(() => {
          // Silently fail - MOTD is not critical
        })
    }

    fetchMotd()
    const interval = setInterval(fetchMotd, 15000)
    return (): void => clearInterval(interval)
  }, [])

  return (
    <Box gap={2}>
      <Logo />
      <Box flexDirection="column">
        <Text>{formatDateTime(currentTime)}</Text>
        {motd && (
          <Box width={30}>
            <Text color="gray" wrap="wrap">
              {motd}
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  )
}

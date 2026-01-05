import { Box, Text } from 'ink'
import { colors } from '../utils/colors'

type FormScreenProps = {
  title: string
  subtitle?: string
  successMessage?: string
  error?: string
  loading?: boolean
  loadingMessage?: string
  children: React.ReactNode
}

export function FormScreen({
  title,
  subtitle,
  successMessage,
  error,
  loading = false,
  loadingMessage = 'Loading...',
  children,
}: FormScreenProps): React.ReactNode {
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>{title}</Text>
      </Box>

      {subtitle && (
        <Box marginBottom={1}>
          <Text color={colors.muted}>{subtitle}</Text>
        </Box>
      )}

      {successMessage && (
        <Box marginBottom={1}>
          <Text color="green">{successMessage}</Text>
        </Box>
      )}

      {error && (
        <Box marginBottom={1}>
          <Text color={colors.error}>{error}</Text>
        </Box>
      )}

      {loading ? (
        <Box>
          <Text color={colors.muted}>{loadingMessage}</Text>
        </Box>
      ) : (
        <Box flexDirection="column">{children}</Box>
      )}
    </Box>
  )
}

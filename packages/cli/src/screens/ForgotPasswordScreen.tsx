import { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import { TextInput } from '../components/TextInput'
import { trpcClient, toApiError } from '../utils/trpc'
import { useRouter } from '../components/Router'

const fields = ['email', 'submit'] as const
type Field = (typeof fields)[number]

export function ForgotPasswordScreen() {
  const [activeField, setActiveField] = useState<Field>('email')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { push, pop } = useRouter()

  const navigateField = (direction: 1 | -1) => {
    setActiveField((f) => {
      const idx = fields.indexOf(f)
      return fields[(idx + direction + fields.length) % fields.length]
    })
  }

  const handleFieldSubmit = () => {
    if (activeField !== 'submit') {
      navigateField(1)
    }
  }

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Email is required')
      setActiveField('email')
      return
    }

    setLoading(true)
    setError('')

    try {
      await trpcClient.auth.requestPasswordReset.mutate({ email })
      push('reset-password', { email })
    } catch (err) {
      setLoading(false)
      const apiError = toApiError(err)
      setError(apiError.message)
    }
  }

  useInput((_input, key) => {
    if (loading) return
    if (key.escape) {
      pop()
    } else if (key.upArrow) {
      navigateField(-1)
    } else if (key.downArrow || key.tab) {
      navigateField(1)
    } else if (key.return && activeField === 'submit') {
      handleSubmit()
    }
  })

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text dimColor>Requesting code...</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>Forgot Your Password?</Text>
      </Box>

      {error && (
        <Box marginBottom={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text dimColor>Enter your email to receive a reset code.</Text>
        </Box>
        <Box>
          <Text dimColor={activeField !== 'email'}>Email: </Text>
          <TextInput
            value={email}
            onChange={setEmail}
            onSubmit={handleFieldSubmit}
            focus={activeField === 'email'}
          />
        </Box>
        <Box marginTop={1}>
          <Text
            color={activeField === 'submit' ? 'green' : undefined}
            dimColor={activeField !== 'submit'}
          >
            [ Send Code ]
          </Text>
        </Box>
      </Box>
    </Box>
  )
}

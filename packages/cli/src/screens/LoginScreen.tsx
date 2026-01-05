import { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import { TextInput } from '../components/TextInput'
import { trpcClient, toApiError, ApiErrorCode } from '../utils/trpc'
import { saveToken } from '../utils/credentials'
import { useRouter } from '../components/Router'

const fields = ['email', 'password', 'submit'] as const
type Field = (typeof fields)[number]

export function LoginScreen() {
  const [activeField, setActiveField] = useState<Field>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { reset, pop, params } = useRouter()

  const successMessage = (params as { successMessage?: string } | undefined)?.successMessage

  const navigateField = (direction: 1 | -1) => {
    setActiveField((f) => {
      const idx = fields.indexOf(f)
      return fields[(idx + direction + fields.length) % fields.length]
    })
  }

  const handleFieldSubmit = () => {
    const idx = fields.indexOf(activeField)
    const submitIdx = fields.indexOf('submit')
    if (idx < submitIdx) {
      navigateField(1)
    }
  }

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Email is required')
      setActiveField('email')
      return
    }

    if (!password) {
      setError('Password is required')
      setActiveField('password')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await trpcClient.auth.login.mutate({ email, password })
      saveToken(result.token)
      reset('dashboard')
    } catch (err) {
      setLoading(false)
      const apiError = toApiError(err)

      if (apiError.code === ApiErrorCode.UNAUTHORIZED) {
        setError('Invalid email or password')
      } else {
        setError(apiError.message)
      }
      setPassword('')
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

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>Sign in now!</Text>
      </Box>

      {successMessage && (
        <Box marginBottom={1}>
          <Text color="green">{successMessage}</Text>
        </Box>
      )}

      {error && (
        <Box marginBottom={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      {!loading && (
        <Box flexDirection="column">
          <Box>
            <Text dimColor={activeField !== 'email'}>Email: </Text>
            <TextInput
              value={email}
              onChange={setEmail}
              onSubmit={handleFieldSubmit}
              focus={activeField === 'email'}
            />
          </Box>
          <Box>
            <Text dimColor={activeField !== 'password'}>Password: </Text>
            <TextInput
              value={password}
              onChange={setPassword}
              onSubmit={handleFieldSubmit}
              mask="*"
              focus={activeField === 'password'}
            />
          </Box>
          <Box marginTop={1}>
            <Text
              color={activeField === 'submit' ? 'green' : undefined}
              dimColor={activeField !== 'submit'}
            >
              [ Login ]
            </Text>
          </Box>
        </Box>
      )}

      {loading && (
        <Box>
          <Text dimColor>Logging in...</Text>
        </Box>
      )}
    </Box>
  )
}

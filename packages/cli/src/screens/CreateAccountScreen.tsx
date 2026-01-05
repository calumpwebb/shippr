import { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import { TextInput } from '../components/TextInput'
import { trpcClient, toApiError, ApiErrorCode } from '../utils/trpc'
import { saveToken } from '../utils/credentials'
import { useRouter } from '../components/Router'

const fields = ['email', 'password', 'confirmPassword', 'submit'] as const
type Field = (typeof fields)[number]

export function CreateAccountScreen() {
  const [activeField, setActiveField] = useState<Field>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { reset, pop } = useRouter()

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

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setPassword('')
      setConfirmPassword('')
      setActiveField('password')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setConfirmPassword('')
      setActiveField('confirmPassword')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await trpcClient.auth.createUser.mutate({ email, password })
      saveToken(result.token)
      reset('dashboard')
    } catch (err) {
      setLoading(false)
      const apiError = toApiError(err)

      if (apiError.code === ApiErrorCode.CONFLICT) {
        setError('Email already registered')
      } else {
        setError(apiError.message)
      }
      setPassword('')
      setConfirmPassword('')
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
        <Text bold>Create your account!</Text>
      </Box>

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
          <Box>
            <Text dimColor={activeField !== 'confirmPassword'}>Confirm Password: </Text>
            <TextInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              onSubmit={handleFieldSubmit}
              mask="*"
              focus={activeField === 'confirmPassword'}
            />
          </Box>
          <Box marginTop={1}>
            <Text
              color={activeField === 'submit' ? 'green' : undefined}
              dimColor={activeField !== 'submit'}
            >
              [ Sign Up ]
            </Text>
          </Box>
        </Box>
      )}

      {loading && (
        <Box>
          <Text dimColor>Creating account...</Text>
        </Box>
      )}
    </Box>
  )
}

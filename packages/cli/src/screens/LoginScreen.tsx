import { useState } from 'react'
import { Box, useInput } from 'ink'
import { TextInput } from '../components/TextInput'
import { Button } from '../components/Button'
import { FormScreen } from '../components/FormScreen'
import { trpcClient, toApiError, ApiErrorCode } from '../utils/trpc'
import { saveToken } from '../utils/credentials'
import { useRouter } from '../components/Router'

const fields = ['email', 'password', 'submit'] as const
type Field = (typeof fields)[number]

export function LoginScreen(): React.ReactNode {
  const [activeField, setActiveField] = useState<Field>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { reset, pop, params } = useRouter()

  const successMessage = (params as { successMessage?: string } | undefined)?.successMessage

  function navigateField(direction: 1 | -1): void {
    setActiveField((f) => {
      const idx = fields.indexOf(f)
      return fields[(idx + direction + fields.length) % fields.length]
    })
  }

  function handleFieldSubmit(): void {
    const idx = fields.indexOf(activeField)
    const submitIdx = fields.indexOf('submit')
    if (idx < submitIdx) {
      navigateField(1)
    }
  }

  async function handleSubmit(): Promise<void> {
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
    }
  })

  return (
    <FormScreen
      title="Sign in"
      subtitle="Welcome back! Enter your credentials."
      successMessage={successMessage}
      error={error}
      loading={loading}
      loadingMessage="Logging in..."
    >
      <TextInput
        label="Email: "
        value={email}
        onChange={setEmail}
        onSubmit={handleFieldSubmit}
        focus={activeField === 'email'}
      />
      <TextInput
        label="Password: "
        value={password}
        onChange={setPassword}
        onSubmit={handleFieldSubmit}
        mask="*"
        focus={activeField === 'password'}
      />
      <Box marginTop={1}>
        <Button label="Login" onPress={handleSubmit} focus={activeField === 'submit'} />
      </Box>
    </FormScreen>
  )
}

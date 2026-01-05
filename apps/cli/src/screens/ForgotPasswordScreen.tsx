import { useState } from 'react'
import { Box, useInput } from 'ink'
import { TextInput } from '../components/TextInput'
import { Button } from '../components/Button'
import { FormScreen } from '../components/FormScreen'
import { trpcClient, toApiError } from '../utils/trpc'
import { useRouter } from '../components/Router'

const fields = ['email', 'submit'] as const
type Field = (typeof fields)[number]

export function ForgotPasswordScreen(): React.ReactNode {
  const [activeField, setActiveField] = useState<Field>('email')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { push, pop } = useRouter()

  function navigateField(direction: 1 | -1): void {
    setActiveField((f) => {
      const idx = fields.indexOf(f)
      return fields[(idx + direction + fields.length) % fields.length]
    })
  }

  function handleFieldSubmit(): void {
    if (activeField !== 'submit') {
      navigateField(1)
    }
  }

  async function handleSubmit(): Promise<void> {
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
    }
  })

  return (
    <FormScreen
      title="Forgot your password?"
      subtitle="Enter your email to receive a reset code."
      error={error}
      loading={loading}
      loadingMessage="Requesting code..."
    >
      <TextInput
        label="Email: "
        value={email}
        onChange={setEmail}
        onSubmit={handleFieldSubmit}
        focus={activeField === 'email'}
      />
      <Box marginTop={1}>
        <Button label="Send Code" onPress={handleSubmit} focus={activeField === 'submit'} />
      </Box>
    </FormScreen>
  )
}

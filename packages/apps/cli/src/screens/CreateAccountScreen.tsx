import { useState } from 'react'
import { z } from 'zod'
import { Box, useInput } from 'ink'
import { TextInput } from '../components/TextInput'
import { Button } from '../components/Button'
import { FormScreen } from '../components/FormScreen'
import { trpcClient, toApiError, ApiErrorCode } from '../utils/trpc'
import { saveToken } from '../utils/credentials'
import { useRouter } from '../components/Router'

const fields = ['email', 'password', 'confirmPassword', 'submit'] as const
type Field = (typeof fields)[number]

export function CreateAccountScreen(): React.ReactNode {
  const [activeField, setActiveField] = useState<Field>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { reset, pop } = useRouter()

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

    if (!z.string().email().safeParse(email).success) {
      setError('Please enter a valid email address')
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
    }
  })

  return (
    <FormScreen
      title="Create your account"
      subtitle="Join us! Fill in your details below."
      error={error}
      loading={loading}
      loadingMessage="Creating account..."
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
      <TextInput
        label="Confirm Password: "
        value={confirmPassword}
        onChange={setConfirmPassword}
        onSubmit={handleFieldSubmit}
        mask="*"
        focus={activeField === 'confirmPassword'}
      />
      <Box marginTop={1}>
        <Button label="Sign Up" onPress={handleSubmit} focus={activeField === 'submit'} />
      </Box>
    </FormScreen>
  )
}

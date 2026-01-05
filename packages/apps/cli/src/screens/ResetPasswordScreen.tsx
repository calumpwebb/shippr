import { useState } from 'react'
import { Box, useInput } from 'ink'
import { TextInput } from '../components/TextInput'
import { Button } from '../components/Button'
import { FormScreen } from '../components/FormScreen'
import { trpcClient, toApiError } from '../utils/trpc'
import { useRouter } from '../components/Router'

const fields = ['code', 'newPassword', 'confirmPassword', 'submit'] as const
type Field = (typeof fields)[number]

export function ResetPasswordScreen(): React.ReactNode {
  const [activeField, setActiveField] = useState<Field>('code')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { push, pop, params } = useRouter()

  const email = (params as { email: string } | undefined)?.email ?? ''

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
    if (!code.trim()) {
      setError('Code is required')
      setActiveField('code')
      return
    }
    if (code.length !== 6) {
      setError('Code must be 6 digits')
      setActiveField('code')
      return
    }
    if (!newPassword) {
      setError('New password is required')
      setActiveField('newPassword')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      setActiveField('newPassword')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      setActiveField('confirmPassword')
      return
    }

    setLoading(true)
    setError('')

    try {
      await trpcClient.auth.resetPassword.mutate({ email, code, newPassword })
      push('login', { successMessage: 'Password reset successfully!' })
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
      title="Reset password"
      subtitle="Enter the code from your email and choose a new password."
      error={error}
      loading={loading}
      loadingMessage="Resetting password..."
    >
      <TextInput
        label="Code: "
        value={code}
        onChange={setCode}
        onSubmit={handleFieldSubmit}
        focus={activeField === 'code'}
      />
      <TextInput
        label="New Password: "
        value={newPassword}
        onChange={setNewPassword}
        onSubmit={handleFieldSubmit}
        mask="*"
        focus={activeField === 'newPassword'}
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
        <Button label="Reset Password" onPress={handleSubmit} focus={activeField === 'submit'} />
      </Box>
    </FormScreen>
  )
}

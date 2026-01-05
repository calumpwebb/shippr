import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '../components/TextInput';
import { trpcClient, toApiError } from '../utils/trpc';
import { useRouter } from '../components/Router';

const fields = ['code', 'newPassword', 'confirmPassword', 'submit'] as const;
type Field = (typeof fields)[number];

export function ResetPasswordScreen() {
  const [activeField, setActiveField] = useState<Field>('code');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { push, pop, params } = useRouter();

  const email = (params as { email: string } | undefined)?.email ?? '';

  const navigateField = (direction: 1 | -1) => {
    setActiveField((f) => {
      const idx = fields.indexOf(f);
      return fields[(idx + direction + fields.length) % fields.length];
    });
  };

  const handleFieldSubmit = () => {
    if (activeField !== 'submit') {
      navigateField(1);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      setError('Code is required');
      setActiveField('code');
      return;
    }
    if (code.length !== 6) {
      setError('Code must be 6 digits');
      setActiveField('code');
      return;
    }
    if (!newPassword) {
      setError('New password is required');
      setActiveField('newPassword');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      setActiveField('newPassword');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setActiveField('confirmPassword');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await trpcClient.resetPassword.mutate({ email, code, newPassword });
      push('login', { successMessage: 'Password reset successfully!' });
    } catch (err) {
      setLoading(false);
      const apiError = toApiError(err);
      setError(apiError.message);
    }
  };

  useInput((_input, key) => {
    if (loading) return;
    if (key.escape) {
      pop();
    } else if (key.upArrow) {
      navigateField(-1);
    } else if (key.downArrow || key.tab) {
      navigateField(1);
    } else if (key.return && activeField === 'submit') {
      handleSubmit();
    }
  });

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text dimColor>Resetting password...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>Reset Password</Text>
      </Box>

      {error && (
        <Box marginBottom={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text dimColor>Check API console for the 6-digit code.</Text>
        </Box>
        <Box>
          <Text dimColor={activeField !== 'code'}>Code: </Text>
          {activeField === 'code' ? (
            <TextInput value={code} onChange={setCode} onSubmit={handleFieldSubmit} />
          ) : (
            <Text dimColor>{code}</Text>
          )}
        </Box>
        <Box>
          <Text dimColor={activeField !== 'newPassword'}>New Password: </Text>
          {activeField === 'newPassword' ? (
            <TextInput value={newPassword} onChange={setNewPassword} onSubmit={handleFieldSubmit} mask="*" />
          ) : (
            <Text dimColor>{'*'.repeat(newPassword.length)}</Text>
          )}
        </Box>
        <Box>
          <Text dimColor={activeField !== 'confirmPassword'}>Confirm Password: </Text>
          {activeField === 'confirmPassword' ? (
            <TextInput value={confirmPassword} onChange={setConfirmPassword} onSubmit={handleFieldSubmit} mask="*" />
          ) : (
            <Text dimColor>{'*'.repeat(confirmPassword.length)}</Text>
          )}
        </Box>
        <Box marginTop={1}>
          <Text color={activeField === 'submit' ? 'green' : undefined} dimColor={activeField !== 'submit'}>
            [ Reset Password ]
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from './TextInput';
import { trpcClient } from '../utils/trpc';

type ForgotPasswordFormProps = {
  onBack: () => void;
  onSuccess: () => void;
};

type Stage = 'email' | 'reset';

const emailStageFields = ['email', 'submit'] as const;
const resetStageFields = ['code', 'newPassword', 'confirmPassword', 'submit'] as const;
type ActiveField = (typeof emailStageFields)[number] | (typeof resetStageFields)[number];

export function ForgotPasswordForm({ onBack, onSuccess }: ForgotPasswordFormProps) {
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activeField, setActiveField] = useState<ActiveField>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getFields = () => (stage === 'email' ? emailStageFields : resetStageFields);

  const navigateField = (direction: 1 | -1) => {
    const fields = getFields();
    setActiveField((f) => {
      const idx = fields.indexOf(f as any);
      if (idx === -1) return fields[0];
      return fields[(idx + direction + fields.length) % fields.length];
    });
  };

  const handleRequestCode = async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await trpcClient.requestPasswordReset.mutate({ email });
      setStage('reset');
      setActiveField('code');
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
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
      onSuccess();
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'An unexpected error occurred');
    }
  };

  const handleFieldSubmit = () => {
    if (activeField !== 'submit') {
      navigateField(1);
    }
  };

  useInput((_input, key) => {
    if (loading) return;
    if (key.escape) {
      if (stage === 'reset') {
        setStage('email');
        setActiveField('email');
        setCode('');
        setNewPassword('');
        setConfirmPassword('');
        setError('');
      } else {
        onBack();
      }
    } else if (key.upArrow) {
      navigateField(-1);
    } else if (key.downArrow || key.tab) {
      navigateField(1);
    } else if (key.return && activeField === 'submit') {
      if (stage === 'email') {
        handleRequestCode();
      } else {
        handleResetPassword();
      }
    }
  });

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text dimColor>{stage === 'email' ? 'Requesting code...' : 'Resetting password...'}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>{stage === 'email' ? 'Forgot Password' : 'Reset Password'}</Text>
      </Box>

      {error && (
        <Box marginBottom={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      {stage === 'email' && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text dimColor>Enter your email to receive a reset code.</Text>
          </Box>
          <Box>
            <Text dimColor={activeField !== 'email'}>Email: </Text>
            {activeField === 'email' ? (
              <TextInput value={email} onChange={setEmail} onSubmit={handleFieldSubmit} />
            ) : (
              <Text dimColor>{email}</Text>
            )}
          </Box>
          <Box marginTop={1}>
            <Text color={activeField === 'submit' ? 'green' : undefined} dimColor={activeField !== 'submit'}>
              [ Send Code ]
            </Text>
          </Box>
        </Box>
      )}

      {stage === 'reset' && (
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
      )}

    </Box>
  );
}

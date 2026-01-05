import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { trpcClient } from '../utils/trpc';
import { saveToken } from '../utils/credentials';
import { useRouter } from './Router';

type SignupFormProps = {
  onBack: () => void;
};

export function SignupForm({ onBack }: SignupFormProps) {
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { replace } = useRouter();

  const handleEmailSubmit = (value: string) => {
    setEmail(value);
    setStep('password');
  };

  const handlePasswordSubmit = async (value: string) => {
    setPassword(value);

    if (value.length < 8) {
      setError('Password must be at least 8 characters');
      setPassword('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await trpcClient.createUser.mutate({ email, password: value });
      saveToken(result.token);
      replace('dashboard');
    } catch (err: any) {
      setLoading(false);
      if (err.message?.includes('CONFLICT') || err.message?.includes('already registered')) {
        setError('Email already registered');
      } else if (err.message?.includes('fetch')) {
        setError('Cannot connect to server. Is the API running?');
      } else {
        setError('An unexpected error occurred');
      }
      setPassword('');
      setStep('password');
    }
  };

  useInput((input, key) => {
    if (key.escape && !loading) {
      onBack();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>Create Account</Text>
      </Box>

      {step === 'email' && (
        <Box>
          <Text>Email: </Text>
          <TextInput value={email} onChange={setEmail} onSubmit={handleEmailSubmit} />
        </Box>
      )}

      {step === 'password' && !loading && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text dimColor>Email: {email}</Text>
          </Box>
          <Box>
            <Text>Password (min 8 chars): </Text>
            <TextInput
              value={password}
              onChange={setPassword}
              onSubmit={handlePasswordSubmit}
              mask="*"
            />
          </Box>
        </Box>
      )}

      {loading && (
        <Box>
          <Text dimColor>Creating account...</Text>
        </Box>
      )}

      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>(Press ESC to go back)</Text>
      </Box>
    </Box>
  );
}

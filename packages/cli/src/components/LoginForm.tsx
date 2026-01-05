import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { trpcClient } from '../utils/trpc';
import { saveToken } from '../utils/credentials';
import { useRouter } from './Router';

export function LoginForm() {
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
    setLoading(true);
    setError('');

    try {
      const result = await trpcClient.loginUser.mutate({ email, password: value });
      saveToken(result.token);
      replace('dashboard');
    } catch (err: any) {
      setLoading(false);
      if (err.message?.includes('UNAUTHORIZED')) {
        setError('Invalid email or password');
      } else if (err.message?.includes('fetch')) {
        setError('Cannot connect to server. Is the API running?');
      } else {
        setError('An unexpected error occurred');
      }
      setPassword('');
      setStep('password');
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>Login</Text>
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
            <Text>Password: </Text>
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
          <Text dimColor>Logging in...</Text>
        </Box>
      )}

      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}
    </Box>
  );
}

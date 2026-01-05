import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from './TextInput';
import { trpcClient } from '../utils/trpc';
import { saveToken } from '../utils/credentials';
import { useRouter } from './Router';
import { Footer } from './Footer';

type LoginFormProps = {
  onBack: () => void;
  onForgotPassword: () => void;
  successMessage?: string;
};

export function LoginForm({ onBack, onForgotPassword, successMessage }: LoginFormProps) {
  const [activeField, setActiveField] = useState<'email' | 'password' | 'submit' | 'forgot'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { replace } = useRouter();

  const handleFieldSubmit = () => {
    if (activeField === 'email') {
      setActiveField('password');
    } else if (activeField === 'password') {
      setActiveField('submit');
    }
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Email is required');
      setActiveField('email');
      return;
    }

    if (!password) {
      setError('Password is required');
      setActiveField('password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await trpcClient.loginUser.mutate({ email, password });
      saveToken(result.token);
      replace('dashboard');
    } catch (err: any) {
      setLoading(false);
      if (err.data?.code === 'BAD_REQUEST') {
        try {
          const issues = JSON.parse(err.message);
          if (Array.isArray(issues)) {
            setError(issues.map((i: any) => i.message).join(', '));
            setPassword('');
            return;
          }
        } catch {}
      }
      if (err.data?.code === 'UNAUTHORIZED') {
        setError('Invalid email or password');
      } else if (err.message?.includes('fetch')) {
        setError('Cannot connect to server. Is the API running?');
      } else {
        setError('An unexpected error occurred');
      }
      setPassword('');
    }
  };

  useInput((input, key) => {
    if (loading) return;
    if (key.escape) {
      onBack();
    } else if (key.upArrow) {
      setActiveField((f) => {
        if (f === 'email') return 'forgot';
        if (f === 'password') return 'email';
        if (f === 'submit') return 'password';
        return 'submit';
      });
    } else if (key.downArrow || key.tab) {
      setActiveField((f) => {
        if (f === 'email') return 'password';
        if (f === 'password') return 'submit';
        if (f === 'submit') return 'forgot';
        return 'email';
      });
    } else if (key.return) {
      if (activeField === 'submit') {
        handleSubmit();
      } else if (activeField === 'forgot') {
        onForgotPassword();
      }
    }
  });

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
            {activeField === 'email' ? (
              <TextInput value={email} onChange={setEmail} onSubmit={handleFieldSubmit} />
            ) : (
              <Text dimColor>{email}</Text>
            )}
          </Box>
          <Box>
            <Text dimColor={activeField !== 'password'}>Password: </Text>
            {activeField === 'password' ? (
              <TextInput value={password} onChange={setPassword} onSubmit={handleFieldSubmit} mask="*" />
            ) : (
              <Text dimColor>{'*'.repeat(password.length)}</Text>
            )}
          </Box>
          <Box marginTop={1}>
            <Text color={activeField === 'submit' ? 'green' : undefined} dimColor={activeField !== 'submit'}>
              [ Login ]
            </Text>
          </Box>
          <Box>
            <Text color={activeField === 'forgot' ? 'cyan' : undefined} dimColor={activeField !== 'forgot'}>
              [ Forgot Password? ]
            </Text>
          </Box>
        </Box>
      )}

      {loading && (
        <Box>
          <Text dimColor>Logging in...</Text>
        </Box>
      )}

      <Footer />
    </Box>
  );
}

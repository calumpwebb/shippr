import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from './TextInput';
import { trpcClient } from '../utils/trpc';
import { saveToken } from '../utils/credentials';
import { useRouter } from './Router';
import { Footer } from './Footer';

type SignupFormProps = {
  onBack: () => void;
};

const fields = ['email', 'password', 'confirmPassword', 'submit'] as const;
type Field = (typeof fields)[number];

export function SignupForm({ onBack }: SignupFormProps) {
  const [activeField, setActiveField] = useState<Field>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { replace } = useRouter();

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
    if (!email.trim()) {
      setError('Email is required');
      setActiveField('email');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setPassword('');
      setConfirmPassword('');
      setActiveField('password');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setConfirmPassword('');
      setActiveField('confirmPassword');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await trpcClient.createUser.mutate({ email, password });
      saveToken(result.token);
      replace('dashboard');
    } catch (err: any) {
      setLoading(false);
      if (err.data?.code === 'BAD_REQUEST') {
        try {
          const issues = JSON.parse(err.message);
          if (Array.isArray(issues)) {
            setError(issues.map((i: any) => i.message).join(', '));
            return;
          }
        } catch {}
      }
      if (err.data?.code === 'CONFLICT') {
        setError('Email already registered');
      } else if (err.message?.includes('fetch')) {
        setError('Cannot connect to server. Is the API running?');
      } else {
        setError('An unexpected error occurred');
      }
      setPassword('');
      setConfirmPassword('');
    }
  };

  useInput((_input, key) => {
    if (loading) return;
    if (key.escape) {
      onBack();
    } else if (key.upArrow) {
      navigateField(-1);
    } else if (key.downArrow || key.tab) {
      navigateField(1);
    } else if (key.return && activeField === 'submit') {
      handleSubmit();
    }
  });

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

      <Footer />
    </Box>
  );
}

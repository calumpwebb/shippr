import React, { useState } from 'react';
import { Menu } from './Menu';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';

type Screen = 'menu' | 'login' | 'signup' | 'forgotPassword';

export function AuthScreen() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [successMessage, setSuccessMessage] = useState('');

  const handleBack = () => {
    setScreen('menu');
    setSuccessMessage('');
  };

  const handlePasswordResetSuccess = () => {
    setSuccessMessage('Password reset successfully!');
    setScreen('login');
  };

  if (screen === 'menu') {
    return <Menu onSelect={(choice) => setScreen(choice)} />;
  }

  if (screen === 'login') {
    return <LoginForm onBack={handleBack} successMessage={successMessage} />;
  }

  if (screen === 'forgotPassword') {
    return <ForgotPasswordForm onBack={handleBack} onSuccess={handlePasswordResetSuccess} />;
  }

  return <SignupForm onBack={handleBack} />;
}

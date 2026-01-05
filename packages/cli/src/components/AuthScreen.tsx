import React, { useState } from 'react';
import { Menu } from './Menu';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';

type Screen = 'menu' | 'login' | 'signup';

export function AuthScreen() {
  const [screen, setScreen] = useState<Screen>('menu');

  if (screen === 'menu') {
    return <Menu onSelect={(choice) => setScreen(choice)} />;
  }

  if (screen === 'login') {
    return <LoginForm />;
  }

  return <SignupForm />;
}

// Login Screen - Access Code Entry
import React, { useState, FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../Button';
import Spinner from '../Spinner';
import { Card, Input, Alert } from '../ui';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { login, isLoading, error, clearError, isConfigured } = useAuth();
  const [accessCode, setAccessCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!accessCode.trim()) {
      setLocalError('Please enter an access code');
      return;
    }

    const success = await login(accessCode.trim());
    if (success && onLoginSuccess) {
      onLoginSuccess();
    }
  };

  const displayError = localError || error;

  if (!isConfigured) {
    return (
      <div className="animate-fade-in">
        {/* Logo/Header */}
        <div className="text-center mb-8 lg:hidden">
          <img
            src="https://cutinside.com/wp-content/uploads/2025/01/Logo.svg"
            alt="Cut Inside Logo"
            className="h-10 w-auto mx-auto mb-4"
          />
          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">
            Welcome to Cut Inside
          </h1>
          <p className="text-gray-600">Content Brief Generator</p>
        </div>

        <Alert variant="warning" title="Supabase Not Configured" className="mb-6">
          <p className="mb-3">
            To enable authentication and brief persistence, add your Supabase credentials
            to <code className="text-teal bg-teal/10 px-1.5 py-0.5 rounded">.env.local</code>:
          </p>
          <Card variant="outline" padding="sm" className="font-mono text-xs">
            <p>VITE_SUPABASE_URL=your-project-url</p>
            <p>VITE_SUPABASE_ANON_KEY=your-anon-key</p>
          </Card>
        </Alert>

        <p className="text-center text-gray-400 text-sm mb-6">
          You can continue using the app without authentication,
          but briefs will not be saved.
        </p>

        <div className="text-center">
          <Button onClick={onLoginSuccess} variant="primary" glow>
            Continue Without Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Logo/Header */}
      <div className="text-center mb-8 lg:hidden">
        <img
          src="https://cutinside.com/wp-content/uploads/2025/01/Logo.svg"
          alt="Cut Inside Logo"
          className="h-10 w-auto mx-auto mb-4"
        />
        <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">
          Welcome to Cut Inside
        </h1>
        <p className="text-gray-600">Content Brief Generator</p>
      </div>

      <Card variant="elevated" padding="lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Access Code"
            id="accessCode"
            type="password"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="Enter your access code"
            autoFocus
            disabled={isLoading}
            error={displayError || undefined}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            }
          />

          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || !accessCode.trim()}
            fullWidth
            glow
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size="sm" />
                Validating...
              </span>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
      </Card>

      <div className="mt-8 pt-6 border-t border-gray-100 text-center">
        <p className="text-gray-400 text-sm">
          Don't have an access code?{' '}
          <a href="mailto:support@cutinside.com" className="text-teal hover:underline transition-colors">
            Contact your administrator
          </a>
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;

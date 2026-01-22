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
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full animate-fade-in">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-teal/10 rounded-radius-lg mb-4">
              <svg className="w-8 h-8 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-heading font-bold text-text-primary mb-2">
              Welcome to Cut Inside
            </h1>
            <p className="text-text-secondary">Content Brief Generator</p>
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

          <p className="text-center text-text-muted text-sm mb-6">
            You can continue using the app without authentication,
            but briefs will not be saved.
          </p>

          <div className="text-center">
            <Button onClick={onLoginSuccess} variant="primary" glow>
              Continue Without Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full animate-fade-in">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal/10 rounded-radius-lg mb-4">
            <svg className="w-8 h-8 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-heading font-bold text-text-primary mb-2">
            Welcome to Cut Inside
          </h1>
          <p className="text-text-secondary">Content Brief Generator</p>
        </div>

        <Card variant="elevated" padding="lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Access Code"
              id="accessCode"
              type="text"
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

        <div className="mt-8 pt-6 border-t border-border-subtle text-center">
          <p className="text-text-muted text-sm">
            Don't have an access code?{' '}
            <a href="mailto:support@cutinside.com" className="text-teal hover:underline transition-colors">
              Contact your administrator
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;

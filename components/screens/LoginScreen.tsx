// Login Screen - Access Code Entry
import React, { useState, FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../Button';
import Spinner from '../Spinner';

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
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-brand-white mb-2">
            Welcome to Cut Inside
          </h1>
          <p className="text-grey">Content Brief Generator</p>
        </div>

        <div className="bg-yellow/10 border border-yellow/50 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-heading font-semibold text-yellow">Supabase Not Configured</h3>
              <p className="text-sm text-grey mt-1">
                To enable authentication and brief persistence, add your Supabase credentials
                to <code className="text-teal">.env.local</code>:
              </p>
              <pre className="mt-2 p-2 bg-black/50 rounded text-xs text-grey overflow-x-auto">
{`VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key`}
              </pre>
            </div>
          </div>
        </div>

        <p className="text-center text-grey text-sm">
          You can continue using the app without authentication,
          but briefs will not be saved.
        </p>

        <div className="mt-6 text-center">
          <Button onClick={onLoginSuccess} variant="primary">
            Continue Without Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-heading font-bold text-brand-white mb-2">
          Welcome to Cut Inside
        </h1>
        <p className="text-grey">Content Brief Generator</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="accessCode" className="block text-sm font-medium text-grey mb-2">
            Access Code
          </label>
          <input
            id="accessCode"
            type="text"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="Enter your access code"
            className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-lg text-brand-white placeholder-grey/50 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-colors"
            autoFocus
            disabled={isLoading}
          />
        </div>

        {displayError && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
            <p className="text-red-400 text-sm">{displayError}</p>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          disabled={isLoading || !accessCode.trim()}
          className="w-full"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <Spinner size="sm" className="mr-2" />
              Validating...
            </span>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      <div className="mt-8 pt-6 border-t border-white/10">
        <p className="text-center text-grey text-sm">
          Don't have an access code?{' '}
          <a href="mailto:support@cutinside.com" className="text-teal hover:underline">
            Contact your administrator
          </a>
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;

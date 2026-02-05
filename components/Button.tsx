import React from 'react';
import { cn } from '@/lib/utils';

let useSound: (() => { playSound: (sound: string) => void } | null) | undefined;
try {
  const AppModule = require('../App');
  useSound = AppModule.useSound;
} catch {
  useSound = undefined;
}

const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };
  return (
    <svg
      className={cn('animate-spin', sizeClasses[size])}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  glow?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  glow = false,
  className,
  onClick,
  disabled,
  ...props
}) => {
  const sound = useSound?.();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading) return;
    sound?.playSound('click');
    if (onClick) {
      onClick(e);
    }
  };

  const baseStyle =
    'font-heading font-bold rounded-md transition-all duration-200 ease-in-out focus:outline-none focus-ring transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-gradient-to-r from-teal-500 to-teal-700 hover:from-teal-600 hover:to-teal-800 text-white shadow-sm hover:shadow-md disabled:from-gray-200 disabled:to-gray-300 disabled:text-gray-400',
    secondary:
      'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-900 shadow-sm disabled:bg-gray-50 disabled:text-gray-400',
    outline:
      'bg-transparent hover:bg-teal-50 text-teal border border-teal/50 hover:border-teal disabled:border-gray-200 disabled:text-gray-400 disabled:bg-transparent',
    ghost:
      'bg-transparent hover:bg-gray-100 text-gray-700 hover:text-gray-900 disabled:text-gray-400 disabled:bg-transparent',
    danger:
      'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200',
  };

  const sizeStyles = {
    sm: 'py-2 px-3 text-sm',
    md: 'py-3 px-4 text-base',
    lg: 'py-4 px-6 text-lg',
  };

  const widthStyle = fullWidth ? 'w-full' : 'w-auto';
  const glowStyle = glow && variant === 'primary' ? 'shadow-glow-teal hover:shadow-glow-teal' : '';
  const loadingStyle = loading ? 'opacity-80 cursor-wait' : '';

  const classes = cn(
    baseStyle,
    variantStyles[variant],
    sizeStyles[size],
    widthStyle,
    glowStyle,
    loadingStyle,
    className,
  );

  const spinnerSize = size === 'lg' ? 'md' : size === 'md' ? 'md' : 'sm';

  return (
    <button {...props} className={classes} onClick={handleClick} disabled={disabled || loading}>
      {loading && <Spinner size={spinnerSize} />}
      {!loading && icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {!loading && icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
    </button>
  );
};

export default Button;

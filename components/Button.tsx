import React from 'react';

// Try to import useSound from App, but make it optional
let useSound: (() => { playSound: (sound: string) => void } | null) | undefined;
try {
  // Dynamic import to avoid circular dependency issues
  const AppModule = require('../App');
  useSound = AppModule.useSound;
} catch {
  useSound = undefined;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'md' | 'sm';
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className, onClick, ...props }) => {
  const sound = useSound?.();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    sound?.playSound('click');
    if (onClick) {
      onClick(e);
    }
  };

  const baseStyle =
    'font-heading font-bold rounded-md transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-teal transform active:scale-95 flex items-center justify-center disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'w-full bg-teal hover:bg-teal/80 text-brand-white disabled:bg-grey/20 disabled:text-grey/50',
    secondary: 'w-full bg-grey/20 hover:bg-grey/30 text-brand-white disabled:bg-grey/10',
    outline:
      'w-auto bg-transparent hover:bg-teal/20 text-teal border border-teal/50 hover:border-teal disabled:border-grey/20 disabled:text-grey/50 disabled:bg-transparent',
    ghost:
      'w-auto bg-transparent hover:bg-white/5 text-grey hover:text-brand-white disabled:text-grey/50 disabled:bg-transparent',
  };

  const sizeStyles = {
    md: 'py-3 px-4 text-base',
    sm: 'py-2 px-3 text-sm',
  };

  const classes = [baseStyle, variantStyles[variant], sizeStyles[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <button {...props} className={classes} onClick={handleClick}>
      {children}
    </button>
  );
};

export default Button;

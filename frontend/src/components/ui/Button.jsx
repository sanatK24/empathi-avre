import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

const Button = React.forwardRef(({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  loading = false,
  children,
  disabled,
  ...props 
}, ref) => {
  const variants = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm shadow-primary-500/20 active:scale-[0.98]',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98]',
    outline: 'bg-transparent border-2 border-primary-500 text-primary-600 hover:bg-primary-50 active:scale-[0.98]',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-500/20 active:scale-[0.98]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs font-medium rounded-lg',
    md: 'px-5 py-2.5 text-sm font-semibold rounded-xl',
    lg: 'px-7 py-3.5 text-base font-bold rounded-2xl',
    icon: 'p-2 rounded-xl',
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;

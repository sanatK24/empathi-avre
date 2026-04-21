import React from 'react';
import { cn } from '../../utils/cn';

const Input = React.forwardRef(({ className, type, error, label, ...props }, ref) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="text-sm font-semibold text-slate-700 ml-0.5">
          {label}
        </label>
      )}
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
          error && "border-red-500 focus-visible:ring-red-500/20 focus-visible:border-red-500",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && (
        <p className="text-xs font-medium text-red-500 ml-1 mt-1">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;

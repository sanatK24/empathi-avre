import React from 'react';
import { cn } from '../../utils/cn';

export const Card = ({ className, children, ...props }) => {
  return (
    <div 
      className={cn('bg-white rounded-2xl border border-slate-100 shadow-soft overflow-hidden', className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ className, children, ...props }) => (
  <div className={cn('p-6 pb-2', className)} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ className, children, ...props }) => (
  <h3 className={cn('text-lg font-bold text-slate-900 leading-tight', className)} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ className, children, ...props }) => (
  <p className={cn('text-sm text-slate-500 mt-1', className)} {...props}>
    {children}
  </p>
);

export const CardContent = ({ className, children, ...props }) => (
  <div className={cn('p-6 pt-4', className)} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ className, children, ...props }) => (
  <div className={cn('p-6 pt-2 bg-slate-50/50 border-t border-slate-100/50', className)} {...props}>
    {children}
  </div>
);

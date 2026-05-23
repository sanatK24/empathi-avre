import React from 'react';
import { cn } from '../../utils/cn';

/**
 * LoadingSpinner — Centralized loading indicator.
 *
 * Props:
 *   size   — 'sm' | 'md' (default) | 'lg'
 *   className — extra wrapper classes
 *   fullPage  — if true, centres inside a full-height container
 */
const SIZES = {
  sm: 'h-6 w-6 border-2',
  md: 'h-12 w-12 border-2',
  lg: 'h-16 w-16 border-2',
};

const LoadingSpinner = ({ size = 'md', className, fullPage = false }) => {
  const spinner = (
    <div
      className={cn(
        'animate-spin rounded-full border-b-primary-500',
        SIZES[size],
        className
      )}
      style={{ borderColor: 'transparent', borderBottomColor: 'var(--color-primary-500, #0ea5e9)' }}
      role="status"
      aria-label="Loading"
    />
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-64">
      {spinner}
    </div>
  );
};

export default LoadingSpinner;

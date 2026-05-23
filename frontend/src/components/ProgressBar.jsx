import React from 'react';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';

/**
 * ProgressBar — Centralized progress bar component.
 *
 * Props:
 *   value       — number 0–100, the fill percentage
 *   color       — Tailwind bg-* class (default 'bg-primary-500')
 *   trackColor  — Tailwind bg-* class for the track (default 'bg-slate-100')
 *   height      — Tailwind h-* class (default 'h-2')
 *   animated    — boolean, uses framer-motion to animate width on mount (default false)
 *   animDuration— motion animation duration in seconds (default 1)
 *   animDelay   — motion animation delay in seconds (default 0)
 *   rounded     — boolean, full rounded corners (default true)
 *   className   — extra classes on the track wrapper
 */
const ProgressBar = ({
  value = 0,
  color = 'bg-primary-500',
  trackColor = 'bg-slate-100',
  height = 'h-2',
  animated = false,
  animDuration = 1,
  animDelay = 0,
  rounded = true,
  className,
}) => {
  const clamped = Math.min(100, Math.max(0, value));
  const roundedClass = rounded ? 'rounded-full' : '';

  return (
    <div
      className={cn('w-full overflow-hidden', height, trackColor, roundedClass, className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {animated ? (
        <motion.div
          className={cn('h-full', color, roundedClass)}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: animDuration, delay: animDelay, ease: 'easeOut' }}
        />
      ) : (
        <div
          className={cn('h-full transition-all duration-700', color, roundedClass)}
          style={{ width: `${clamped}%` }}
        />
      )}
    </div>
  );
};

export default ProgressBar;

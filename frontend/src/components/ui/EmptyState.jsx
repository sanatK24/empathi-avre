import React from 'react';
import { cn } from '../../utils/cn';

/**
 * EmptyState — Centralized empty/no-data state component.
 *
 * Props:
 *   icon        — Lucide icon component (optional)
 *   title       — heading text
 *   description — subtext
 *   action      — React node (e.g. a Button) rendered below description
 *   variant     — 'default' | 'dashed' | 'dark'
 *                 'default' → white bg with rounded-3xl
 *                 'dashed'  → dashed border on slate-50 bg
 *                 'dark'    → used inside dark-bg cards
 *   className   — extra wrapper classes
 */
const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  variant = 'default',
  className,
}) => {
  const wrapperVariants = {
    default: 'bg-white rounded-3xl border border-dashed border-slate-200',
    dashed: 'bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200',
    dark: 'bg-white/5 rounded-2xl border border-white/10',
  };

  const iconVariants = {
    default: 'bg-slate-50 text-slate-300',
    dashed: 'bg-slate-100 text-slate-300',
    dark: 'bg-white/10 text-white/30',
  };

  const titleVariants = {
    default: 'text-slate-900',
    dashed: 'text-slate-400',
    dark: 'text-white/70',
  };

  const descVariants = {
    default: 'text-slate-500',
    dashed: 'text-slate-400',
    dark: 'text-slate-400',
  };

  return (
    <div className={cn('py-20 text-center', wrapperVariants[variant], className)}>
      {Icon && (
        <div
          className={cn(
            'w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6',
            iconVariants[variant]
          )}
        >
          <Icon className="w-10 h-10" />
        </div>
      )}
      {title && (
        <h3 className={cn('text-xl font-bold mb-2', titleVariants[variant])}>{title}</h3>
      )}
      {description && (
        <p className={cn('font-medium max-w-xs mx-auto text-sm', descVariants[variant])}>
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};

export default EmptyState;

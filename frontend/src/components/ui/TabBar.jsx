import React from 'react';
import { cn } from '../../utils/cn';

/**
 * TabBar — Reusable horizontal tab navigation.
 *
 * Props:
 *   tabs        — array of { id, label, icon? }
 *   activeTab   — id of the currently active tab
 *   onChange    — (tabId) => void
 *   variant     — 'pill' (default) | 'underline'
 *                 'pill'      → bg-slate-100 container with active white pill
 *                 'underline' → border-b underline style
 *   scrollable  — boolean, allows horizontal scroll (default true)
 *   className   — extra classes on the container
 */
const TabBar = ({
  tabs = [],
  activeTab,
  onChange,
  variant = 'pill',
  scrollable = true,
  className,
}) => {
  if (variant === 'underline') {
    return (
      <div
        className={cn(
          'flex gap-2 sm:gap-4 border-b border-slate-200',
          scrollable && 'overflow-x-auto no-scrollbar whitespace-nowrap',
          className
        )}
      >
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={cn(
                'px-3 sm:px-4 py-3 font-medium transition-colors text-sm sm:text-base capitalize',
                isActive
                  ? 'border-b-2 border-primary-500 text-primary-600'
                  : 'text-slate-500 hover:text-slate-800'
              )}
            >
              {Icon && <Icon className="inline w-4 h-4 mr-1.5 -mt-0.5" />}
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  // Default: pill variant
  return (
    <div
      className={cn(
        'flex gap-1.5 p-1.5 bg-slate-100/80 backdrop-blur-md rounded-2xl border border-slate-100/30 shadow-inner',
        scrollable && 'overflow-x-auto no-scrollbar',
        className
      )}
    >
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-2',
              isActive
                ? 'bg-white text-primary-600 shadow-sm border border-slate-100'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'
            )}
          >
            {Icon && (
              <Icon
                className={cn('w-3.5 h-3.5', isActive ? 'text-primary-500' : 'text-slate-400')}
              />
            )}
            {label}
          </button>
        );
      })}
    </div>
  );
};

export default TabBar;

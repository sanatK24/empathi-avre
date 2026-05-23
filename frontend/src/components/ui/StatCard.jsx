import React from 'react';
import { cn } from '../../utils/cn';
import { Card, CardContent } from './Card';
import { motion } from 'framer-motion';

/**
 * StatCard — Reusable metric card with icon, label, and value.
 *
 * Props:
 *   label      — string  (e.g. "Active Requests")
 *   value      — string | number  (e.g. "42" or formatNumber(n))
 *   icon       — Lucide icon component
 *   color      — Tailwind text-* class for the icon  (e.g. 'text-primary-500')
 *   bg         — Tailwind bg-*  class for the icon bg (e.g. 'bg-primary-50')
 *   trend      — optional string shown below value
 *   animated   — boolean, wraps in motion.div if true (default false)
 *   animDelay  — motion delay in seconds (default 0)
 *   variant    — 'default' | 'large' — controls icon and text sizing
 *   className  — extra wrapper classes
 */
const StatCard = ({
  label,
  value,
  icon: Icon,
  color = 'text-primary-500',
  bg = 'bg-primary-50',
  trend,
  animated = false,
  animDelay = 0,
  variant = 'default',
  className,
}) => {
  const isLarge = variant === 'large';

  const card = (
    <Card
      className={cn(
        'group hover:ring-2 hover:ring-primary-500/20 transition-all border-none ring-1 ring-slate-100 shadow-soft overflow-hidden h-full',
        className
      )}
    >
      <CardContent className={cn('flex flex-col justify-between h-full', isLarge ? 'p-8' : 'p-4 sm:p-5')}>
        {/* Icon */}
        <div
          className={cn(
            'rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform',
            bg,
            color,
            isLarge ? 'w-14 h-14 rounded-2xl mb-6' : 'w-8 h-8 sm:w-10 sm:h-10 mb-3 sm:mb-4'
          )}
        >
          {Icon && <Icon className={isLarge ? 'w-7 h-7' : 'w-4 h-4 sm:w-5 sm:h-5'} />}
        </div>

        {/* Content */}
        <div>
          <h3
            className={cn(
              'font-display font-black text-slate-900 leading-tight',
              isLarge ? 'text-3xl mb-1' : 'text-lg sm:text-2xl'
            )}
          >
            {value}
          </h3>
          <p
            className={cn(
              'font-bold text-slate-400 uppercase tracking-widest mt-1',
              isLarge ? 'text-xs' : 'text-[9px] sm:text-[10px] truncate'
            )}
          >
            {label}
          </p>
          {trend && (
            <p className={cn('text-xs font-bold mt-1 flex items-center', color)}>{trend}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: animDelay }}
        className="h-full"
      >
        {card}
      </motion.div>
    );
  }

  return card;
};

export default StatCard;

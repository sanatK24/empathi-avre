import React from 'react';
import { cn } from '../utils/cn';
import {
  Clock, Lock, CheckCircle, CheckCircle2,
  XCircle, AlertTriangle, RotateCcw, ShieldAlert
} from 'lucide-react';
import { TRANSACTION_STATES, TRANSACTION_HAPPY_PATH, formatTimestamp } from '../utils/trustMappings';
const ICON_MAP = {
  Clock, Lock, CheckCircle, CheckCircle2,
  XCircle, AlertTriangle, RotateCcw, ShieldAlert,
};
const TransactionTimeline = ({ status, eventLog = [] }) => {
  const currentState = TRANSACTION_STATES[status] || TRANSACTION_STATES.INITIATED;
  const isFailureState = currentState.step === -1;
  const steps = TRANSACTION_HAPPY_PATH.map((key) => {
    const state = TRANSACTION_STATES[key];
    const logEntry = eventLog.find(e =>
      e.event?.toUpperCase().includes(key) ||
      e.new_status === key
    );
    return { key, ...state, timestamp: logEntry?.timestamp || null };
  });
  const currentStep = isFailureState ? -1 : currentState.step;
  return (
    <div className="relative">
      {steps.map((step, i) => {
        const isCompleted = !isFailureState && step.step <= currentStep;
        const isCurrent = !isFailureState && step.step === currentStep;
        const isFuture = !isFailureState && step.step > currentStep;
        const isLast = i === steps.length - 1;
        const StepIcon = ICON_MAP[step.icon] || Clock;
        return (
          <div key={step.key} className="flex items-start gap-3 relative">
            {}
            {!isLast && (
              <div className={cn(
                'absolute left-[11px] top-[24px] w-0.5 h-[calc(100%-8px)]',
                isCompleted && !isCurrent ? 'bg-emerald-200' : 'bg-slate-200'
              )} />
            )}
            {}
            <div className={cn(
              'w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 z-10',
              isCompleted ? step.dotColor : 'bg-slate-200',
              isCurrent && 'ring-2 ring-offset-2 ring-primary-200'
            )}>
              <StepIcon className={cn('w-3 h-3', isCompleted ? 'text-white' : 'text-slate-400')} />
            </div>
            {}
            <div className={cn('pb-6 min-w-0', isLast && 'pb-0')}>
              <p className={cn(
                'text-xs font-bold',
                isCompleted ? 'text-slate-800' : 'text-slate-400',
                isCurrent && 'text-slate-900'
              )}>
                {step.label}
              </p>
              {step.timestamp && (
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {formatTimestamp(step.timestamp)}
                </p>
              )}
            </div>
          </div>
        );
      })}
      {}
      {isFailureState && (
        <div className="flex items-start gap-3 relative mt-1">
          <div className={cn(
            'absolute left-[11px] -top-[18px] w-0.5 h-[18px] bg-slate-200'
          )} />
          <div className={cn(
            'w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 z-10',
            currentState.dotColor
          )}>
            {(() => {
              const FailIcon = ICON_MAP[currentState.icon] || AlertTriangle;
              return <FailIcon className="w-3 h-3 text-white" />;
            })()}
          </div>
          <div>
            <p className={cn('text-xs font-bold', currentState.color)}>
              {currentState.label}
            </p>
            {eventLog.length > 0 && eventLog[eventLog.length - 1]?.timestamp && (
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {formatTimestamp(eventLog[eventLog.length - 1].timestamp)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default TransactionTimeline;

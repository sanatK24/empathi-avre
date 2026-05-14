import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import Button from './ui/Button';

function UnfollowConfirmationDialog({ userName, onConfirm, onCancel, isLoading }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2.5rem] max-w-sm w-full shadow-premium p-8 space-y-6 my-auto"
      >
        {/* Icon */}
        <div className="flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
        </div>

        {/* Message */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-display font-black text-slate-900 uppercase">
            Unfollow {userName}?
          </h3>
          <p className="text-sm text-slate-600 font-medium">
            You won't see their campaigns in your recommendations anymore.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 text-slate-700"
          >
            Keep Following
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? 'Unfollowing...' : 'Unfollow'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default UnfollowConfirmationDialog;

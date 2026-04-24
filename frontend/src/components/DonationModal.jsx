import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import Button from './ui/Button';
import PaymentModal from './PaymentModal';

function DonationModal({ campaign, onClose, onDonationSuccess }) {
  const { profile } = useAppContext();
  const [error, setError] = useState(null);
  const [amount, setAmount] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [message, setMessage] = useState('');
  const [showPayment, setShowPayment] = useState(false);

  const quickAmounts = [100, 500, 1000, 5000];

  const handleQuickAmount = (value) => {
    setAmount(value.toString());
  };

  const handleProceedToPayment = (e) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setError(null);
    setShowPayment(true);
  };

  if (showPayment) {
    return (
      <PaymentModal
        campaign={campaign}
        amount={parseFloat(amount)}
        anonymous={anonymous}
        message={message}
        onClose={() => {
          setShowPayment(false);
          onClose();
        }}
        onPaymentSuccess={() => {
          onDonationSuccess?.();
        }}
      />
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-lg shadow-xl max-w-md w-full"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Support This Campaign</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={24} />
            </button>
          </div>

          {/* Campaign Info */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-2">{campaign.title}</h3>
            <div className="flex justify-between text-sm mb-3">
              <span className="text-slate-600">Goal: ₹{campaign.goal_amount?.toFixed(0) || 0}</span>
              <span className="text-indigo-600 font-medium">
                Raised: ₹{campaign.raised_amount?.toFixed(0) || 0}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    (campaign.raised_amount / campaign.goal_amount) * 100,
                    100
                  )}%`
                }}
              />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleProceedToPayment} className="p-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Amount Section */}
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-3">
                Donation Amount
              </label>
              <div className="relative mb-4">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-lg">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {quickAmounts.map((quickAmount) => (
                  <button
                    key={quickAmount}
                    type="button"
                    onClick={() => handleQuickAmount(quickAmount)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      amount === quickAmount.toString()
                        ? 'bg-primary-600 text-white ring-2 ring-primary-300'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ₹{quickAmount}
                  </button>
                ))}
              </div>
            </div>

            {/* Anonymous Toggle */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-primary-600"
                />
                <span className="text-sm text-slate-700">Donate anonymously</span>
              </label>
            </div>

            {/* Message Section */}
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Optional Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share a message of support..."
                maxLength="500"
                rows="3"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
              <p className="text-xs text-slate-500 mt-1">
                {message.length}/500 characters
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <Button
                type="submit"
                disabled={!amount}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 flex items-center justify-center gap-2"
              >
                Continue to Payment
              </Button>
            </div>

            {/* Info Text */}
            <p className="text-xs text-slate-600 text-center">
              Next, you'll complete the payment securely.
            </p>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default DonationModal;


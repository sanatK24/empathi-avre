import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import Button from './ui/Button';

function DonationModal({ campaign, onClose, onDonationSuccess }) {
  const { profile } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [amount, setAmount] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [message, setMessage] = useState('');

  const quickAmounts = [100, 500, 1000, 5000];

  const handleQuickAmount = (value) => {
    setAmount(value.toString());
  };

  const handleDonate = async (e) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const donationData = {
        amount: parseFloat(amount),
        anonymous,
        message: message || null
      };

      await apiService.createDonation(profile.accessToken, campaign.id, donationData);

      setSuccess(true);
      setTimeout(() => {
        onDonationSuccess?.();
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Donation failed:', err);
      setError(err.message || 'Failed to process donation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center mb-4"
            >
              <CheckCircle size={64} className="text-green-500" />
            </motion.div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Thank You!</h3>
            <p className="text-slate-600 mb-4">
              Your donation of ₹{parseFloat(amount).toFixed(2)} has been received
            </p>
            <p className="text-sm text-slate-500">
              Your contribution helps support {campaign.title}
            </p>
          </motion.div>
        </motion.div>
      </AnimatePresence>
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
                className="bg-indigo-600 h-full rounded-full transition-all"
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
          <form onSubmit={handleDonate} className="p-6 space-y-6">
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
                  className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
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
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600"
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
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
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
                disabled={loading || !amount}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Donate ₹${parseFloat(amount) || 0}`
                )}
              </Button>
            </div>

            {/* Info Text */}
            <p className="text-xs text-slate-600 text-center">
              Your donation will be processed immediately and will help support this campaign.
            </p>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default DonationModal;

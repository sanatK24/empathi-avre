import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import Button from './ui/Button';

function PaymentModal({ campaign, amount, anonymous, message, onClose, onPaymentSuccess }) {
  const { profile } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [transactionId, setTransactionId] = useState(null);
  const [step, setStep] = useState('method'); // method, details, processing, success

  const [paymentDetails, setPaymentDetails] = useState({
    upi_id: '',
    card_number: '',
    expiry: '',
    cvv: '',
    phone: '',
    account_number: '',
    full_name: profile?.name || '',
    email: profile?.email || ''
  });

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const methods = await apiService.getPaymentMethods(profile?.accessToken);
      setPaymentMethods(methods.methods || []);
      if (methods.methods?.length > 0) {
        setSelectedMethod(methods.methods[0].id);
      }
    } catch (err) {
      console.error('Failed to load payment methods:', err);
    }
  };

  const validatePaymentDetails = () => {
    switch (selectedMethod) {
      case 'upi':
        return paymentDetails.upi_id.match(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/) ? true : 'Invalid UPI ID (format: user@bank)';
      case 'card':
        if (!paymentDetails.card_number.replace(/\s/g, '').match(/^\d{16}$/)) return 'Invalid card number';
        if (!paymentDetails.expiry.match(/^\d{2}\/\d{2}$/)) return 'Invalid expiry (MM/YY)';
        if (!paymentDetails.cvv.match(/^\d{3,4}$/)) return 'Invalid CVV';
        return true;
      case 'wallet':
        return paymentDetails.phone.match(/^\d{10}$/) ? true : 'Invalid phone number';
      case 'bank':
        return paymentDetails.account_number.match(/^\d{10,}$/) ? true : 'Invalid account number';
      default:
        return true;
    }
  };

  const handleProcessPayment = async () => {
    const validation = validatePaymentDetails();
    if (validation !== true) {
      setError(validation);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setStep('processing');

      const paymentData = {
        campaign_id: campaign.id,
        amount: amount,
        payment_method: selectedMethod,
        anonymous: anonymous,
        message: message,
        donor_details: {
          full_name: paymentDetails.full_name,
          email: paymentDetails.email,
          phone: paymentDetails.phone
        }
      };

      const response = await apiService.processPayment(profile.accessToken, paymentData);

      if (response.status === 'success') {
        setTransactionId(response.transaction_id);
        setStep('success');
        setSuccess(true);

        setTimeout(() => {
          onPaymentSuccess?.();
          onClose();
        }, 3000);
      } else {
        setError(response.error || 'Payment processing failed');
        setStep('details');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment processing failed. Please try again.');
      setStep('details');
    } finally {
      setLoading(false);
    }
  };

  const getMethodIcon = (methodId) => {
    const icons = {
      upi: '💳',
      card: '🏧',
      wallet: '📱',
      bank: '🏦'
    };
    return icons[methodId] || '💰';
  };

  const formatCardNumber = (value) => {
    return value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
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
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h3>
            <p className="text-slate-600 mb-4">
              Your donation of ₹{amount.toFixed(2)} to "{campaign.title}" has been received
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Transaction ID: <span className="font-mono">{transactionId}</span>
            </p>
            <p className="text-sm text-slate-600">
              Thank you for your generosity! A confirmation has been sent to your email.
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
            <h2 className="text-xl font-bold text-slate-900">Complete Payment</h2>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
            >
              <X size={24} />
            </button>
          </div>

          {/* Campaign Summary */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-slate-900 text-sm">{campaign.title}</span>
              <span className="text-lg font-bold text-indigo-600">₹{amount.toFixed(2)}</span>
            </div>
            <p className="text-xs text-slate-600">Amount to be charged</p>
          </div>

          {/* Error Message */}
          {error && step !== 'processing' && (
            <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <div className="p-6">
            {step === 'method' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 mb-4">Select Payment Method</h3>
                <div className="space-y-2">
                  {paymentMethods.map((method) => (
                    <motion.button
                      key={method.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => {
                        setSelectedMethod(method.id);
                        setStep('details');
                      }}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        selectedMethod === method.id
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{method.icon}</span>
                        <div>
                          <p className="font-semibold text-slate-900">{method.name}</p>
                          <p className="text-xs text-slate-600">{method.description}</p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {step === 'details' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 mb-4">
                  {paymentMethods.find(m => m.id === selectedMethod)?.name}
                </h3>

                {selectedMethod === 'upi' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      UPI ID (e.g., yourname@bank)
                    </label>
                    <input
                      type="text"
                      value={paymentDetails.upi_id}
                      onChange={(e) => setPaymentDetails({ ...paymentDetails, upi_id: e.target.value })}
                      placeholder="name@upi"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {selectedMethod === 'card' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Card Number
                      </label>
                      <input
                        type="text"
                        value={formatCardNumber(paymentDetails.card_number)}
                        onChange={(e) =>
                          setPaymentDetails({
                            ...paymentDetails,
                            card_number: e.target.value.replace(/\s/g, '')
                          })
                        }
                        placeholder="1234 5678 9012 3456"
                        maxLength="19"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          Expiry (MM/YY)
                        </label>
                        <input
                          type="text"
                          value={paymentDetails.expiry}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '');
                            if (val.length >= 2) {
                              val = val.slice(0, 2) + '/' + val.slice(2, 4);
                            }
                            setPaymentDetails({ ...paymentDetails, expiry: val });
                          }}
                          placeholder="MM/YY"
                          maxLength="5"
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">
                          CVV
                        </label>
                        <input
                          type="password"
                          value={paymentDetails.cvv}
                          onChange={(e) =>
                            setPaymentDetails({
                              ...paymentDetails,
                              cvv: e.target.value.replace(/\D/g, '').slice(0, 4)
                            })
                          }
                          placeholder="123"
                          maxLength="4"
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                {selectedMethod === 'wallet' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={paymentDetails.phone}
                      onChange={(e) =>
                        setPaymentDetails({
                          ...paymentDetails,
                          phone: e.target.value.replace(/\D/g, '').slice(0, 10)
                        })
                      }
                      placeholder="10-digit phone"
                      maxLength="10"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {selectedMethod === 'bank' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Bank Account Number
                    </label>
                    <input
                      type="text"
                      value={paymentDetails.account_number}
                      onChange={(e) =>
                        setPaymentDetails({
                          ...paymentDetails,
                          account_number: e.target.value.replace(/\D/g, '')
                        })
                      }
                      placeholder="Account number"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => setStep('method')}
                    disabled={loading}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Back
                  </button>
                  <Button
                    onClick={handleProcessPayment}
                    disabled={loading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <DollarSign size={18} />
                        Pay ₹{amount.toFixed(2)}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === 'processing' && (
              <div className="text-center py-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mb-4 flex justify-center"
                >
                  <Loader2 size={48} className="text-indigo-600" />
                </motion.div>
                <p className="font-semibold text-slate-900 mb-2">Processing Payment...</p>
                <p className="text-sm text-slate-600">Please wait while we process your donation</p>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
            <p className="text-xs text-slate-600">
              This is a simulated payment for demonstration. No actual payment will be processed.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default PaymentModal;

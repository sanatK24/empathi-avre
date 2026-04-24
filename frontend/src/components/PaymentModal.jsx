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
  const [processingStage, setProcessingStage] = useState(0);

  const stages = [
    "Initializing secure connection...",
    "Contacting payment gateway...",
    "Verifying payment credentials...",
    "Securing funds transfer...",
    "Finalizing donation records..."
  ];

  const [paymentDetails, setPaymentDetails] = useState({
    upi_id: '',
    card_number: '',
    expiry: '',
    cvv: '',
    phone: '',
    account_number: '',
    full_name: profile?.fullName || '',
    email: profile?.email || ''
  });

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    const methods = [
      { id: 'upi', name: 'UPI', icon: '💳', description: 'GPay, PhonePe, Paytm' },
      { id: 'card', name: 'Credit/Debit Card', icon: '🏧', description: 'Visa, Mastercard, RuPay' },
      { id: 'wallet', name: 'Mobile Wallet', icon: '📱', description: 'Airtel Money, JioMoney' },
      { id: 'bank', name: 'Net Banking', icon: '🏦', description: 'All major Indian banks' }
    ];
    setPaymentMethods(methods);
    setSelectedMethod('upi');
  };

  const fillDummyDetails = () => {
    switch (selectedMethod) {
      case 'upi':
        setPaymentDetails({ ...paymentDetails, upi_id: 'empathi.user@okaxis' });
        break;
      case 'card':
        setPaymentDetails({ 
          ...paymentDetails, 
          card_number: '4242 4242 4242 4242', 
          expiry: '12/28', 
          cvv: '123' 
        });
        break;
      case 'wallet':
        setPaymentDetails({ ...paymentDetails, phone: '9876543210' });
        break;
      case 'bank':
        setPaymentDetails({ ...paymentDetails, account_number: '123456789012' });
        break;
    }
  };

  const validatePaymentDetails = () => {
    switch (selectedMethod) {
      case 'upi':
        return paymentDetails.upi_id.includes('@') ? true : 'Invalid UPI ID';
      case 'card':
        if (paymentDetails.card_number.replace(/\s/g, '').length < 16) return 'Invalid card number';
        if (!paymentDetails.expiry.includes('/')) return 'Invalid expiry';
        if (paymentDetails.cvv.length < 3) return 'Invalid CVV';
        return true;
      case 'wallet':
        return paymentDetails.phone.length === 10 ? true : 'Invalid phone number';
      case 'bank':
        return paymentDetails.account_number.length >= 10 ? true : 'Invalid account number';
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
      
      // Multi-stage simulation
      for (let i = 0; i < stages.length; i++) {
        setProcessingStage(i);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Use the real donation endpoint
      const response = await apiService.donateToCampaign(
        profile.accessToken, 
        campaign.id, 
        amount, 
        anonymous
      );

      if (response) {
        setTransactionId(`TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`);
        setStep('success');
        setSuccess(true);

        setTimeout(() => {
          onPaymentSuccess?.();
          onClose();
        }, 5000);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
      setStep('details');
    } finally {
      setLoading(false);
    }
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
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-premium p-10 max-w-md w-full text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 12 }}
              className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle size={40} className="text-green-600" />
            </motion.div>
            
            <h3 className="text-3xl font-display font-black text-slate-900 mb-2 uppercase tracking-tight">Success!</h3>
            <p className="text-slate-500 font-medium mb-6">
              Your contribution of <span className="text-slate-900 font-bold">₹{amount.toLocaleString()}</span> to "{campaign.title}" has been registered.
            </p>
            
            <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
              <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                <span>Receipt No.</span>
                <span>Date</span>
              </div>
              <div className="flex justify-between text-sm font-mono font-bold text-slate-700">
                <span>{transactionId}</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 font-medium italic">
              Your donation has been added to your profile. Redirecting to dashboard...
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
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-premium max-w-md w-full overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xl font-display font-black text-slate-900 uppercase tracking-tight">Secure Checkout</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          {/* Amount Summary */}
          <div className="bg-primary-50 p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-1">Total Donation</p>
              <h3 className="text-3xl font-display font-black text-primary-900">₹{amount.toLocaleString()}</h3>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-500 mb-1">Campaign</p>
              <p className="text-sm font-bold text-slate-900 line-clamp-1">{campaign.title}</p>
            </div>
          </div>

          <div className="p-8">
            {step === 'method' && (
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Choose Method</h3>
                <div className="grid grid-cols-1 gap-3">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => {
                        setSelectedMethod(method.id);
                        setStep('details');
                      }}
                      className="group flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-primary-500 hover:bg-primary-50 transition-all text-left"
                    >
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-2xl group-hover:bg-white transition-colors">
                        {method.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 text-sm">{method.name}</p>
                        <p className="text-[10px] font-medium text-slate-500">{method.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 'details' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Enter {paymentMethods.find(m => m.id === selectedMethod)?.name} Details
                  </h3>
                  <button 
                    onClick={fillDummyDetails}
                    className="text-[10px] font-black text-primary-600 uppercase tracking-widest hover:underline"
                  >
                    Use Dummy Data
                  </button>
                </div>

                <div className="space-y-4">
                  {selectedMethod === 'upi' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">UPI ID</label>
                      <input
                        type="text"
                        value={paymentDetails.upi_id}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, upi_id: e.target.value })}
                        placeholder="username@bank"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500 font-medium"
                      />
                    </div>
                  )}

                  {selectedMethod === 'card' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Card Number</label>
                        <input
                          type="text"
                          value={formatCardNumber(paymentDetails.card_number)}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, card_number: e.target.value.replace(/\s/g, '') })}
                          placeholder="0000 0000 0000 0000"
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500 font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expiry</label>
                          <input
                            type="text"
                            value={paymentDetails.expiry}
                            onChange={(e) => setPaymentDetails({ ...paymentDetails, expiry: e.target.value })}
                            placeholder="MM/YY"
                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CVV</label>
                          <input
                            type="password"
                            value={paymentDetails.cvv}
                            onChange={(e) => setPaymentDetails({ ...paymentDetails, cvv: e.target.value })}
                            placeholder="***"
                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedMethod === 'wallet' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                      <input
                        type="tel"
                        value={paymentDetails.phone}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, phone: e.target.value })}
                        placeholder="10-digit mobile number"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  )}

                  {selectedMethod === 'bank' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Number</label>
                      <input
                        type="text"
                        value={paymentDetails.account_number}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, account_number: e.target.value })}
                        placeholder="Enter bank account number"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
                    <AlertCircle size={14} /> {error}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setStep('method')}
                    className="flex-1 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                  >
                    Change Method
                  </button>
                  <Button
                    onClick={handleProcessPayment}
                    className="flex-[2] bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl shadow-lg font-black text-xs uppercase tracking-widest"
                  >
                    Complete Payment
                  </Button>
                </div>
              </div>
            )}

            {step === 'processing' && (
              <div className="text-center py-10 space-y-6">
                <div className="relative w-20 h-20 mx-auto">
                   <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                   <motion.div 
                     className="absolute inset-0 border-4 border-primary-500 rounded-full border-t-transparent"
                     animate={{ rotate: 360 }}
                     transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                   />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-display font-black text-slate-900 uppercase tracking-tight">Processing</h3>
                  <p className="text-xs font-bold text-primary-600 uppercase tracking-widest animate-pulse">
                    {stages[processingStage]}
                  </p>
                </div>
                <div className="flex justify-center gap-1">
                  {stages.map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1 rounded-full transition-all duration-300 ${
                        i <= processingStage ? 'w-6 bg-primary-500' : 'w-2 bg-slate-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50 text-center border-t border-slate-100">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
               <span className="text-primary-500">🛡️</span> Secure 256-bit SSL encrypted transaction
             </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default PaymentModal;

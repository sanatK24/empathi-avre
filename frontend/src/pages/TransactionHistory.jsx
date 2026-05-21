import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ReceiptText,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Play,
  AlertCircle,
  ArrowLeft,
  Heart,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import TransactionTimeline from '../components/TransactionTimeline';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { getTransactionState, SIMULATION_SCENARIOS, formatTimestamp } from '../utils/trustMappings';
import { formatCurrency } from '../utils/formatNumber';

const TransactionHistory = () => {
  const { profile, statsRefreshTrigger } = useAppContext();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [simulating, setSimulating] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadTransactions = async () => {
    if (!profile.accessToken) return;
    try {
      setLoading(true);
      setError(null);
      
      // Fetch both resource transactions and donations
      const [resourceTxns, donationsTxns] = await Promise.all([
        apiService.getTransactions(profile.accessToken).catch(() => []),
        apiService.getDonationHistory(profile.accessToken).catch(() => [])
      ]);
      
      // Convert donations to transaction format for unified display
      const donationTransactions = (donationsTxns || []).map(donation => ({
        id: `donation_${donation.id}`,
        type: 'donation',
        resource_name: `Donated to ${donation.campaign_title}`,
        campaign_title: donation.campaign_title,
        amount: donation.amount,
        created_at: donation.created_at,
        status: 'COMPLETED',
        vendor_name: 'Campaign'
      }));
      
      // Combine and sort by date (newest first)
      const combined = [...(Array.isArray(resourceTxns) ? resourceTxns : []), ...donationTransactions]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setTransactions(combined);
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [profile.accessToken, statsRefreshTrigger]);

  const handleSimulate = async (txnId, scenario) => {
    setSimulating(txnId);
    try {
      await apiService.simulateTransaction(profile.accessToken, txnId, scenario);
      await loadTransactions();
      setExpandedId(txnId);
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setSimulating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/user/dashboard')}
          className="flex items-center text-sm font-bold text-slate-400 hover:text-primary-500 mb-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight uppercase">
              Transaction History
            </h1>
            <p className="text-slate-500 font-medium">
              Track escrow status, fulfillment, and delivery outcomes.
            </p>
          </div>
          <Badge variant="secondary" className="px-4 py-1.5 text-sm self-start">
            {transactions.length} Transaction{transactions.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Transaction list */}
      <div className="space-y-4">
        {(() => {
          const startIdx = (currentPage - 1) * itemsPerPage;
          const endIdx = startIdx + itemsPerPage;
          const paginatedTransactions = transactions.slice(startIdx, endIdx);
          const totalPages = Math.ceil(transactions.length / itemsPerPage);

          return (
            <>
              {paginatedTransactions.map((txn, i) => {
                const state = getTransactionState(txn.status);
                const isExpanded = expandedId === txn.id;
                const canSimulate = txn.status === 'INITIATED' || txn.status === 'ESCROW_HELD';

            return (
              <motion.div
                key={txn.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
              <Card className="border-none ring-1 ring-slate-100 shadow-soft overflow-hidden">
                <CardContent className="p-0">
                  {/* Summary row */}
                  <div
                    className="p-6 flex flex-col md:flex-row md:items-center gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : txn.id)}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${txn.type === 'donation' ? 'bg-rose-50' : 'bg-slate-50'}`}>
                      {txn.type === 'donation' ? (
                        <Heart className="w-5 h-5 text-rose-500" />
                      ) : (
                        <ReceiptText className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">
                          {txn.resource_name || `Transaction #${String(txn.id).slice(-6)}`}
                        </h3>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {txn.vendor_name || 'Vendor'} · {formatTimestamp(txn.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {txn.amount != null && (
                        <span className="text-sm font-black text-slate-700">
                          {formatCurrency(txn.amount)}
                        </span>
                      )}
                      <Badge
                        variant="secondary"
                        className={`${state.color} ${state.bg} border-0 text-[10px] font-black`}
                      >
                        {state.label}
                      </Badge>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-slate-400" />
                        : <ChevronDown className="w-4 h-4 text-slate-400" />
                      }
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-slate-100"
                    >
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* For donations - show simple info */}
                        {txn.type === 'donation' ? (
                          <>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                                Donation Details
                              </p>
                              <div className="space-y-3">
                                <div>
                                  <p className="text-[10px] text-slate-400 font-bold mb-1">Campaign</p>
                                  <p className="text-sm font-semibold text-slate-900">{txn.campaign_title}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-400 font-bold mb-1">Amount Donated</p>
                                  <p className="text-lg font-black text-slate-900">{formatCurrency(txn.amount)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-400 font-bold mb-1">Date</p>
                                  <p className="text-sm font-semibold text-slate-700">{formatTimestamp(txn.created_at)}</p>
                                </div>
                              </div>
                            </div>
                            <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-6 border border-rose-100 flex flex-col justify-between">
                              <div>
                                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2">Impact Badge</p>
                                <p className="text-sm font-semibold text-rose-900 mb-4">Your contribution makes a real difference</p>
                              </div>
                              <div className="text-3xl">❤️</div>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Timeline for resource transactions */}
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                                Status Progression
                              </p>
                              <TransactionTimeline
                                status={txn.status}
                                eventLog={txn.event_log || []}
                              />
                            </div>

                            {/* Details + Actions */}
                            <div className="space-y-6">
                              {/* Event log */}
                              {txn.event_log && txn.event_log.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                    Event Log
                                  </p>
                                  <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {txn.event_log.map((evt, j) => (
                                      <div key={j} className="flex items-start gap-3 text-xs">
                                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap min-w-[90px]">
                                          {formatTimestamp(evt.timestamp)}
                                        </span>
                                        <span className="text-slate-600 font-medium">
                                          {evt.event || evt.description || evt.new_status || 'Event'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Trust implications */}
                              {txn.trust_score != null && (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Trust Impact
                                  </p>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <p className="text-[10px] text-slate-400 font-bold">Trust Score</p>
                                      <p className="text-sm font-black text-slate-800">{(txn.trust_score * 100).toFixed(0)}%</p>
                                    </div>
                                    {txn.fulfillment_score != null && (
                                      <div>
                                        <p className="text-[10px] text-slate-400 font-bold">Fulfillment</p>
                                        <p className="text-sm font-black text-slate-800">{(txn.fulfillment_score * 100).toFixed(0)}%</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Simulation controls */}
                              {canSimulate && (
                                <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                    Run Scenario
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {Object.entries(SIMULATION_SCENARIOS).map(([key, cfg]) => (
                                      <Button
                                        key={key}
                                        variant="secondary"
                                        className="text-[10px] py-1.5 px-3 shadow-none border-slate-200"
                                        disabled={simulating === txn.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSimulate(txn.id, key);
                                        }}
                                      >
                                        <Play className="w-3 h-3 mr-1.5" />
                                        {simulating === txn.id ? 'Running...' : cfg.label}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-8 pt-8 border-t border-slate-100">
                  <div className="text-sm text-slate-500 font-medium">
                    Showing <span className="font-black text-slate-700">{startIdx + 1}</span> to <span className="font-black text-slate-700">{Math.min(endIdx, transactions.length)}</span> of <span className="font-black text-slate-700">{transactions.length}</span> transactions
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-lg font-bold text-xs transition-all ${
                            currentPage === page
                              ? 'bg-primary-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {transactions.length === 0 && !error && (
          <div className="py-24 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
              <ReceiptText className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No transactions yet</h3>
            <p className="text-slate-500 max-w-xs mx-auto">
              Transactions will appear here after you accept a vendor for a request or make a donation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;

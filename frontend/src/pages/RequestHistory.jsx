import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  ChevronRight, 
  Calendar,
  Package,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { getTransactionState } from '../utils/trustMappings';

const RequestHistory = () => {
  const { profile } = useAppContext();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadHistory = async () => {
      if (!profile.accessToken) return;
      try {
        setLoading(true);
        const data = await apiService.getRequestHistory(profile.accessToken);
        setHistory(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load request history:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, [profile.accessToken]);

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'fulfilled' || s === 'completed' || s === 'matched') return <Badge variant="success">{status}</Badge>;
    if (s === 'in_transit' || s === 'in transit' || s === 'pending') return <Badge variant="primary">{status}</Badge>;
    if (s === 'cancelled' || s === 'failed') return <Badge variant="danger">{status}</Badge>;
    return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
  };

  const getUrgencyBadge = (urgency) => {
    const u = (urgency || '').toLowerCase();
    if (u === 'critical') return <Badge variant="danger">{urgency}</Badge>;
    if (u === 'high') return <Badge variant="warning">{urgency}</Badge>;
    return <Badge variant="primary">{urgency || 'Normal'}</Badge>;
  };

  const getTransactionBadge = (item) => {
    const txStatus = item.transaction_status;
    if (!txStatus) return null;
    const state = getTransactionState(txStatus);
    return (
      <Badge variant="secondary" className={`${state.color} ${state.bg} border-0 text-[9px]`}>
        {state.label}
      </Badge>
    );
  };

  const filteredHistory = searchQuery
    ? history.filter(item => {
        const name = (item.resource_name || item.name || '').toLowerCase();
        return name.includes(searchQuery.toLowerCase());
      })
    : history;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight">Request History</h1>
          <p className="text-slate-500 font-medium">Track and manage all your past resource requests.</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    placeholder="Search history..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                />
            </div>
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

      <div className="space-y-4">
        {filteredHistory.map((item, i) => (
          <motion.div
            key={item.id || i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="hover:shadow-premium transition-all cursor-pointer group">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row items-center p-6 gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-500 transition-colors">
                    <Package className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-grow flex flex-col md:flex-row md:items-center gap-6 md:gap-12">
                    <div className="w-48">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        REQ-{String(item.id).slice(-4).toUpperCase()}
                      </p>
                      <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">
                        {item.resource_name || item.name || 'Resource Request'}
                      </h4>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                       <Calendar className="w-4 h-4 text-slate-300" />
                       <span className="text-sm font-semibold text-slate-500">
                         {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                       </span>
                    </div>

                    <div className="flex-grow">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Location</p>
                        <p className="text-sm font-bold text-slate-700">{item.city || item.location || 'N/A'}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden lg:block text-right pr-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Priority</p>
                            {getUrgencyBadge(item.urgency_level || item.urgency)}
                        </div>
                        {getStatusBadge(item.status)}
                        {getTransactionBadge(item)}
                    </div>
                  </div>

                  <div className="text-slate-300 group-hover:text-primary-500 transition-colors">
                     <ChevronRight className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {filteredHistory.length === 0 && !error && (
          <div className="py-24 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
              <Package className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No requests yet</h3>
            <p className="text-slate-500 max-w-xs mx-auto">Your resource requests will appear here after you create them.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestHistory;

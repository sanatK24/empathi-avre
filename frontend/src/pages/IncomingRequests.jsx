import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Inbox, 
  MapPin, 
  Clock, 
  Check, 
  X, 
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';

const IncomingRequests = () => {
  const { profile } = useAppContext();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
    if (!profile.accessToken) return;
    try {
      const data = await apiService.getVendorMatches(profile.accessToken);
      setRequests(data);
    } catch (error) {
      console.error("Failed to load requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [profile.accessToken]);

  const handleAccept = async (matchId) => {
    try {
      await apiService.vendorAcceptMatch(profile.accessToken, matchId);
      // Refresh list
      loadRequests();
    } catch (error) {
      console.error("Failed to accept request:", error);
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight">Incoming Requests</h1>
          <p className="text-slate-500 font-medium">Manage pending requests from organizations looking for your resources.</p>
        </div>
        <Badge variant={requests.length > 0 ? 'primary' : 'secondary'} className="px-4 py-1.5 text-sm">
            {requests.length} Requests Pending
        </Badge>
      </div>

      <div className="grid gap-6">
        {requests.map((req, i) => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="hover:ring-2 hover:ring-primary-500/20 transition-all border-none ring-1 ring-slate-100 shadow-soft">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row md:items-stretch h-full">
                  {/* Left Side: Score Indicator */}
                  <div className="w-full md:w-32 bg-slate-50 flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Match Score</p>
                    <div className="text-3xl font-display font-black text-primary-500">{req.score}%</div>
                    <Badge variant="primary" className="mt-2 text-[10px]">Rank #1</Badge>
                  </div>

                  <div className="flex-grow p-8">
                     <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-xl font-display font-black text-slate-900 tracking-tight uppercase">{req.resource_name}</h3>
                                <Badge variant={req.urgency === 'high' || req.urgency === 'critical' ? 'danger' : 'warning'}>{req.urgency}</Badge>
                            </div>
                            <p className="text-slate-500 font-medium text-sm flex items-center">
                                Requested at <span className="text-slate-900 font-bold ml-1.5 uppercase tracking-wide">{req.location}</span>
                            </p>
                        </div>
                        <div className="text-right">
                           <p className="text-sm font-bold text-slate-900">{req.quantity} units</p>
                           <p className="text-xs text-slate-400 font-medium">
                              {req.created_at ? new Date(req.created_at).toLocaleDateString() : 'N/A'}
                           </p>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-8">
                        <div className="flex items-center space-x-3">
                           <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                              <MapPin className="w-4 h-4" />
                           </div>
                           <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Region</p>
                              <p className="text-sm font-black text-slate-700">{req.location}</p>
                           </div>
                        </div>
                        <div className="flex items-center space-x-3">
                           <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                               <Clock className="w-4 h-4" />
                           </div>
                           <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time Received</p>
                              <p className="text-sm font-black text-slate-700">
                                {req.created_at ? new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                              </p>
                           </div>
                        </div>
                        <div className="hidden md:flex items-center space-x-3">
                           <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                              <TrendingUp className="w-4 h-4" />
                           </div>
                           <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Market Relevance</p>
                              <p className="text-sm font-black text-slate-700">{req.score}% Match</p>
                           </div>
                        </div>
                     </div>

                     <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                        <Button 
                          className="flex-1 md:flex-none px-10"
                          onClick={() => handleAccept(req.match_id)}
                          disabled={req.status !== 'pending'}
                        >
                           <Check className="w-5 h-5 mr-2" /> {req.status === 'pending' ? 'Accept Request' : (req.status.replace(/_/g, ' '))}
                        </Button>
                        <Button variant="secondary" className="flex-1 md:flex-none shadow-none text-rose-500 hover:text-rose-600 hover:bg-rose-50 border-slate-200">
                           <X className="w-5 h-5 mr-2" /> Reject
                        </Button>
                        <div className="flex-grow"></div>
                        <Button variant="ghost" className="hidden md:flex text-slate-400 hover:text-primary-500 font-bold">
                           View Full Details <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                     </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {requests.length === 0 && (
          <div className="py-24 text-center bg-white rounded-3xl border border-dashed border-slate-200">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                <Inbox className="w-10 h-10" />
             </div>
             <h3 className="text-xl font-bold text-slate-900 mb-2">In-box is empty</h3>
             <p className="text-slate-500 max-w-xs mx-auto">New requests from EmpathI will appear here in real-time.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncomingRequests;

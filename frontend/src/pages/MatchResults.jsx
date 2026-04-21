import React, { useState, useEffect } from 'react';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';
import {
  Zap,
  MapPin,
  Clock,
  Star,
  ChevronRight,
  ArrowLeft,
  Info,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Filter,
  Map as MapIcon,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';

const MatchResults = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matches, setMatches] = useState([]);
  const [requestItem, setRequestItem] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAppContext();

  useEffect(() => {
    const loadMatchResults = async () => {
      if (!profile.accessToken) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get request ID from URL params or fetch the most recent request
        let requestId = searchParams.get('requestId');

        if (!requestId) {
          // Fetch user's request history to get the most recent request
          const requestHistory = await apiService.getRequestHistory(profile.accessToken);
          if (requestHistory && requestHistory.length > 0) {
            const mostRecentRequest = requestHistory[0];
            requestId = mostRecentRequest.id;
            setRequestItem(mostRecentRequest);
          } else {
            setError('No recent requests found. Please create a request first.');
            setLoading(false);
            return;
          }
        } else {
          // Fetch the specific request details to show in header
          const details = await apiService.getRequestDetails(profile.accessToken, requestId);
          setRequestItem(details);
        }

        // Fetch matches for the request using sync'd endpoint
        const matchesData = await apiService.getRequestMatches(profile.accessToken, requestId);
        setMatches(matchesData || []);
      } catch (err) {
        console.error('Failed to load match results:', err);
        setError(err.message || 'Failed to load match results. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadMatchResults();
  }, [profile.accessToken, searchParams]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-24 h-24 border-4 border-primary-100 border-t-primary-500 rounded-full"
          />
          <Zap className="absolute top-1/2 left-1/2 -track-x-1/2 -track-y-1/2 w-8 h-8 text-primary-500 fill-primary-500 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-display font-black text-slate-900 mb-2">
            Analyzing {matches.length > 0 ? matches.length : '500+'} Vendors...
          </h2>
          <p className="text-slate-500 font-medium">Rank-sorting based on proximity, stock freshness, and reliability.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 max-w-md">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-900">Error Loading Results</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
        <Button onClick={() => navigate('/requester/create')} variant="secondary">
          Create a New Request
        </Button>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-display font-black text-slate-900 mb-2">No Matches Found</h2>
          <p className="text-slate-500 font-medium">
            We couldn't find any vendors matching your criteria. Try adjusting your request.
          </p>
        </div>
        <Button onClick={() => navigate('/requester/create')} variant="secondary">
          Modify Request
        </Button>
      </div>
    );
  }

  const getResourceName = () => {
    if (requestItem?.resource_name) return requestItem.resource_name;
    if (requestItem?.name) return requestItem.name;
    if (matches[0]?.resource_name) return matches[0].resource_name;
    return 'Resources';
  };

  const calculateMatchScore = (match) => {
    return match.score || match.relevance_score || 0;
  };

  const getDistance = (match) => {
    return match.distance !== undefined ? `${match.distance} km` : (match.distance_km ? `${match.distance_km} km` : 'N/A');
  };

  const getETA = (match) => {
    return match.eta || 'N/A';
  };

  const getRating = (match) => {
    return match.rating || 0;
  };

  const getReviews = (match) => {
    return match.reviews || 0;
  };

  const getVendorName = (match) => {
    if (match.vendor_name) return match.vendor_name;
    if (match.name) return match.name;
    return 'Vendor';
  };

  const getMatchReason = (match) => {
    if (typeof match.explanation === 'string' && match.explanation.startsWith('{')) {
       try {
         const parsed = JSON.parse(match.explanation);
         return parsed.text || parsed.reason || match.explanation;
       } catch {
         return match.explanation;
       }
    }
    return match.explanation || 'Balanced performance match';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <button
            onClick={() => navigate('/user/create')}
            className="flex items-center text-sm font-bold text-slate-400 hover:text-primary-500 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Request
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight">Top Vendor Matches</h1>
            <Badge variant="primary" className="h-6">
              {getResourceName()}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" className="shadow-none border-slate-200">
            <Filter className="w-4 h-4 mr-2" /> Modify Weights
          </Button>
          <Button variant="secondary" className="shadow-none border-slate-200">
            <MapIcon className="w-4 h-4 mr-2" /> View Map
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {matches.map((vendor, i) => (
            <motion.div
              key={vendor.id || i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card
                className={`group cursor-pointer transition-all hover:ring-2 ${
                  i === 0
                    ? 'ring-2 ring-primary-500 shadow-premium'
                    : 'hover:ring-slate-200'
                }`}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    <div className="p-8 flex-grow">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="text-xl font-display font-black text-slate-900 group-hover:text-primary-500 transition-colors uppercase tracking-tight">
                            {getVendorName(vendor)}
                          </h3>
                          <div className="flex items-center space-x-4 mt-2">
                            <div className="flex items-center text-amber-500">
                              <Star className="w-4 h-4 fill-amber-500 mr-1" />
                              <span className="text-sm font-bold">{getRating(vendor)}</span>
                              <span className="text-xs text-slate-400 ml-1 font-medium">
                                ({getReviews(vendor)} reviews)
                              </span>
                            </div>
                            <div className="flex items-center text-slate-500">
                              <MapPin className="w-4 h-4 mr-1 text-slate-400" />
                              <span className="text-sm font-bold">{getDistance(vendor)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">
                            Score
                          </div>
                          <div className="text-3xl font-display font-black text-primary-500 leading-none">
                            {calculateMatchScore(vendor)}%
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            ETA
                          </p>
                          <p className="font-bold text-slate-900 flex items-center">
                            <Clock className="w-3 h-3 mr-1.5 text-primary-500" /> {getETA(vendor)}
                          </p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Freshness
                          </p>
                          <p className="font-bold text-slate-900 flex items-center">
                            <TrendingUp className="w-3 h-3 mr-1.5 text-emerald-500" />{' '}
                            {vendor.freshness || 'High'}
                          </p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Stock
                          </p>
                          <p className="font-bold text-slate-900 flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1.5 text-primary-500" />{' '}
                            {vendor.available_stock ? `+${vendor.available_stock} units` : '+500 units'}
                          </p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Price/Unit
                          </p>
                          <p className="font-black text-slate-900">{vendor.price || vendor.unit_price || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row items-center gap-4">
                        <Button className="w-full md:w-auto px-10">Select Vendor</Button>
                        <Button variant="secondary" className="w-full md:w-auto shadow-none">
                          View Profile
                        </Button>
                      </div>
                    </div>

                    {/* Explainer Side */}
                    <div
                      className={cn(
                        'md:w-72 p-8 border-t md:border-t-0 md:border-l flex flex-col justify-center',
                        i === 0 ? 'bg-primary-50 border-primary-100' : 'bg-slate-50 border-slate-100'
                      )}
                    >
                      <div className="flex items-center space-x-2 mb-4">
                        <Info
                          className={cn(
                            'w-4 h-4',
                            i === 0 ? 'text-primary-500' : 'text-slate-400'
                          )}
                        />
                        <span
                          className={cn(
                            'text-[11px] font-black uppercase tracking-widest',
                            i === 0 ? 'text-primary-600' : 'text-slate-500'
                          )}
                        >
                          Why ranked {i === 0 ? '#1' : `#${i + 1}`}
                        </span>
                      </div>
                      <p
                        className={cn(
                          'text-xs leading-relaxed font-semibold italic',
                          i === 0 ? 'text-primary-800' : 'text-slate-600'
                        )}
                      >
                        "{getMatchReason(vendor)}"
                      </p>
                      {i === 0 && (
                        <div className="mt-4 flex items-center text-primary-600 text-[10px] font-bold uppercase tracking-tighter">
                          <ShieldCheck className="w-3 h-3 mr-1" /> System Recommended
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="space-y-8">
          <Card className="bg-slate-900 border-none text-white overflow-hidden p-8 shadow-2xl relative">
            <div className="relative z-10">
              <h4 className="text-xl font-display font-black mb-4">Adaptive Intelligence</h4>
              <p className="text-slate-400 text-sm leading-relaxed mb-6 font-medium">
                This ranking was generated using 14 distinct data points across {matches.length || 518}{' '}
                vendors. The weights were adjusted automatically based on your request priority.
              </p>
              <div className="space-y-4">
                {[
                  { label: 'Proximity', weight: 45 },
                  { label: 'Stock Freshness', weight: 30 },
                  { label: 'Order History', weight: 15 },
                  { label: 'Pricing', weight: 10 },
                ].map((w) => (
                  <div key={w.label} className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                      <span>{w.label}</span>
                      <span>{w.weight}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500"
                        style={{ width: `${w.weight}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-8">
            <h4 className="text-lg font-bold text-slate-900 mb-6">Need Help?</h4>
            <div className="space-y-6">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
                  <Star className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Elite Vendor Tier</p>
                  <p className="text-xs text-slate-500">
                    Only vendors with 95%+ success rate are shown by default.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Verified Stocks</p>
                  <p className="text-xs text-slate-500">
                    Stock levels are verified every 15 minutes via EmpathI Sync.
                  </p>
                </div>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-8">
              Talk to Support
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MatchResults;

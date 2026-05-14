import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, MapPin, AlertTriangle, Heart, Navigation, Clock, Shield, Activity,
  Truck, Droplets, Home, Siren, LogOut, Loader2, ChevronRight, Zap, Users
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { cn } from '../utils/cn';

const HybridMatchResults = () => {
  const navigate = useNavigate();
  const { profile } = useAppContext();
  const [searchParams] = useSearchParams();

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('immediate');
  const [showSmartRetry, setShowSmartRetry] = useState(false);
  const [retryConfig, setRetryConfig] = useState({
    expandRadius: false,
    nearbyCities: false,
    broaderCategories: false
  });

  const requestId = searchParams.get('request_id');
  const emergencyQuery = searchParams.get('query');

  useEffect(() => {
    if (requestId && emergencyQuery) {
      fetchIntelligentResults();
    }
  }, [requestId, emergencyQuery]);

  const fetchIntelligentResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/emergency/intelligent-match?request_id=${requestId}&emergency_query=${encodeURIComponent(emergencyQuery)}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${profile.accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch intelligent results');
      }

      const data = await response.json();
      setResults(data);

      if (!data.has_platform_matches && !data.has_nearby_resources) {
        setShowSmartRetry(true);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-bold">Finding emergency resources...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-red-900 mb-2">Error Fetching Results</h3>
                <p className="text-red-700 mb-4">{error}</p>
                <Button onClick={fetchIntelligentResults}>Try Again</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!results) return null;

  const urgencyColors = {
    95: 'bg-red-600',
    80: 'bg-orange-600',
    60: 'bg-amber-600',
    50: 'bg-yellow-600'
  };

  const getUrgencyColor = (score) => {
    if (score >= 90) return urgencyColors[95];
    if (score >= 75) return urgencyColors[80];
    if (score >= 55) return urgencyColors[60];
    return urgencyColors[50];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto p-4 md:p-8 pb-24"
    >
      {/* Header with Urgency Badge */}
      <div className={cn(
        'rounded-3xl p-6 md:p-8 text-white mb-8 shadow-lg',
        getUrgencyColor(results.urgency_score)
      )}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black mb-2">
              Emergency Resources Found
            </h1>
            <p className="text-white/80 text-lg font-bold">
              {results.recommended_action}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold opacity-75">Urgency Level</div>
            <div className="text-3xl font-black">{results.urgency_score}/100</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/20">
          <div>
            <div className="text-xs font-bold opacity-75">Nearby Hospitals</div>
            <div className="text-2xl font-black">
              {results.results?.critical_infrastructure?.length || 0}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold opacity-75">Verified Vendors</div>
            <div className="text-2xl font-black">
              {results.results?.verified_vendors?.length || 0}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold opacity-75">Volunteers Ready</div>
            <div className="text-2xl font-black">
              {results.results?.support_resources?.filter(r => r.skills)?.length || 0}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold opacity-75">Helplines Active</div>
            <div className="text-2xl font-black">
              {results.results?.alternative_help?.length || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Immediate Actions */}
      {results.results?.immediate_actions?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <Siren className="w-5 h-5 text-red-600 animate-pulse" />
            <h2 className="text-2xl font-black text-slate-900">
              🚨 Immediate Actions
            </h2>
          </div>

          <div className="space-y-3">
            {results.results.immediate_actions.map((action, idx) => (
              <motion.div
                key={idx}
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="p-6 bg-red-600 text-white rounded-2xl border-2 border-red-400 shadow-xl cursor-pointer hover:shadow-2xl transition-all"
                onClick={() => {
                  if (action.phone) {
                    if (window.confirm(`Call ${action.phone}?`)) {
                      window.location.href = `tel:${action.phone}`;
                    }
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-lg">{action.action}</p>
                    <p className="text-red-100 text-sm font-bold">
                      Priority {action.priority}
                    </p>
                  </div>
                  <div className="text-3xl font-black text-red-200">
                    {action.phone}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {[
          { id: 'critical', label: '🏥 Infrastructure', icon: Shield },
          { id: 'vendors', label: '🏪 Verified Vendors', icon: Activity },
          { id: 'support', label: '🤝 Support', icon: Heart },
          { id: 'help', label: '📞 Helplines', icon: Phone },
          { id: 'nearby', label: '📍 Nearby', icon: MapPin }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all flex-shrink-0',
              activeTab === tab.id
                ? 'bg-primary-600 text-white shadow-lg'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results by Tab */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* Critical Infrastructure */}
          {activeTab === 'critical' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.results?.critical_infrastructure?.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-white">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <Badge className="bg-red-100 text-red-700 border-red-200">
                          {item.type || 'Hospital'}
                        </Badge>
                        <span className="text-xs font-black text-red-600">
                          {item.distance_km} km away
                        </span>
                      </div>
                      <h3 className="font-black text-lg text-slate-900 mb-2">
                        {item.name}
                      </h3>
                      {item.address && (
                        <p className="text-sm text-slate-500 mb-4 flex items-start gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          {item.address}
                        </p>
                      )}
                      <div className="flex gap-2">
                        {item.phone && (
                          <Button
                            className="flex-1 bg-red-600 hover:bg-red-700"
                            size="sm"
                            icon={<Phone className="w-3.5 h-3.5" />}
                            onClick={() => {
                              if (window.confirm(`Call ${item.phone}?`)) {
                                window.location.href = `tel:${item.phone}`;
                              }
                            }}
                          >
                            Call
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          className="flex-1"
                          size="sm"
                          icon={<Navigation className="w-3.5 h-3.5" />}
                          onClick={() => {
                            window.open(
                              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name)}`,
                              '_blank'
                            );
                          }}
                        >
                          Navigate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Vendors */}
          {activeTab === 'vendors' && (
            <div className="space-y-4">
              {results.results?.verified_vendors?.map((vendor, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-black text-slate-900">{vendor.name}</h3>
                            {vendor.has_inventory && (
                              <Badge className="bg-emerald-100 text-emerald-700">
                                In Stock
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">
                            {vendor.distance_km} km away • Match: {Math.round(vendor.match_score * 100)}%
                          </p>
                        </div>
                        <Button
                          className="bg-primary-600"
                          size="sm"
                          icon={<Phone className="w-3.5 h-3.5" />}
                          onClick={() => {
                            if (vendor.phone) {
                              window.location.href = `tel:${vendor.phone}`;
                            }
                          }}
                        >
                          Contact
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Support Resources */}
          {activeTab === 'support' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.results?.support_resources?.map((resource, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="bg-gradient-to-br from-emerald-50 to-white">
                    <CardContent className="p-6">
                      <h3 className="font-black text-lg text-slate-900 mb-2">
                        {resource.name}
                      </h3>
                      {resource.category && (
                        <Badge className="mb-3" variant="secondary">
                          {resource.category}
                        </Badge>
                      )}
                      {resource.description && (
                        <p className="text-sm text-slate-600 mb-4">
                          {resource.description}
                        </p>
                      )}
                      <Button
                        className="w-full"
                        size="sm"
                        icon={<ChevronRight className="w-3.5 h-3.5" />}
                        onClick={() => navigate(`/campaigns/${resource.id}`)}
                      >
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Helplines */}
          {activeTab === 'help' && (
            <div className="space-y-3">
              {results.results?.alternative_help?.map((contact, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-6 bg-slate-50 border-l-4 border-primary-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group"
                  onClick={() => {
                    if (contact.phone && window.confirm(`Call ${contact.phone}?`)) {
                      window.location.href = `tel:${contact.phone}`;
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-black text-slate-900">{contact.name}</h3>
                        {contact.is_pinned && (
                          <Badge className="bg-red-100 text-red-700">Priority</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mb-2">
                        {contact.category} • {contact.city}
                      </p>
                      <p className="text-lg font-black text-primary-600">{contact.phone}</p>
                    </div>
                    <Phone className="w-5 h-5 text-primary-600 group-hover:scale-110 transition-transform" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Nearby Resources */}
          {activeTab === 'nearby' && (
            <div className="space-y-6">
              {Object.entries(results.results?.nearby_resources || {})
                .filter(([_, items]) => items && items.length > 0)
                .map(([type, items]) => (
                  <div key={type}>
                    <h3 className="font-black text-lg text-slate-900 mb-3 capitalize">
                      {type.replace('_', ' ')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-primary-300 transition-colors"
                        >
                          <p className="font-bold text-slate-900 mb-1">{item.name}</p>
                          <p className="text-xs text-slate-500 mb-2">
                            {item.distance} km away
                          </p>
                          {item.address && (
                            <p className="text-xs text-slate-600">{item.address}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Smart Retry Modal */}
      {showSmartRetry && !results.has_platform_matches && !results.has_nearby_resources && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        >
          <Card className="max-w-md w-full">
            <CardContent className="p-8">
              <AlertTriangle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
              <h3 className="text-xl font-black text-slate-900 mb-2 text-center">
                No Matches Found
              </h3>
              <p className="text-slate-600 text-center mb-6">
                Let's expand your search to find available resources.
              </p>

              <div className="space-y-3 mb-6">
                <Button
                  fullWidth
                  variant={retryConfig.expandRadius ? 'primary' : 'outline'}
                  onClick={() =>
                    setRetryConfig(prev => ({
                      ...prev,
                      expandRadius: !prev.expandRadius
                    }))
                  }
                >
                  📍 Expand search radius (3km → 10km)
                </Button>
                <Button
                  fullWidth
                  variant={retryConfig.nearbyCities ? 'primary' : 'outline'}
                  onClick={() =>
                    setRetryConfig(prev => ({
                      ...prev,
                      nearbyCities: !prev.nearbyCities
                    }))
                  }
                >
                  🏙️ Include nearby cities
                </Button>
                <Button
                  fullWidth
                  variant={retryConfig.broaderCategories ? 'primary' : 'outline'}
                  onClick={() =>
                    setRetryConfig(prev => ({
                      ...prev,
                      broaderCategories: !prev.broaderCategories
                    }))
                  }
                >
                  🔍 Broaden search categories
                </Button>
              </div>

              <Button
                className="w-full"
                onClick={() => {
                  // Trigger smart retry with selected options
                  console.log('Smart retry with:', retryConfig);
                  setShowSmartRetry(false);
                }}
              >
                Search Again
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* No Results Message */}
      {!results.has_platform_matches && !results.has_nearby_resources && (
        <Card className="text-center p-12 bg-slate-50">
          <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-bold mb-6">
            No emergency resources found in your current search parameters.
          </p>
          <Button onClick={() => navigate('/user/create')}>
            Modify Request
          </Button>
        </Card>
      )}
    </motion.div>
  );
};

export default HybridMatchResults;

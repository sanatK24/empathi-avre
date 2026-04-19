import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  Target,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { cn } from '../utils/cn';

const VendorDashboard = () => {
  const { profile } = useAppContext();
  const [stats, setStats] = useState({
    total_value: '$0',
    low_stock_alerts: '0 Items',
    active_requests: '0',
  });
  const [matches, setMatches] = useState([]);
  const [marketAnalytics, setMarketAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matchesError, setMatchesError] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!profile.accessToken) return;

      try {
        setLoading(true);

        // Load vendor stats
        const statsData = await apiService.getVendorStats(profile.accessToken);
        setStats(statsData);

        // Load vendor matches
        try {
          const matchesData = await apiService.getVendorMatches(profile.accessToken);
          if (Array.isArray(matchesData)) {
            setMatches(matchesData.slice(0, 3)); // Limit to 3 matches for display
          } else if (matchesData && matchesData.matches) {
            setMatches(matchesData.matches.slice(0, 3));
          } else {
            setMatches([]);
          }
        } catch (matchError) {
          console.warn('Failed to load matches:', matchError);
          setMatchesError(matchError.message);
          setMatches([]);
        }

        // Generate market analytics from stats if available
        if (statsData?.market_analytics) {
          setMarketAnalytics(statsData.market_analytics);
        }
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [profile.accessToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Inventory Value',
      value: stats.total_value || '$0',
      icon: Package,
      color: 'text-primary-500',
      bg: 'bg-primary-50',
      trend: '+12% from last month',
    },
    {
      label: 'Low Stock Alerts',
      value: stats.low_stock_alerts || '0 Items',
      icon: AlertTriangle,
      color: 'text-rose-500',
      bg: 'bg-rose-50',
      trend: 'Critical attention needed',
    },
    {
      label: 'Pending Requests',
      value: stats.active_requests || '0',
      icon: ArrowUpRight,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      trend: `${matches.length} new matches found`,
    },
  ];

  const getMatchResourceName = (match) => {
    if (match.resource_name) return match.resource_name;
    if (match.name) return match.name;
    if (match.request_resource) return match.request_resource;
    return 'Resource Match';
  };

  const getMatchScore = (match) => {
    if (match.score !== undefined) return `${match.score}%`;
    if (match.match_score !== undefined) return `${match.match_score}%`;
    if (match.relevance_score !== undefined) return `${match.relevance_score}%`;
    return 'High';
  };

  const getMatchLocation = (match) => {
    return match.location || 'N/A';
  };

  const getMarketAnalyticsText = () => {
    if (marketAnalytics && marketAnalytics.trending_product) {
      return {
        product: marketAnalytics.trending_product,
        demand: marketAnalytics.demand_increase || 0,
      };
    }
    return {
      product: 'Resources',
      demand: 0,
    };
  };

  const analytics = getMarketAnalyticsText();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-display font-black text-slate-900 tracking-tight uppercase">
          Vendor Overview
        </h1>
        <p className="text-slate-500 font-medium text-lg">
          Welcome back, {profile.fullName || 'Vendor'}. Here's what's happening with your supply chain.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-none ring-1 ring-slate-100 shadow-soft hover:shadow-lg transition-all overflow-hidden group">
              <CardContent className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className={cn('p-4 rounded-2xl', s.bg, s.color)}>
                    <s.icon className="w-8 h-8" />
                  </div>
                  <div className="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Live
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
                <h4 className="text-3xl font-display font-black text-slate-900 mb-2">{s.value}</h4>
                <p className={cn('text-xs font-bold flex items-center', s.color)}>{s.trend}</p>
              </CardContent>
              <div className={cn('h-1.5 w-full bg-slate-100', s.bg)}>
                <motion.div
                  className={cn('h-full', s.color.replace('text-', 'bg-'))}
                  initial={{ width: 0 }}
                  animate={{ width: '70%' }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none ring-1 ring-slate-100 shadow-soft">
          <CardHeader className="p-8 pb-0">
            <CardTitle className="text-xl font-display font-black text-slate-900 tracking-tight uppercase">
              Recent Match Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {matches.length > 0 ? (
              <>
                {matches.map((match, i) => (
                  <motion.div
                    key={match.id || i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100 group hover:bg-white hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-primary-500 group-hover:bg-primary-500 group-hover:text-white transition-all shadow-sm">
                        <Target className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">
                          {getMatchResourceName(match)}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          {getMatchScore(match)} relevance score • {getMatchLocation(match)}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-primary-500 transition-all" />
                  </motion.div>
                ))}
                <Button
                  variant="ghost"
                  className="w-full text-primary-500 font-bold py-4 hover:bg-primary-50"
                >
                  View All Recommendations
                </Button>
              </>
            ) : (
              <div className="p-8 text-center">
                {matchesError ? (
                  <div className="space-y-4">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-slate-500 font-medium">Unable to load matches</p>
                    <p className="text-xs text-slate-400">{matchesError}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-slate-600 font-medium">No active matches at the moment</p>
                    <p className="text-xs text-slate-500">
                      Check back soon for new vendor opportunities
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none ring-1 ring-slate-100 shadow-soft bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <CardContent className="p-10 relative z-10 flex flex-col h-full">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-3 bg-primary-500 rounded-xl">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-display font-black uppercase tracking-tight">
                Market Analytics
              </h3>
            </div>
            {marketAnalytics ? (
              <p className="text-slate-400 font-medium mb-10 leading-relaxed">
                Your supply of <span className="text-white font-bold">{analytics.product}</span> is
                seeing {analytics.demand}% higher demand than usual in your area. Consider adjusting
                your stock levels.
              </p>
            ) : (
              <p className="text-slate-400 font-medium mb-10 leading-relaxed">
                Track market trends and demand patterns for your inventory in real-time.
              </p>
            )}
            <div className="mt-auto flex items-center gap-6">
              <div className="flex-1 p-6 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Response Time
                </p>
                <p className="text-2xl font-display font-black text-white">
                  {stats.avg_response_time || 'N/A'}
                </p>
              </div>
              <div className="flex-1 p-6 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Reliability
                </p>
                <p className="text-2xl font-display font-black text-emerald-400">
                  {stats.reliability_score || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VendorDashboard;

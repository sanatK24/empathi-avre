import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Heart,
  Users,
  Target,
  Award,
  BarChart3,
  Zap,
  ArrowUp,
  Loader2,
  AlertCircle,
  MapPin,
  DollarSign
} from 'lucide-react';
import Badge from '../components/ui/Badge';

function CampaignAnalyticsDashboard() {
  const { profile } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashboardData, recsData] = await Promise.all([
        apiService.getAnalyticsDashboard(profile?.accessToken),
        apiService.getPersonalizedRecommendations(profile?.accessToken, 6)
      ]);

      setDashboard(dashboardData);
      setRecommendations(Array.isArray(recsData) ? recsData : []);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.accessToken) {
      fetchAnalytics();
    }
  }, [profile?.accessToken]);

  if (loading) {
    return (
      <section className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-lg"></div>
          ))}
        </div>
      </section>
    );
  }

  if (!dashboard) {
    return (
      <section className="p-6 max-w-6xl mx-auto">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
            <div className="text-red-800">{error}</div>
          </div>
        )}
      </section>
    );
  }

  const { summary, by_category, trend_7days } = dashboard;

  const statCards = [
    {
      title: 'Total Campaigns',
      value: summary.total_campaigns,
      icon: Target,
      color: 'bg-blue-500',
      subtext: `${summary.active_campaigns} active`
    },
    {
      title: 'Total Donations',
      value: summary.total_donations,
      icon: Heart,
      color: 'bg-red-500',
      subtext: `₹${summary.total_raised.toLocaleString()}`
    },
    {
      title: 'Unique Donors',
      value: summary.unique_donors,
      icon: Users,
      color: 'bg-green-500',
      subtext: `Avg: ₹${summary.average_donation}`
    },
    {
      title: 'Completion Rate',
      value: `${summary.completion_rate}%`,
      icon: Award,
      color: 'bg-purple-500',
      subtext: `${summary.completed_campaigns} completed`
    }
  ];

  return (
    <section className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Campaign Analytics</h1>
        <p className="text-slate-600 mt-2">Track platform performance and discover recommended campaigns</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg border border-slate-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon size={24} className="text-white" />
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-1">{stat.title}</p>
              <p className="text-2xl font-bold text-slate-900 mb-2">{stat.value}</p>
              <p className="text-xs text-slate-600">{stat.subtext}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg border border-slate-200 p-6"
        >
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            Campaigns by Category
          </h3>
          <div className="space-y-3">
            {by_category.map((cat) => (
              <div key={cat.category}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700 capitalize">{cat.category}</span>
                  <span className="font-medium">{cat.campaigns}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-full rounded-full"
                    style={{ width: `${Math.min((cat.campaigns / summary.total_campaigns) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  ₹{cat.total_raised.toLocaleString()} raised
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 7-Day Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg border border-slate-200 p-6 lg:col-span-2"
        >
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            7-Day Donation Trend
          </h3>
          {trend_7days.length > 0 ? (
            <div className="space-y-3">
              {trend_7days.map((day, index) => {
                const maxAmount = Math.max(...trend_7days.map(d => d.amount || 0));
                const barWidth = maxAmount > 0 ? (day.amount / maxAmount) * 100 : 0;

                return (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <div className="text-right">
                        <span className="font-medium text-slate-900">{day.donations} donations</span>
                        <span className="text-slate-600 ml-2">₹{day.amount.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 0.5, delay: index * 0.05 }}
                        className="bg-green-500 h-full rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-600 text-center py-8">No donation data in the last 7 days</p>
          )}
        </motion.div>
      </div>

      {/* Personalized Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-lg border border-slate-200 p-6"
      >
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Zap size={20} className="text-amber-500" />
          Recommended for You
        </h3>

        {recommendations.length === 0 ? (
          <p className="text-slate-600 text-center py-8">
            No recommendations available. Support a campaign to get personalized suggestions!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((rec, index) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="border border-slate-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <div className="mb-3">
                  <h4 className="font-semibold text-slate-900 line-clamp-2 mb-1">
                    {rec.title}
                  </h4>
                  <p className="text-xs text-slate-600 mb-2">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {rec.city}
                    </span>
                  </p>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700">₹{rec.raised_amount?.toLocaleString() || 0}</span>
                    <span className="text-slate-600">₹{rec.goal_amount?.toLocaleString() || 0}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-full rounded-full"
                      style={{ width: `${rec.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge className="bg-slate-100 text-slate-800 text-xs capitalize">
                    {rec.category}
                  </Badge>
                  {rec.verified && (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      ✓ Verified
                    </Badge>
                  )}
                  <Badge className={`text-xs ${
                    rec.urgency_level === 'critical' ? 'bg-red-100 text-red-800' :
                    rec.urgency_level === 'high' ? 'bg-orange-100 text-orange-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {rec.urgency_level.charAt(0).toUpperCase() + rec.urgency_level.slice(1)}
                  </Badge>
                </div>

                <p className="text-xs text-slate-600 mb-3">
                  {rec.reason}
                </p>

                <button className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                  View Campaign
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </section>
  );
}

export default CampaignAnalyticsDashboard;

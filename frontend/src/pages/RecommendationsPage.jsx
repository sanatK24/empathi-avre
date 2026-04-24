import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  TrendingUp, 
  MapPin, 
  Zap, 
  ArrowRight,
  ShieldCheck,
  Heart,
  Users
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

const RecommendationsPage = () => {
  const { profile } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        // Fetch personalized campaigns for the "Smart Feed"
        const data = await apiService.getPersonalizedCampaigns(profile?.accessToken);
        setItems(data || []);
      } catch (err) {
        console.error("Smart Feed fetch failed", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-4 border-primary-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-primary-500 rounded-full animate-spin"></div>
          <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-amber-400 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      <header className="py-12 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-full border border-amber-100"
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-black uppercase tracking-widest text-amber-700">AI-Powered Insights</span>
        </motion.div>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-5xl font-display font-black text-slate-900 tracking-tight uppercase leading-none">
              Explore <span className="text-primary-500">Smart Feed</span>
            </h1>
            <p className="text-slate-500 font-medium text-lg mt-4 max-w-2xl">
              A visually curated discovery engine for humanitarian campaigns and verified resources.
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-black text-slate-900">{items.length}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Campaigns</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl">
               <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>
      </header>

      {/* Masonry Grid */}
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
        {items.map((campaign, i) => {
          // Deterministic pseudo-random height for masonry feel
          const heights = ['aspect-[4/5]', 'aspect-[3/4]', 'aspect-[4/3]', 'aspect-[1/1]', 'aspect-[3/5]'];
          const heightClass = heights[i % heights.length];
          
          return (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="break-inside-avoid mb-6"
            >
              <Card className="group relative border-none shadow-premium hover:shadow-2xl transition-all duration-500 rounded-[2rem] overflow-hidden bg-white">
                <Link to={`/user/campaigns/${campaign.id}`}>
                  <div className={`relative w-full ${heightClass} overflow-hidden bg-slate-100`}>
                    <img 
                      src={campaign.cover_image || `https://images.unsplash.com/photo-${1500000000000 + (campaign.id * 1000)}?auto=format&fit=crop&w=800&q=80`} 
                      alt={campaign.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
                      <Button variant="primary" size="sm" className="w-full bg-white text-slate-900 hover:bg-slate-100 border-none font-black uppercase text-[10px] tracking-widest">
                        View Campaign
                      </Button>
                    </div>
                    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                      {campaign.reason && (
                        <div className="px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-[8px] font-black uppercase tracking-widest text-white border border-white/20">
                          {campaign.reason}
                        </div>
                      )}
                    </div>
                    <div className="absolute top-4 right-4 z-10">
                      <Badge variant={campaign.urgency_level === 'high' ? 'danger' : 'warning'} className="shadow-lg backdrop-blur-md bg-opacity-80">
                        {campaign.urgency_level}
                      </Badge>
                    </div>
                  </div>
                  
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-primary-500 uppercase tracking-widest bg-primary-50 px-2 py-1 rounded-md">
                          {campaign.category}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {campaign.city}
                        </span>
                      </div>
                      {campaign.score && (
                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                          {campaign.score}% Match
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-display font-black text-slate-900 leading-tight mb-2 group-hover:text-primary-600 transition-colors uppercase">
                      {campaign.title}
                    </h3>
                    
                    <p className="text-xs text-slate-500 line-clamp-2 mb-4 font-medium">
                      {campaign.description}
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progress</span>
                        <span className="text-xs font-black text-slate-900">
                          {campaign.goal_amount > 0 
                            ? Math.round((campaign.raised_amount / campaign.goal_amount) * 100) 
                            : (campaign.progress || 0)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary-500 rounded-full transition-all duration-1000 group-hover:bg-primary-600" 
                          style={{ 
                            width: `${Math.min(100, campaign.goal_amount > 0 
                              ? (campaign.raised_amount / campaign.goal_amount) * 100 
                              : (campaign.progress || 0))}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="py-40 text-center">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-12 h-12 text-slate-200" />
          </div>
          <h3 className="text-2xl font-display font-black text-slate-900 uppercase tracking-tight">Feed is empty</h3>
          <p className="text-slate-500 font-medium mt-2">We couldn't find any active campaigns right now.</p>
        </div>
      )}
    </div>
  );
};


export default RecommendationsPage;

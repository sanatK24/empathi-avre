import React, { useEffect, useState } from 'react';
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
    if (!profile.accessToken) return;
    
    apiService.getPersonalizedCampaigns(profile.accessToken)
      .then((data) => {
        setItems(data || []);
      })
      .catch(err => console.error("Recs failed", err))
      .finally(() => setLoading(false));
  }, [profile.accessToken]);

  // Real data is fetched in useEffect

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
             <Sparkles className="w-10 h-10 text-amber-400" /> Smart Feed
          </h1>
          <p className="text-slate-500 font-medium text-lg mt-2">
            AI-curated opportunities and resources based on your activity and location.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary-500" /> Personalized Opportunities
          </h2>
          
          <div className="space-y-6">
            {items.map((campaign, i) => (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="hover:shadow-premium hover:ring-2 hover:ring-primary-500/20 transition-all border-none ring-1 ring-slate-100 group cursor-pointer">
                  <CardContent className="p-8">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="bg-primary-50 text-primary-600 font-black uppercase text-[10px]">Campaign</Badge>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {campaign.city}
                          </span>
                        </div>
                        <h3 className="text-xl font-display font-black text-slate-900 group-hover:text-primary-600 transition-colors uppercase tracking-tight">
                          {campaign.title}
                        </h3>
                      </div>
                      <Badge variant={campaign.urgency_level === 'high' ? 'danger' : 'warning'}>
                         {campaign.urgency_level}
                      </Badge>
                    </div>
                    <p className="text-slate-600 font-medium mb-6 leading-relaxed">
                      {campaign.description}
                    </p>
                    <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                       <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                          </div>
                          <span className="text-xs font-bold text-slate-500">Recommended for your location</span>
                       </div>
                       <Button size="sm" variant="ghost" className="text-primary-600 font-black uppercase tracking-widest">
                         Support <ArrowRight className="w-4 h-4 ml-1" />
                       </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {items.length === 0 && (
               <div className="py-24 text-center bg-slate-50 rounded-3XL border-2 border-dashed border-slate-200">
                  <Sparkles className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <h3 className="text-xl font-display font-black text-slate-400 uppercase tracking-tight">No Recommendations Yet</h3>
                  <p className="text-slate-400 font-medium mt-2">Personalized opportunities will appear as you interact with the platform.</p>
               </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
           <Card className="bg-slate-900 text-white border-none shadow-premium">
              <CardContent className="p-8">
                 <div className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary-500/20">
                    <Zap className="w-6 h-6" />
                 </div>
                 <h4 className="text-lg font-display font-black uppercase mb-2">Proximity Engine</h4>
                 <p className="text-slate-400 font-medium mb-6">
                    Our AI scans a 15km radius around your location to find verified resources.
                 </p>
                 <div className="space-y-4">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                       <span className="text-slate-500">Scan coverage</span>
                       <span>94%</span>
                    </div>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                       <div className="h-full bg-primary-500 w-[94%] rounded-full"></div>
                    </div>
                 </div>
              </CardContent>
           </Card>

            <Card className="border-none ring-1 ring-slate-100 shadow-soft">
              <CardContent className="p-8 space-y-6">
                 <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Platform Status</h4>
                 <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-tight">AI Engine Online</span>
                 </div>
                 <p className="text-[10px] text-slate-400 font-medium italic">
                    Real-time monitoring of local resource availability is active in your region.
                 </p>
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
};

export default RecommendationsPage;

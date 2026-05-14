import React from 'react';
import { motion } from 'framer-motion';
import { 
  PlusCircle, 
  History, 
  Package, 
  Activity, 
  Zap, 
  Search,
  ArrowRight,
  ShieldCheck,
  Globe,
  Droplet,
  Thermometer,
  Stethoscope
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

const ResourceHubPage = () => {
  const navigate = useNavigate();

  const categories = [
    { name: 'Medical Equipment', icon: Activity, count: '1.2k+', color: 'text-blue-500', bg: 'bg-blue-50' },
    { name: 'Pharmaceuticals', icon: Droplet, count: '850+', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { name: 'Blood Bank', icon: Thermometer, count: 'Active', color: 'text-rose-500', bg: 'bg-rose-50' },
    { name: 'Diagnostic Tools', icon: Stethoscope, count: '420+', color: 'text-amber-500', bg: 'bg-amber-50' },
    { name: 'Emergency Kits', icon: Package, count: '2.4k+', color: 'text-purple-500', bg: 'bg-purple-50' },
    { name: 'Global Logistics', icon: Globe, count: 'Verified', color: 'text-indigo-500', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-12 pb-20 px-4">
      <header className="space-y-3 md:space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 rounded-full border border-primary-100"
        >
          <Zap className="w-3 h-3 text-primary-500" />
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-primary-700">Centralized Resource Management</span>
        </motion.div>
        
        <h1 className="text-3xl md:text-5xl font-display font-black text-slate-900 tracking-tight uppercase leading-none">
          Resource <span className="text-primary-500">Hub</span>
        </h1>
        <p className="text-slate-500 font-medium text-sm md:text-lg max-w-2xl">
          Create requests, track fulfillment, and explore the global network of humanitarian resources.
        </p>
      </header>

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        <motion.div
          whileHover={{ y: -5 }}
          className="group cursor-pointer"
          onClick={() => navigate('/user/create')}
        >
          <Card className="h-full bg-slate-900 text-white border-none shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 md:p-8 opacity-10 group-hover:opacity-20 transition-opacity">
               <PlusCircle className="w-24 md:w-40 h-24 md:h-40 -mr-6 md:-mr-10 -mt-6 md:-mt-10" />
            </div>
            <CardContent className="p-6 md:p-10 relative z-10 flex flex-col h-full">
              <div className="w-12 md:w-14 h-12 md:h-14 bg-primary-500 rounded-2xl flex items-center justify-center mb-6 md:mb-8 shadow-xl shadow-primary-500/30">
                <PlusCircle className="w-6 md:w-8 h-6 md:h-8 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-display font-black uppercase mb-3 md:mb-4 tracking-tight">Create Request</h3>
              <p className="text-slate-400 font-medium text-sm md:text-base mb-6 md:mb-8 flex-grow">
                Submit a new requirement for medical supplies, blood, or emergency equipment.
              </p>
              <div className="flex items-center text-primary-400 font-black uppercase tracking-widest text-[10px] md:text-xs group-hover:gap-2 transition-all">
                Get Started <ArrowRight className="w-3 md:w-4 h-3 md:h-4 ml-1" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ y: -5 }}
          className="group cursor-pointer"
          onClick={() => navigate('/user/history')}
        >
          <Card className="h-full bg-white border-none shadow-premium ring-1 ring-slate-100 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 md:p-8 opacity-5 group-hover:opacity-10 transition-opacity">
               <History className="w-24 md:w-40 h-24 md:h-40 -mr-6 md:-mr-10 -mt-6 md:-mt-10" />
            </div>
            <CardContent className="p-6 md:p-10 relative z-10 flex flex-col h-full">
              <div className="w-12 md:w-14 h-12 md:h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 md:mb-8">
                <History className="w-6 md:w-8 h-6 md:h-8 text-slate-600" />
              </div>
              <h3 className="text-xl md:text-2xl font-display font-black uppercase mb-3 md:mb-4 tracking-tight text-slate-900">Request History</h3>
              <p className="text-slate-500 font-medium text-sm md:text-base mb-6 md:mb-8 flex-grow">
                Track your active and previous resource requests in real-time.
              </p>
              <div className="flex items-center text-primary-600 font-black uppercase tracking-widest text-[10px] md:text-xs group-hover:gap-2 transition-all">
                View History <ArrowRight className="w-3 md:w-4 h-3 md:h-4 ml-1" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* General Resources Section */}
      <section className="space-y-5 md:space-y-8 pt-4 md:pt-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 md:gap-2">
              <Globe className="w-3 md:w-4 h-3 md:h-4" /> Global Resource Network
            </h2>
            <p className="text-slate-900 font-bold mt-1 text-lg md:text-xl">Current Inventory & Categories</p>
          </div>
          <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-emerald-50 rounded-xl border border-emerald-100 whitespace-nowrap">
             <ShieldCheck className="w-3 md:w-4 h-3 md:h-4 text-emerald-500" />
             <span className="text-[9px] md:text-[10px] font-black text-emerald-700 uppercase">Verified Sources Only</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border-none shadow-soft hover:shadow-premium transition-all cursor-pointer group h-full">
                <CardContent className="p-3 md:p-6 flex flex-col items-center text-center space-y-2 md:space-y-4">
                  <div className={`w-10 md:w-12 h-10 md:h-12 ${cat.bg} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                    <cat.icon className={`w-5 md:w-6 h-5 md:h-6 ${cat.color}`} />
                  </div>
                  <div>
                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-tight leading-none mb-0.5 truncate px-1">{cat.name}</p>
                    <p className={`text-[9px] md:text-xs font-black ${cat.color}`}>{cat.count}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Quick Search Tip */}
      <div className="bg-slate-50 rounded-3xl p-5 md:p-8 border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
        <div className="flex items-center gap-3 md:gap-6">
           <div className="w-12 md:w-16 h-12 md:h-16 bg-white rounded-2xl flex items-center justify-center shadow-soft flex-shrink-0">
              <Search className="w-6 md:w-8 h-6 md:h-8 text-primary-500" />
           </div>
           <div>
              <h4 className="text-base md:text-lg font-display font-black uppercase text-slate-900 tracking-tight leading-snug">Need something specific?</h4>
              <p className="text-slate-500 font-medium text-sm md:text-base">Use our intelligent search to find resources across all vendors.</p>
           </div>
        </div>
        <Button 
          variant="secondary" 
          className="bg-white border-none shadow-sm font-black uppercase tracking-widest px-6 md:px-8 text-sm md:text-base whitespace-nowrap"
          onClick={() => navigate('/user/marketplace')}
        >
           Browse Marketplace
        </Button>
      </div>
    </div>
  );
};

export default ResourceHubPage;

import React from 'react';
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

const RequestHistory = () => {
  const history = [
    { id: 'REQ-284', name: 'Surgical Gloves (M)', date: 'Oct 12, 2023', status: 'Fulfilled', vendor: 'Central Surgicals', urgency: 'High' },
    { id: 'REQ-283', name: 'Oxygen Cylinders', date: 'Oct 11, 2023', status: 'Fulfilled', vendor: 'Reliable LifeSciences', urgency: 'Critical' },
    { id: 'REQ-282', name: 'Test Tubes 10ml', date: 'Oct 10, 2023', status: 'In Transit', vendor: 'Metro Medical Hub', urgency: 'Medium' },
    { id: 'REQ-281', name: 'Masks (N95)', date: 'Oct 09, 2023', status: 'Cancelled', vendor: 'N/A', urgency: 'Low' },
    { id: 'REQ-280', name: 'Saline Solution', date: 'Oct 08, 2023', status: 'Fulfilled', vendor: 'Central Surgicals', urgency: 'Medium' },
  ];

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Fulfilled': return <Badge variant="success">{status}</Badge>;
      case 'In Transit': return <Badge variant="primary">{status}</Badge>;
      case 'Cancelled': return <Badge variant="danger">{status}</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

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
                    className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                />
            </div>
            <Button variant="secondary" size="md">
                <Filter className="w-4 h-4 mr-2" /> Filters
            </Button>
        </div>
      </div>

      <div className="space-y-4">
        {history.map((item, i) => (
          <motion.div
            key={item.id}
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
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.id}</p>
                      <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">{item.name}</h4>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                       <Calendar className="w-4 h-4 text-slate-300" />
                       <span className="text-sm font-semibold text-slate-500">{item.date}</span>
                    </div>

                    <div className="flex-grow">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Vendor Assigned</p>
                        <p className="text-sm font-bold text-slate-700">{item.vendor}</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden lg:block text-right pr-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Impact</p>
                            <Badge variant={item.urgency === 'Critical' ? 'danger' : item.urgency === 'High' ? 'warning' : 'primary'}>
                                {item.urgency}
                            </Badge>
                        </div>
                        {getStatusBadge(item.status)}
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
      </div>

      <div className="pt-8 flex items-center justify-center">
         <Button variant="secondary" className="px-12 border-slate-200 shadow-none">Load More Activities</Button>
      </div>
    </div>
  );
};

export default RequestHistory;

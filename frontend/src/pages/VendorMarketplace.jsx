import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  MapPin, 
  Star, 
  Clock, 
  ShieldCheck, 
  Filter,
  ChevronRight,
  Zap,
  ShoppingBag
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';

const VendorCard = ({ vendor, navigate }) => (
  <motion.div
    whileHover={{ y: -8 }}
    transition={{ type: 'spring', stiffness: 300 }}
    onClick={() => navigate(`/user/vendor/${vendor.id}`)}
    className="cursor-pointer"
  >
    <Card className={`overflow-hidden rounded-[2.5rem] border-none shadow-premium hover:shadow-2xl transition-all duration-500 group ${!vendor.is_active || !vendor.is_available ? 'grayscale opacity-70' : ''}`}>
      <div className="aspect-[16/10] relative overflow-hidden bg-slate-100">
        <img 
          src={vendor.image_url || `https://images.unsplash.com/photo-${1580000000000 + (vendor.id * 1000)}?auto=format&fit=crop&w=800&q=80`} 
          alt={vendor.shop_name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute top-4 left-4 z-10">
          <Badge className={`${vendor.is_active && vendor.is_available ? 'bg-emerald-500' : 'bg-slate-500'} text-white border-none shadow-lg backdrop-blur-md bg-opacity-90`}>
            {!vendor.is_active ? 'UNAVAILABLE' : (!vendor.is_available ? 'OUT OF STOCK' : 'AVAILABLE')}
          </Badge>
        </div>
        {vendor.reliability_score > 0.9 && (
          <div className="absolute top-4 right-4 z-10">
            <div className="bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-primary-100">
              <ShieldCheck className="w-5 h-5 text-primary-500" />
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
           <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 border-none font-black uppercase text-xs tracking-widest py-3">
             View Catalogue
           </Button>
        </div>
      </div>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-display font-black text-slate-900 group-hover:text-primary-500 transition-colors uppercase truncate flex-1 mr-2">
            {vendor.shop_name}
          </h3>
          <div className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg flex items-center gap-1 flex-shrink-0">
            <span className="text-sm font-black">{vendor.rating}</span>
            <Star className="w-3 h-3 fill-emerald-700" />
          </div>
        </div>
        
        <div className="flex items-center gap-3 text-slate-500 text-sm font-medium mb-4">
          <p className="flex items-center gap-1">
            <MapPin className="w-4 h-4 text-slate-400" /> {vendor.area}, {vendor.city}
          </p>
          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
          <p className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-slate-400" /> {vendor.avg_response_time} mins
          </p>
        </div>

        <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {vendor.category} Specialization
          </p>
          <div className="flex items-center text-primary-500 font-black uppercase tracking-widest text-[10px] group-hover:gap-2 transition-all">
            View Store <ChevronRight className="w-3 h-3 ml-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const VendorMarketplace = () => {
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { profile, detectLocation } = useAppContext();
  const navigate = useNavigate();
  const [showAllMedical, setShowAllMedical] = useState(false);

  const categories = [
    "All",
    "Medical Equipment", 
    "Pharmaceuticals", 
    "Blood Bank", 
    "Diagnostic Tools", 
    "Emergency Kits", 
    "Global Logistics"
  ];

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setLoading(true);
        const data = await apiService.discoverVendors(profile.accessToken, { city: 'Mumbai' });
        setVendors(data);
      } catch (err) {
        console.error("Failed to fetch vendors", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVendors();
    
    // Auto-detect location on mount
    if (!profile.area) {
      detectLocation();
    }
  }, [profile.accessToken, profile.area, detectLocation]);

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.shop_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || v.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 space-y-8">
      {/* Search Header */}
      <div className="sticky top-0 z-30 bg-slate-50/80 backdrop-blur-md py-6 -mx-4 px-4 border-b border-slate-100">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search for medical stores, pharmacies or equipment providers..." 
              className="w-full pl-12 pr-4 h-14 rounded-2xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full lg:w-auto">
            <Button 
              variant="secondary" 
              className="bg-white border-slate-200 rounded-2xl h-14 px-6 flex-1 lg:flex-none"
              onClick={() => detectLocation()}
            >
              <MapPin className="w-4 h-4 mr-2" /> 
              <span className="truncate max-w-[150px]">
                {profile.area ? `${profile.area}, ${profile.city}` : 'Detect Location'}
              </span>
            </Button>
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide mt-4">
          {categories.map(cat => {
            const counts = {
              "All": "",
              "Medical Equipment": "1.2k+",
              "Pharmaceuticals": "850+",
              "Blood Bank": "Active",
              "Diagnostic Tools": "420+",
              "Emergency Kits": "2.4k+",
              "Global Logistics": "Verified"
            };
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border flex items-center gap-3 ${
                  selectedCategory === cat 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-105' 
                  : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300 shadow-sm'
                }`}
              >
                {cat}
                {counts[cat] && (
                  <span className={`px-2 py-0.5 rounded-md text-[8px] ${
                    selectedCategory === cat ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {counts[cat]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse space-y-4">
                <div className="aspect-[16/10] bg-slate-200 rounded-3xl"></div>
                <div className="h-6 bg-slate-200 rounded-lg w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded-lg w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-12">
            {/* Medical Providers Section */}
            {(selectedCategory === 'All' || selectedCategory === 'Medical Equipment') && (
              <section className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                  <h2 className="text-lg md:text-xl font-display font-black text-slate-900 uppercase tracking-tight">
                    Medical Providers in <span className="text-primary-500">{profile.area || profile.city || 'Your Area'}</span>
                  </h2>
                  {selectedCategory === 'All' && filteredVendors.filter(v => v.category === 'Medical Equipment').length > 3 && (
                    <button 
                      onClick={() => setShowAllMedical(!showAllMedical)}
                      className="text-primary-500 font-black text-xs uppercase tracking-widest hover:underline"
                    >
                      {showAllMedical ? 'View Less' : 'View More'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredVendors
                    .filter(v => v.category === 'Medical Equipment' || selectedCategory !== 'All')
                    .slice(0, (selectedCategory === 'All' && !showAllMedical) ? 3 : undefined)
                    .map((vendor) => (
                      <VendorCard key={vendor.id} vendor={vendor} navigate={navigate} />
                    ))}
                </div>
              </section>
            )}

            {/* Other Categories Section */}
            {selectedCategory === 'All' && (
              <section className="space-y-8 pt-8 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg md:text-xl font-display font-black text-slate-900 uppercase tracking-tight">
                    Other Resources in <span className="text-primary-500">{profile.area || profile.city || 'Your Area'}</span>
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredVendors
                    .filter(v => v.category !== 'Medical Equipment')
                    .map((vendor) => (
                      <VendorCard key={vendor.id} vendor={vendor} navigate={navigate} />
                    ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorMarketplace;

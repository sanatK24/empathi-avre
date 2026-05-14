import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ShoppingBag, 
  Star, 
  MapPin, 
  Clock, 
  ShieldCheck,
  Plus,
  Minus,
  Trash2,
  Zap,
  Info,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';

const VendorStorefront = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState(null);
  const [catalogue, setCatalogue] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchStorefront = async () => {
      try {
        setLoading(true);
        // We might need an endpoint to get single vendor details, 
        // for now we can get from discovery list or fetch storefront
        const vendors = await apiService.discoverVendors(profile.accessToken, { city: 'Mumbai' });
        const currentVendor = vendors.find(v => v.id === parseInt(id));
        setVendor(currentVendor);

        const items = await apiService.getVendorStorefront(profile.accessToken, id);
        setCatalogue(items);
      } catch (err) {
        console.error("Failed to fetch storefront", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStorefront();
  }, [id, profile.accessToken]);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, cartQuantity: i.cartQuantity + 1 } : i);
      }
      return [...prev, { ...item, cartQuantity: 1 }];
    });
    setShowCart(true);
  };

  const updateCartQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.cartQuantity + delta);
        return { ...item, cartQuantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    
    setIsSubmitting(true);
    try {
      // For each item in cart, we create a request or we might need a bulk request endpoint
      // To simplify, we'll create one request for the first item for now, 
      // or we could update backend to handle multi-item requests.
      // Given the current schema, let's create a request for the primary item.
      const primaryItem = cart[0];
      await apiService.createRequest(profile.accessToken, {
        resource_name: primaryItem.resource_name,
        category: primaryItem.category,
        quantity: primaryItem.cartQuantity,
        location_lat: 19.0760,
        location_lng: 72.8777,
        city: "Mumbai",
        urgency_level: "medium",
        notes: `Bulk order from storefront. Total items: ${cart.length}. Items: ${cart.map(i => `${i.resource_name} (x${i.cartQuantity})`).join(', ')}`
      });
      
      alert("Order submitted successfully! The vendor will be notified.");
      setCart([]);
      setShowCart(false);
      navigate('/user/history');
    } catch (error) {
      console.error("Order submission failed", error);
      alert("Failed to submit order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
      {/* Header */}
      <button 
        onClick={() => navigate('/user/marketplace')}
        className="flex items-center text-sm font-bold text-slate-400 hover:text-primary-500 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Marketplace
      </button>

      {vendor && (
        <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 shadow-premium ring-1 ring-slate-100 mb-12 flex flex-col md:flex-row gap-8 items-center">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl md:rounded-[2.5rem] overflow-hidden flex-shrink-0 bg-slate-50 border border-slate-100 shadow-inner">
            <img 
              src={vendor.image_url || `https://images.unsplash.com/photo-${1580000000000 + (vendor.id * 1000)}?auto=format&fit=crop&w=400&h=400&q=80`} 
              alt={vendor.shop_name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <h1 className="text-2xl md:text-4xl font-display font-black text-slate-900 uppercase tracking-tight">
                {vendor.shop_name}
              </h1>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-xl flex items-center gap-1">
                  <span className="text-sm md:text-lg font-black">{vendor.rating}</span>
                  <Star className="w-3 h-3 md:w-4 md:h-4 fill-emerald-700" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">({vendor.reviews} Reviews)</span>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-x-6 gap-y-2 text-slate-500 font-medium text-xs md:text-base">
              <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary-500" /> {vendor.area}</p>
              <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" /> {vendor.avg_response_time}m Delivery</p>
              <p className="flex items-center gap-2 text-emerald-600"><ShieldCheck className="w-4 h-4" /> Verified</p>
            </div>
          </div>
          <div className="hidden md:block flex-shrink-0">
             <Button 
               variant="secondary" 
               className="rounded-2xl px-8 h-14 bg-slate-900 text-white border-none hover:bg-slate-800"
               onClick={() => setShowCart(true)}
             >
               <ShoppingBag className="w-5 h-5 mr-2" /> View Cart ({cart.length})
             </Button>
          </div>
        </div>
      )}

      {/* Vendor Owner Details */}
      {vendor && vendor.user && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-slate-50 to-primary-50 rounded-[3rem] p-8 md:p-12 shadow-premium ring-1 ring-slate-100 mb-12 border border-primary-200"
        >
          <h3 className="text-lg font-bold text-slate-900 mb-6 uppercase tracking-widest">
            About the Owner
          </h3>
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            {vendor.user.avatar_url && (
              <div className="w-32 h-32 rounded-[2rem] overflow-hidden flex-shrink-0 bg-white border border-slate-200 shadow-md">
                <img
                  src={vendor.user.avatar_url}
                  alt={vendor.user.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 text-center md:text-left">
              <h4 className="text-2xl font-bold text-slate-900 mb-2">
                {vendor.user.name}
              </h4>
              {vendor.user.organization_name && (
                <p className="text-primary-600 font-bold mb-3">
                  {vendor.user.organization_name}
                </p>
              )}
              {vendor.user.bio && (
                <p className="text-slate-700 mb-4 leading-relaxed">
                  {vendor.user.bio}
                </p>
              )}
              <div className="flex flex-wrap gap-6 text-sm font-medium text-slate-600">
                {vendor.user.phone && (
                  <p className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 bg-primary-500 rounded-full"></span>
                    {vendor.user.phone}
                  </p>
                )}
                {vendor.user.city && (
                  <p className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 bg-primary-500 rounded-full"></span>
                    {vendor.user.city}
                  </p>
                )}
                {vendor.verification_status === 'VERIFIED' && (
                  <p className="flex items-center gap-2 text-emerald-600 font-bold">
                    <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    Verified Provider
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Catalogue */}
      <div className="space-y-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-2xl font-display font-black text-slate-900 uppercase tracking-tight">
            Product <span className="text-primary-500">Catalogue</span>
          </h2>
          <div className="flex gap-4">
            {['Medical', 'Emergency', 'Relief'].map(tab => (
              <button key={tab} className="text-sm font-black text-slate-400 hover:text-primary-500 uppercase tracking-widest transition-colors">
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {catalogue.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
               <Zap className="w-12 h-12 text-slate-200 mx-auto mb-4" />
               <p className="text-slate-500 font-bold uppercase text-sm tracking-widest">No products available in this store</p>
            </div>
          ) : (
            catalogue.map((item) => (
              <motion.div key={item.id} layout>
                <Card className="group rounded-[2.5rem] border-none shadow-premium hover:shadow-2xl transition-all duration-500 overflow-hidden bg-white flex flex-col h-full">
                  <div className="aspect-square relative overflow-hidden bg-slate-50">
                    <img 
                      src={item.image_url || `https://images.unsplash.com/photo-${1587854692152-cbe660dbde88}?w=400&h=400&fit=crop`} 
                      alt={item.resource_name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-white/90 text-slate-900 border-none shadow-lg backdrop-blur-sm">
                        ₹{item.price}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-8 flex flex-col flex-1">
                    <div className="mb-4">
                      <h3 className="text-xl font-display font-black text-slate-900 uppercase tracking-tight mb-2">
                        {item.resource_name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                        {item.description || "Medical-grade equipment for healthcare and clinical use."}
                      </p>
                    </div>
                    
                    <div className="mt-auto space-y-6">
                      <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <span>Available Stock</span>
                        <span className="text-primary-500">{item.quantity} units</span>
                      </div>
                      
                      <Button 
                        onClick={() => addToCart(item)}
                        disabled={item.quantity <= 0}
                        className="w-full rounded-2xl h-12 bg-primary-500 hover:bg-primary-600 shadow-lg shadow-primary-500/20"
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add to Order
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Cart Sidebar/Overlay */}
      <AnimatePresence>
        {showCart && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCart(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-primary-50 text-primary-500 rounded-xl flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5" />
                   </div>
                   <h3 className="text-xl font-display font-black text-slate-900 uppercase tracking-tight">Your Cart</h3>
                </div>
                <button onClick={() => setShowCart(false)} className="text-slate-400 hover:text-slate-600">
                   <Minus className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                     <ShoppingBag className="w-16 h-16 text-slate-100" />
                     <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Cart is empty</p>
                     <Button variant="secondary" onClick={() => setShowCart(false)}>Browse Products</Button>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex gap-4 group">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-50 flex-shrink-0">
                         <img src={item.image_url} alt={item.resource_name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 space-y-2">
                         <div className="flex justify-between">
                           <h4 className="text-sm font-black text-slate-900 uppercase truncate">{item.resource_name}</h4>
                           <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                           </button>
                         </div>
                         <p className="text-xs font-bold text-primary-500 uppercase">₹{item.price}</p>
                         <div className="flex items-center gap-3 pt-1">
                            <button 
                              onClick={() => updateCartQuantity(item.id, -1)}
                              className="w-7 h-7 rounded-lg border border-slate-100 flex items-center justify-center hover:bg-slate-50"
                            >
                               <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-black w-4 text-center">{item.cartQuantity}</span>
                            <button 
                              onClick={() => updateCartQuantity(item.id, 1)}
                              className="w-7 h-7 rounded-lg border border-slate-100 flex items-center justify-center hover:bg-slate-50"
                            >
                               <Plus className="w-3 h-3" />
                            </button>
                         </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-8 border-t border-slate-100 space-y-6 bg-slate-50">
                  <div className="space-y-2">
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">Subtotal</span>
                        <span className="text-slate-900 font-bold">₹{cartTotal.toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">Delivery</span>
                        <span className="text-emerald-500 font-bold uppercase text-[10px]">Free</span>
                     </div>
                     <div className="flex justify-between text-xl pt-2 border-t border-slate-200">
                        <span className="font-display font-black text-slate-900 uppercase">Total</span>
                        <span className="font-display font-black text-primary-500 tracking-tight">₹{cartTotal.toLocaleString()}</span>
                     </div>
                  </div>
                  
                  <Button 
                    className="w-full h-14 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 text-sm font-black uppercase tracking-widest shadow-xl"
                    onClick={handleSubmitOrder}
                    loading={isSubmitting}
                  >
                    Confirm Order <Zap className="w-4 h-4 ml-2 fill-white" />
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                     <ShieldCheck className="w-3 h-3" /> Secure Marketplace Checkout
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Action Button for Mobile Cart */}
      {cart.length > 0 && !showCart && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[50]"
        >
          <Button 
            onClick={() => setShowCart(true)}
            className="rounded-full px-8 h-16 bg-primary-500 text-white shadow-2xl shadow-primary-500/40 border-4 border-white"
          >
             <ShoppingBag className="w-6 h-6 mr-3" /> 
             <span className="font-black uppercase tracking-widest">Cart · ₹{cartTotal.toLocaleString()}</span>
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default VendorStorefront;

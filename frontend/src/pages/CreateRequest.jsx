import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  Layers, 
  MapPin, 
  Clock, 
  FileText, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  Zap,
  Info
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';

const CreateRequest = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    resourceName: '',
    category: '',
    quantity: '',
    unit: 'pcs',
    location: '',
    urgency: 'medium',
    notes: ''
  });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();



  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  const { profile } = useAppContext();

  useEffect(() => {
    if (profile) {
      const fullAddress = [
        profile.addressLine1,
        profile.addressLine2,
        profile.locality,
        profile.city,
        profile.stateProvince,
        profile.postalCode,
        profile.countryCode
      ].filter(Boolean).join(', ');
      
      if (fullAddress) {
        setFormData(prev => ({
          ...prev,
          location: prev.location || fullAddress
        }));
      }
    }
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiService.createRequest(profile.accessToken, {
        resource_name: formData.resourceName,
        category: formData.category,
        quantity: parseInt(formData.quantity) || 0,
        location_lat: (profile.lat !== null && profile.lat !== undefined) ? profile.lat : 19.0760,
        location_lng: (profile.lng !== null && profile.lng !== undefined) ? profile.lng : 72.8777,
        city: profile.city || "Mumbai",
        urgency_level: formData.urgency,
        notes: formData.notes
      });

      // Check if this is an emergency request (high or critical urgency)
      const isEmergency = formData.urgency === 'high' || formData.urgency === 'critical';

      if (isEmergency) {
        // For emergency requests, use intelligent matching
        try {
          const emergencyQuery = `${formData.resourceName} - ${formData.notes || formData.category}`;
          const intelligentResults = await apiService.intelligentEmergencyMatch(
            profile.accessToken,
            response.id,
            emergencyQuery
          );

          // Navigate to results with intelligent matching data
          navigate(`/user/results?requestId=${response.id}`, {
            state: { intelligentResults }
          });
        } catch (intelligentError) {
          console.warn('Intelligent matching failed, falling back to regular matching:', intelligentError);
          // Fall back to regular matching if intelligent matching fails
          navigate(`/user/results?requestId=${response.id}`);
        }
      } else {
        // Regular matching for non-emergency requests
        navigate(`/user/results?requestId=${response.id}`);
      }
    } catch (error) {
      console.error('Failed to create request:', error);
      alert(error.message || 'Failed to create request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = async (e) => {
    const value = e.target.value;
    setFormData({ ...formData, resourceName: value });
    
    if (value.length >= 2) {
      try {
        const data = await apiService.getProductSuggestions(profile.accessToken, value);
        setSuggestions(data);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Failed to get suggestions:", error);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = async (suggestion) => {
    setFormData({ ...formData, resourceName: suggestion });
    setShowSuggestions(false);
    
    // Try to auto-detect category
    try {
      const data = await apiService.lookupProduct(profile.accessToken, suggestion);
      if (data.found && data.product.category) {
        const cat = data.product.category.toLowerCase();
        // Map backend category to frontend dropdown value if needed
        let mappedCat = '';
        if (cat.includes('medical')) mappedCat = 'medical';
        else if (cat.includes('pharma')) mappedCat = 'pharma';
        else if (cat.includes('consumables')) mappedCat = 'consumables';
        else if (cat.includes('emergency')) mappedCat = 'emergency';
        
        if (mappedCat) {
          setFormData(prev => ({ ...prev, category: mappedCat }));
        }
      }
    } catch (error) {
      console.error("Lookup failed:", error);
    }
  };

  const steps = [
    { title: 'Resource Details', icon: Package },
    { title: 'Location & Urgency', icon: MapPin },
    { title: 'Review & Submit', icon: CheckCircle2 },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight">Create Resource Request</h1>
        <p className="text-slate-500 font-medium">Specify your requirements and let EmpathI find the perfect matches.</p>
      </div>

      {/* Progress Stepper */}
      <div className="flex items-center justify-between px-2 mb-12">
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-3 relative">
               <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm ${
                 step > i + 1 ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 
                 step === i + 1 ? 'bg-primary-500 text-white shadow-primary-500/20' : 
                 'bg-white text-slate-400 border border-slate-100'
               }`}>
                 {step > i + 1 ? <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" /> : <s.icon className="w-4 h-4 md:w-5 md:h-5" />}
               </div>
               <span className={`text-[10px] md:text-xs font-black uppercase tracking-widest text-center ${step === i + 1 ? 'text-primary-600' : 'text-slate-400'}`}>
                 {s.title.split(' ')[0]}
               </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-grow h-0.5 md:h-1 mx-2 md:mx-4 rounded-full ${step > i + 1 ? 'bg-emerald-500' : 'bg-slate-100'}`}></div>
            )}
          </React.Fragment>
        ))}
      </div>

      <Card className="shadow-premium overflow-visible border-none ring-1 ring-slate-100 rounded-[2rem] sm:rounded-[2.5rem]">
        <CardContent className="p-6 md:p-12">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="relative">
                    <Input 
                      label="Resource Name" 
                      placeholder="e.g. Surgical Gloves, Oxygen" 
                      value={formData.resourceName}
                      onChange={handleNameChange}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                        {suggestions.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 font-medium transition-colors border-b border-slate-50 last:border-0"
                            onClick={() => handleSuggestionClick(s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 ml-0.5">Category</label>
                    <select 
                      className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 transition-all cursor-pointer"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                    >
                      <option value="">Select Category</option>
                      <option value="medical">Medical Equipment</option>
                      <option value="pharma">Pharmaceuticals</option>
                      <option value="consumables">Consumables</option>
                      <option value="emergency">Emergency Response</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <Input 
                    label="Quantity" 
                    type="number" 
                    placeholder="100" 
                    value={formData.quantity}
                    onChange={e => setFormData({...formData, quantity: e.target.value})}
                  />
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 ml-0.5">Unit</label>
                    <div className="flex gap-2">
                       {['pcs', 'kg', 'ltr', 'boxes'].map(u => (
                         <button
                           key={u}
                           type="button"
                           onClick={() => setFormData({...formData, unit: u})}
                           className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${
                             formData.unit === u ? 'bg-primary-500 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                           }`}
                         >
                           {u}
                         </button>
                       ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                   <Button size="lg" onClick={handleNext} disabled={!formData.resourceName} fullWidth>
                      Continue to Location <ArrowRight className="w-5 h-5 ml-2" />
                   </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <Input 
                   label="Delivery Location" 
                   placeholder="Enter hospital or facility address"
                   value={formData.location}
                   onChange={e => setFormData({...formData, location: e.target.value})}
                />

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-slate-700 ml-0.5">Urgency Level</label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: 'low', label: 'Routine', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                      { id: 'medium', label: 'Urgent', color: 'bg-amber-50 text-amber-700 border-amber-100' },
                      { id: 'high', label: 'CRITICAL', color: 'bg-rose-50 text-rose-700 border-rose-100' },
                    ].map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setFormData({...formData, urgency: u.id})}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                          formData.urgency === u.id ? 'border-primary-500 shadow-lg' : 'border-transparent ' + u.color
                        }`}
                      >
                        <span className="font-black text-sm uppercase tracking-wider">{u.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                   <label className="text-sm font-semibold text-slate-700 ml-0.5">Additional Notes</label>
                   <textarea 
                     className="w-full h-32 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500/30 outline-none transition-all"
                     placeholder="Specify special handling OR requirements..."
                     value={formData.notes}
                     onChange={e => setFormData({...formData, notes: e.target.value})}
                   />
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-between">
                   <Button variant="ghost" size="lg" onClick={handlePrev} className="order-2 sm:order-1">
                      <ArrowLeft className="w-5 h-5 mr-2" /> Back
                   </Button>
                   <Button size="lg" onClick={handleNext} disabled={!formData.location} className="order-1 sm:order-2" fullWidth>
                      Review Request <ArrowRight className="w-5 h-5 ml-2" />
                   </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="bg-primary-50 rounded-2xl p-6 border border-primary-100">
                   <div className="flex items-center space-x-3 mb-6">
                      <Zap className="w-6 h-6 text-primary-500" />
                      <h4 className="text-lg font-bold text-primary-900 uppercase tracking-tight">Summary of Request</h4>
                   </div>
                   
                   <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                      <div>
                        <p className="text-xs font-bold text-primary-600 uppercase mb-1">Resource</p>
                        <p className="font-black text-primary-900">{formData.resourceName}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-primary-600 uppercase mb-1">Quantity</p>
                        <p className="font-black text-primary-900">{formData.quantity} {formData.unit}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-primary-600 uppercase mb-1">Urgency</p>
                        <p className="font-black text-primary-900 capitalize">{formData.urgency}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-primary-600 uppercase mb-1">Category</p>
                        <p className="font-black text-primary-900 capitalize">{formData.category}</p>
                      </div>
                   </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-start space-x-4">
                   <Info className="w-6 h-6 text-slate-400 flex-shrink-0 mt-0.5" />
                   <p className="text-sm text-slate-500 leading-relaxed font-medium">
                      By submitting, our <strong>EmpathI Intelligence Layer</strong> will process this request 
                      against 500+ local providers to find matches with optimal stock freshness and proximity.
                   </p>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-between">
                   <Button variant="ghost" size="lg" onClick={handlePrev} className="order-2 sm:order-1">
                      <ArrowLeft className="w-5 h-5 mr-2" /> Back
                   </Button>
                   <Button size="lg" className="px-12 order-1 sm:order-2" onClick={handleSubmit} loading={loading} fullWidth>
                      Submit & Match <Zap className="w-5 h-5 ml-2" />
                   </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateRequest;

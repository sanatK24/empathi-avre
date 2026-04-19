import React, { useState } from 'react';
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
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  const { profile } = useAppContext();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await apiService.createRequest(profile.accessToken, {
        resource_name: formData.resourceName,
        category: formData.category,
        quantity: parseInt(formData.quantity) || 0,
        location_lat: 19.0760, // Default to Mumbai lat for now
        location_lng: 72.8777, // Default to Mumbai lng for now
        city: "Mumbai",
        urgency_level: formData.urgency,
        notes: formData.notes
      });
      
      // Navigate to results with the specific request ID
      navigate(`/requester/results?requestId=${response.id}`);
    } catch (error) {
      console.error('Failed to create request:', error);
      alert(error.message || 'Failed to create request. Please try again.');
    } finally {
      setLoading(false);
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
        <p className="text-slate-500 font-medium">Specify your requirements and let AVRE find the perfect vendor.</p>
      </div>

      {/* Progress Stepper */}
      <div className="flex items-center justify-between px-2 mb-12">
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-3 relative">
               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm ${
                 step > i + 1 ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 
                 step === i + 1 ? 'bg-primary-500 text-white shadow-primary-500/20' : 
                 'bg-white text-slate-400 border border-slate-100'
               }`}>
                 {step > i + 1 ? <CheckCircle2 className="w-6 h-6" /> : <s.icon className="w-5 h-5" />}
               </div>
               <span className={`text-xs font-bold uppercase tracking-widest ${step === i + 1 ? 'text-primary-600' : 'text-slate-400'}`}>
                 {s.title}
               </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-grow h-1 mx-4 rounded-full ${step > i + 1 ? 'bg-emerald-500' : 'bg-slate-100'}`}></div>
            )}
          </React.Fragment>
        ))}
      </div>

      <Card className="shadow-premium overflow-visible border-none ring-1 ring-slate-100">
        <CardContent className="p-8 md:p-12">
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
                  <Input 
                    label="Resource Name" 
                    placeholder="e.g. Surgical Gloves, Oxygen" 
                    value={formData.resourceName}
                    onChange={e => setFormData({...formData, resourceName: e.target.value})}
                  />
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

                <div className="pt-4 flex justify-end">
                   <Button size="lg" onClick={handleNext} disabled={!formData.resourceName}>
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

                <div className="pt-4 flex justify-between">
                   <Button variant="ghost" size="lg" onClick={handlePrev}>
                      <ArrowLeft className="w-5 h-5 mr-2" /> Back
                   </Button>
                   <Button size="lg" onClick={handleNext} disabled={!formData.location}>
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
                      By submitting, our <strong>Adaptive Relevance Engine</strong> will process this request 
                      against 500+ local vendors to find matches with optimal stock freshest and proximity.
                   </p>
                </div>

                <div className="pt-4 flex justify-between">
                   <Button variant="ghost" size="lg" onClick={handlePrev}>
                      <ArrowLeft className="w-5 h-5 mr-2" /> Back
                   </Button>
                   <Button size="lg" className="px-12" onClick={handleSubmit} loading={loading}>
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

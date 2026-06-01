import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import Button from '../components/ui/Button';
import { ArrowLeft, Upload, Loader2, AlertCircle, Brain, ShieldCheck, RefreshCw } from 'lucide-react';

function CampaignEditPage() {
  const { profile } = useAppContext();
  const navigate = useNavigate();
  const { id } = useParams();
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [taxonomy, setTaxonomy] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiData, setAiData] = useState(null);
  
  const [refining, setRefining] = useState(false);
  const [verificationDocument, setVerificationDocument] = useState(null);

  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem(`campaignEditData_${id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.city === undefined && profile?.city) parsed.city = profile.city;
        return parsed;
      } catch (e) {
        console.error("Failed to parse saved campaign data", e);
      }
    }
    return {
      title: '',
      description: '',
      category_id: '',
      subcategory_id: '',
      city: profile?.city || '',
      goal_amount: '',
      urgency_level: 'MEDIUM',
      cover_image: null,
      deadline: ''
    };
  });


  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        setFetching(true);
        const campaign = await apiService.getCampaignDetails(profile?.accessToken, id);
        
        // Ensure only the creator or admin can edit
        const isCreator = profile?.backendUserId ? Number(profile.backendUserId) === Number(campaign.created_by) : false;
        if (!isCreator && profile?.userRole !== 'admin') {
          setError('You are not authorized to edit this campaign.');
          setFetching(false);
          return;
        }

        const saved = localStorage.getItem(`campaignEditData_${id}`);
        let localData = null;
        if (saved) {
          try { localData = JSON.parse(saved); } catch(e) {}
        }

        if (!localData || !localData.title) {
            setFormData({
            title: campaign.title || '',
            description: campaign.description || '',
            category_id: campaign.category_id || '',
            category_name: campaign.category?.name || '',
            subcategory_id: campaign.subcategory_id || '',
            subcategory_name: campaign.subcategory?.name || '',
            city: campaign.city || '',
            goal_amount: campaign.goal_amount || '',
            urgency_level: campaign.urgency_level || 'MEDIUM',
            cover_image: campaign.cover_image || null,
            deadline: campaign.deadline ? new Date(campaign.deadline).toISOString().slice(0, 16) : '',
            verification_doc_url: campaign.verification_doc_url || null,
            verification_ocr_text: campaign.verification_ocr_text || ''
            });
        }
      } catch (err) {
        console.error('Failed to fetch campaign:', err);
        setError('Failed to load campaign details.');
      } finally {
        setFetching(false);
      }
    };

    if (id && profile?.accessToken) {
      fetchCampaign();
    }
  }, [id, profile?.accessToken, profile?.backendUserId, profile?.userRole]);
  

  useEffect(() => {
    if (id && !fetching) {
      localStorage.setItem(`campaignEditData_${id}`, JSON.stringify(formData));
    }
  }, [formData, id, fetching]);


  const urgencies = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  useEffect(() => {
    const fetchTaxonomy = async () => {
      try {
        const data = await apiService.getTaxonomy();
        const activeTaxonomy = data.filter(c => c.is_active);
        setTaxonomy(activeTaxonomy);
        if (activeTaxonomy.length > 0) {
            setFormData(prev => ({ 
              ...prev, 
              category_id: activeTaxonomy[0].id, 
              subcategory_id: activeTaxonomy[0].subcategories[0]?.id || '' 
            }));
        }
      } catch (err) {
        console.error("Failed to load taxonomy", err);
      }
    };
    fetchTaxonomy();
  }, []);

  const triggerAnalysis = async () => {
    if (formData.title.trim().length > 5 || formData.description.trim().length > 20) {
      setAnalyzing(true);
      try {
        const analysisData = {
          ...formData,
          goal_amount: formData.goal_amount ? parseFloat(formData.goal_amount) : null,
          category_id: formData.category_id ? parseInt(formData.category_id) : null,
          subcategory_id: formData.subcategory_id ? parseInt(formData.subcategory_id) : null
        };
        const res = await apiService.analyzeCampaign(profile.accessToken, analysisData);
        setAiSuggestions(res.suggestions);
        setAiData(res);
        
        setFormData(prev => {
          const updates = { ...prev };
          if (res.extracted_goal) {
            updates.goal_amount = res.extracted_goal.toString();
          }
          if (res.inferred_urgency) {
            updates.urgency_level = res.inferred_urgency;
          }
          if (res.predicted_category) {
            updates.category_name = res.predicted_category;
            const matchedCat = taxonomy.find(c => c.name.toLowerCase() === res.predicted_category.toLowerCase());
            if (matchedCat) {
              updates.category_id = matchedCat.id.toString();
            }
          }
          if (res.predicted_subcategory) {
            updates.subcategory_name = res.predicted_subcategory;
            const matchedCat = taxonomy.find(c => c.id === parseInt(updates.category_id || formData.category_id));
            if (matchedCat) {
              const matchedSub = matchedCat.subcategories.find(s => s.name.toLowerCase() === res.predicted_subcategory.toLowerCase());
              if (matchedSub) {
                updates.subcategory_id = matchedSub.id.toString();
              }
            }
          }
          return updates;
        });
      } catch(e) {
        console.warn("Auto-analyze failed:", e);
      } finally {
        setAnalyzing(false);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      triggerAnalysis();
    }, 1500);

    return () => clearTimeout(timer);
  }, [formData.title, formData.description, profile.accessToken, taxonomy]);



  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRefineDescription = async () => {
    if (!formData.description.trim()) return;
    setRefining(true);
    try {
      const res = await apiService.refineCampaignDescription(profile.accessToken, formData.description);
      setFormData(prev => ({ ...prev, description: res.refined_description }));
    } catch(e) {
      console.warn("Refine description failed:", e);
    } finally {
      setRefining(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, cover_image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocumentUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setVerificationDocument(file);
      // Fire and forget - OCR will process in background
      console.log(`Document ${file.name} selected for background OCR processing`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      setError('Campaign title is required');
      return;
    }
    if (!formData.description.trim()) {
      setError('Campaign description is required');
      return;
    }
    if (!formData.goal_amount || parseFloat(formData.goal_amount) <= 0) {
      setError('Campaign goal amount must be greater than 0');
      return;
    }
    if (!formData.city.trim()) {
      setError('Campaign city is required');
      return;
    }
    if (!formData.category_id) {
      setError('Category must be inferred from analysis. Please wait for AI analysis to complete.');
      return;
    }
    if (!formData.subcategory_id) {
      setError('Subcategory must be inferred from analysis. Please wait for AI analysis to complete.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const campaignData = {
        title: formData.title,
        description: formData.description,
        category_id: parseInt(formData.category_id),
        subcategory_id: parseInt(formData.subcategory_id),
        city: formData.city,
        goal_amount: parseFloat(formData.goal_amount),
        urgency_level: formData.urgency_level,
        cover_image: formData.cover_image,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        ai_analysis_data: JSON.stringify({ aiData })
      };

      
      const newCampaign = await apiService.updateCampaign(profile.accessToken, id, campaignData);
      
      // Queue OCR as background task if document is present
      if (verificationDocument) {
        try {
          // Upload document - OCR will process in background automatically
          await apiService.uploadCampaignDocument(profile.accessToken, id, verificationDocument);
          console.log('Document queued for background OCR processing');
        } catch (docErr) {
          console.warn("Document upload failed, but campaign updated:", docErr);
        }
      }

      localStorage.removeItem(`campaignEditData_${id}`);
      navigate(`/user/campaigns/${id}`);

    } catch (err) {
      console.error('Campaign creation failed:', err);
      setError(err.message || 'Failed to create campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
      {/* Main Form Column */}
      <div className="lg:col-span-2">
        {/* Header */}
        <div className="mb-6 md:mb-8">
        <button
          onClick={() => navigate('/user/campaigns')}
          className="flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-3 md:mb-4 font-bold text-sm md:text-base"
        >
          <ArrowLeft size={18} className="md:w-5 md:h-5" />
          Back to Campaigns
        </button>
        <div className="section-head">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Edit Campaign</h1>
          <p className="text-slate-600 text-sm md:text-base mt-2">Update the details of your campaign</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5 md:w-5 md:h-5" />
          <div className="text-red-800 text-sm">{error}</div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-5 md:p-8 space-y-4 md:space-y-6">
        {/* Campaign Title */}
        <div>
          <label className="block text-xs md:text-sm font-semibold text-slate-900 mb-1.5 md:mb-2">
            Campaign Title <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter campaign title"
            maxLength="200"
            className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
          <p className="text-[10px] md:text-xs text-slate-500 mt-1">{formData.title.length}/200 characters</p>
        </div>

        {/* Campaign Description */}
        <div>
          <div className="flex justify-between items-center mb-1.5 md:mb-2">
            <label className="block text-xs md:text-sm font-semibold text-slate-900">
              Description <span className="text-red-600">*</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="text-xs flex items-center gap-1 text-primary-600 font-medium bg-primary-50 px-2 py-1 rounded-md transition-colors">
                {analyzing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    AI is analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="w-3 h-3" />
                    Auto-Review Active
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={triggerAnalysis}
                disabled={analyzing}
                className="text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 p-1 rounded-md transition-colors disabled:opacity-50"
                title="Refresh AI Analysis"
              >
                <RefreshCw className={`w-3 h-3 ${analyzing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Describe your campaign, what help is needed, and the impact it will have"
            maxLength="5000"
            rows="5"
            className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none text-sm"
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-[10px] md:text-xs text-slate-500">{formData.description.length}/5000 characters</p>
            <button
              type="button"
              onClick={handleRefineDescription}
              disabled={refining || !formData.description.trim()}
              className="text-xs font-semibold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-full hover:bg-primary-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {refining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
              {refining ? 'Refining...' : 'AI Rewrite & Refine'}
            </button>
          </div>
          
          {aiSuggestions && (
            <div className="mt-3 p-3 md:p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-900 shadow-sm animate-fade-in">
              <p className="font-bold mb-1.5 flex items-center gap-1.5"><Brain className="w-4 h-4"/> AI Suggestions:</p>
              <p className="whitespace-pre-line leading-relaxed">{aiSuggestions}</p>
            </div>
          )}
        </div>

        {/* Cover Image */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            Cover Image
          </label>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              value=""
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {formData.cover_image ? (
              <div className="relative inline-block">
                <img
                  src={formData.cover_image}
                  alt="Cover preview"
                  className="h-40 mx-auto mb-2 rounded object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setFormData(prev => ({ ...prev, cover_image: null }));
                  }}
                  className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-colors z-10"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <p className="text-sm text-slate-600">Click to change image</p>
              </div>
            ) : (
              <div>
                <Upload size={32} className="mx-auto mb-2 text-slate-400" />
                <p className="text-sm font-medium text-slate-900">Click to upload image</p>
                <p className="text-xs text-slate-600">or drag and drop</p>
              </div>
            )}
          </div>
        </div>

        {/* Verification Document */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            Verification Documents (Optional)
          </label>
          <p className="text-xs text-slate-500 mb-3">
            Upload official documents (medical bills, estimates) to boost your campaign's Trust Score. Our AI will analyze them instantly to show you extracted insights.
          </p>
          <div className="border border-slate-300 rounded-lg p-4 bg-slate-50 relative">
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={handleDocumentUpload}
              value=""
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex items-center gap-3">
              <Upload size={20} className="text-slate-500" />
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {verificationDocument 
                    ? verificationDocument.name 
                    : formData.verification_doc_url 
                      ? 'Existing document uploaded'
                      : 'Select a document to upload...'}
                </p>
                <p className="text-xs text-slate-500">
                  {verificationDocument 
                    ? `${(verificationDocument.size / 1024 / 1024).toFixed(2)} MB` 
                    : formData.verification_doc_url 
                      ? <a href={formData.verification_doc_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline z-10 relative">View current document</a>
                      : 'PDF, JPG, PNG up to 5MB'}
                </p>
              </div>
              {verificationDocument && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setVerificationDocument(null);
                  }}
                  className="relative z-10 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              )}
            </div>
          </div>
          
          {/* OCR analysis now runs asynchronously in background after submission */}
        </div>

        {/* Campaign Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category - Editable with AI Inference */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Category <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="category_name"
                value={formData.category_name}
                onChange={handleInputChange}
                placeholder="Awaiting analysis..."
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
              {formData.category_id && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs text-indigo-600 font-medium">AI</span>
                </div>
              )}
            </div>
          </div>

          {/* Subcategory - Editable with AI Inference */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Subcategory <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="subcategory_name"
                value={formData.subcategory_name}
                onChange={handleInputChange}
                placeholder="Awaiting analysis..."
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
              {formData.subcategory_id && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs text-indigo-600 font-medium">AI</span>
                </div>
              )}
            </div>
          </div>
          
          {/* AI Rules Display (Full Width) */}
          <div className="md:col-span-2">
            {taxonomy.find(c => c.id === parseInt(formData.category_id))?.ai_rules.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 animate-fade-in shadow-inner">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-semibold text-slate-900 text-sm">Active AI Verification Pipelines</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {taxonomy.find(c => c.id === parseInt(formData.category_id))?.ai_rules.map(rule => (
                    <div key={rule.id} className="flex items-start gap-2 bg-white border border-slate-100 p-2.5 rounded-md shadow-sm">
                      <Brain className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-700">{rule.capability}</p>
                        <p className="text-[10px] text-slate-500 capitalize leading-tight mt-0.5">{rule.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Urgency Level */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Urgency Level <span className="text-red-600">*</span>
            </label>
            <select
              name="urgency_level"
              value={formData.urgency_level}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {urgencies.map(urgency => (
                <option key={urgency} value={urgency}>
                  {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              City <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              placeholder="Enter city name"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Goal Amount */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Goal Amount (₹) <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="goal_amount"
              value={formData.goal_amount}
              onChange={handleInputChange}
              placeholder="Enter campaign goal"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Deadline */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Campaign Deadline (Optional)
            </label>
            <input
              type="datetime-local"
              name="deadline"
              value={formData.deadline}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={() => navigate('/campaigns')}
            className="flex-1 px-6 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold shadow-lg shadow-primary-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating...
              </>
            ) : (
              'Update Campaign'
            )}
          </Button>
        </div>
      </form>
      </div>

      {/* AI Showcase Sidebar (Desktop Only) */}
      <div className="hidden lg:block relative">
        <div className="sticky top-24 bg-slate-900 rounded-xl shadow-2xl border border-slate-700 overflow-hidden font-mono text-xs flex flex-col h-[calc(100vh-120px)] max-h-[800px]">
          <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-400" />
              <span className="text-slate-200 font-bold tracking-wider">hf_services.py live log</span>
            </div>
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            </div>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-4 text-green-400 font-medium">
            <p className="text-slate-400 opacity-70">Initialize Hugging Face Inference API...</p>
            <p className="text-slate-400 opacity-70">Model: Qwen/Qwen2.5-1.5B-Instruct</p>
            
            {analyzing && (
              <div className="flex items-center gap-2 text-yellow-400 mt-4 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing campaign text in real-time...</span>
              </div>
            )}

            {aiData && !analyzing && (
              <div className="animate-fade-in space-y-2 mt-4">
                <p className="text-white font-bold">&gt; Analysis Complete.</p>
                <p className="text-slate-400">Extracted JSON Payload:</p>
                <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] text-emerald-300 overflow-x-auto shadow-inner">
{JSON.stringify(aiData, null, 2)}
                </pre>
                <div className="mt-2 space-y-1">
                  {aiData.extracted_goal && <p className="text-indigo-300 flex items-center gap-1.5"><ShieldCheck className="w-3 h-3"/> Auto-filled goal amount</p>}
                  {aiData.inferred_urgency && <p className="text-indigo-300 flex items-center gap-1.5"><ShieldCheck className="w-3 h-3"/> Auto-filled urgency level</p>}
                  {aiData.predicted_category && <p className="text-indigo-300 flex items-center gap-1.5"><ShieldCheck className="w-3 h-3"/> Auto-selected category</p>}
                </div>
              </div>
            )}

            {refining && (
              <div className="flex items-center gap-2 text-purple-400 mt-4 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Refining description using LLM copywriter...</span>
              </div>
            )}

            {/* OCR now runs asynchronously in background after campaign submission */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CampaignEditPage;

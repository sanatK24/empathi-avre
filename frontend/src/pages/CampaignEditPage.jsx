import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import Button from '../components/ui/Button';
import { ArrowLeft, Upload, Loader2, AlertCircle } from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';

function CampaignEditPage() {
  const { profile } = useAppContext();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  const [taxonomy, setTaxonomy] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    subcategory_id: '',
    city: '',
    goal_amount: '',
    urgency_level: 'MEDIUM',
    cover_image: null,
    deadline: '',
    verification_doc_url: null,
    verification_ocr_text: ''
  });

  const [verificationDocument, setVerificationDocument] = useState(null);
  const urgencies = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  useEffect(() => {
    const fetchTaxonomy = async () => {
      try {
        const data = await apiService.getTaxonomy();
        const activeTaxonomy = data.filter(c => c.is_active);
        setTaxonomy(activeTaxonomy);
      } catch (err) {
        console.error("Failed to load taxonomy", err);
      }
    };
    fetchTaxonomy();
  }, []);

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

        setFormData({
          title: campaign.title || '',
          description: campaign.description || '',
          category_id: campaign.category_id || '',
          subcategory_id: campaign.subcategory_id || '',
          city: campaign.city || '',
          goal_amount: campaign.goal_amount || '',
          urgency_level: campaign.urgency_level || 'MEDIUM',
          cover_image: campaign.cover_image || null,
          deadline: campaign.deadline ? new Date(campaign.deadline).toISOString().slice(0, 16) : '',
          verification_doc_url: campaign.verification_doc_url || null,
          verification_ocr_text: campaign.verification_ocr_text || ''
        });
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (e) => {
    const categoryId = parseInt(e.target.value);
    const selectedCategory = taxonomy.find(c => c.id === categoryId);
    setFormData(prev => ({
      ...prev,
      category_id: categoryId,
      subcategory_id: selectedCategory?.subcategories[0]?.id || ''
    }));
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
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, verification_doc_url: reader.result }));
      };
      reader.readAsDataURL(file);
      setVerificationDocument(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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

    try {
      setLoading(true);
      setError(null);

      const campaignData = {
        title: formData.title,
        description: formData.description,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        subcategory_id: formData.subcategory_id ? parseInt(formData.subcategory_id) : null,
        city: formData.city,
        goal_amount: parseFloat(formData.goal_amount),
        urgency_level: formData.urgency_level,
        cover_image: formData.cover_image,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        verification_doc_url: formData.verification_doc_url,
        verification_ocr_text: formData.verification_ocr_text
      };

      await apiService.updateCampaign(profile.accessToken, id, campaignData);
      navigate(`/user/campaigns/${id}`);
    } catch (err) {
      console.error('Campaign update failed:', err);
      setError(err.message || 'Failed to update campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (!window.confirm("Are you sure you want to close this campaign? It will be marked as completed and no longer accept donations.")) {
      return;
    }
    try {
      setLoading(true);
      await apiService.closeCampaign(profile.accessToken, id);
      navigate(`/user/campaigns/${id}`);
    } catch (err) {
      console.error('Failed to close campaign:', err);
      setError(err.message || 'Failed to close campaign.');
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("WARNING: Are you sure you want to completely delete this campaign? This action cannot be undone.")) {
      return;
    }
    try {
      setLoading(true);
      await apiService.deleteCampaign(profile.accessToken, id);
      navigate('/user/campaigns/my');
    } catch (err) {
      console.error('Failed to delete campaign:', err);
      setError(err.message || 'Failed to delete campaign.');
      setLoading(false);
    }
  };

  if (fetching) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <section className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-4 mb-3 md:mb-4">
          <button
            onClick={() => navigate('/user/campaigns/my')}
            className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-bold text-sm md:text-base"
          >
            <ArrowLeft size={18} className="md:w-5 md:h-5" />
            Back to Campaigns
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={() => navigate(`/user/campaigns/${id}`)}
            className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-bold text-sm md:text-base"
          >
            <ArrowLeft size={18} className="md:w-5 md:h-5" />
            Back to Campaign
          </button>
        </div>
        <div className="section-head">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Edit Campaign</h1>
          <p className="text-slate-600 text-sm md:text-base mt-2">Update the details of your campaign</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5 md:w-5 md:h-5" />
          <div className="text-red-800 text-sm">{error}</div>
        </div>
      )}

      {error === 'You are not authorized to edit this campaign.' ? null : (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-5 md:p-8 space-y-4 md:space-y-6">
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

          <div>
            <label className="block text-xs md:text-sm font-semibold text-slate-900 mb-1.5 md:mb-2">
              Description <span className="text-red-600">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your campaign, what help is needed, and the impact it will have"
              maxLength="5000"
              rows="5"
              className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none text-sm"
            />
            <p className="text-[10px] md:text-xs text-slate-500 mt-1">{formData.description.length}/5000 characters</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Cover Image
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {formData.cover_image ? (
                <div>
                  <img
                    src={formData.cover_image}
                    alt="Cover preview"
                    className="h-40 mx-auto mb-2 rounded object-cover"
                  />
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
              Upload official documents (medical bills, estimates) to boost your campaign's Trust Score.
            </p>
            <div className="border border-slate-300 rounded-lg p-4 bg-slate-50 relative">
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={handleDocumentUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex items-center gap-3">
                <Upload size={20} className="text-slate-500" />
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {verificationDocument ? verificationDocument.name : 'Select a document to upload...'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {verificationDocument ? `${(verificationDocument.size / 1024 / 1024).toFixed(2)} MB` : 'PDF, JPG, PNG up to 5MB'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Verification OCR Text */}
          <div>
            <label className="block text-xs md:text-sm font-semibold text-slate-900 mb-1.5 md:mb-2">
              Verification Text (Optional)
            </label>
            <textarea
              name="verification_ocr_text"
              value={formData.verification_ocr_text}
              onChange={handleInputChange}
              placeholder="Add additional verification details or extracted text from documents"
              maxLength="2000"
              rows="3"
              className="w-full px-3 md:px-4 py-2 md:py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none text-sm"
            />
            <p className="text-[10px] md:text-xs text-slate-500 mt-1">{formData.verification_ocr_text.length}/2000 characters</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Category <span className="text-red-600">*</span>
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleCategoryChange}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Select a category</option>
                {taxonomy.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Subcategory <span className="text-red-600">*</span>
              </label>
              <select
                name="subcategory_id"
                value={formData.subcategory_id}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Select a subcategory</option>
                {taxonomy.find(c => c.id === parseInt(formData.category_id))?.subcategories.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

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
                    {urgency.charAt(0) + urgency.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

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

          <div className="flex gap-3 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={() => navigate(`/user/campaigns/${id}`)}
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
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Danger Zone */}
      {!fetching && !error && (
        <div className="mt-12 bg-red-50 border border-red-200 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-red-700 flex items-center gap-2 mb-4">
            <AlertCircle size={20} />
            Danger Zone
          </h2>
          <p className="text-red-600 text-sm mb-6">
            These actions are irreversible. Please be certain before proceeding.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800 hover:border-red-300"
            >
              Close Campaign
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 bg-white border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
            >
              Close & Delete Campaign
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

export default CampaignEditPage;

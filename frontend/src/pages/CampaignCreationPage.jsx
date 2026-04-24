import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import Button from '../components/ui/Button';
import { ArrowLeft, Upload, Loader2, AlertCircle } from 'lucide-react';

function CampaignCreationPage() {
  const { profile } = useAppContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'medical',
    city: profile?.city || '',
    goal_amount: '',
    urgency_level: 'medium',
    cover_image: null,
    deadline: ''
  });

  const categories = ['medical', 'food', 'shelter', 'education', 'infrastructure', 'other'];
  const urgencies = ['low', 'medium', 'high', 'critical'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

    try {
      setLoading(true);
      setError(null);

      const campaignData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        city: formData.city,
        goal_amount: parseFloat(formData.goal_amount),
        urgency_level: formData.urgency_level,
        cover_image: formData.cover_image,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null
      };

      const newCampaign = await apiService.createCampaign(profile.accessToken, campaignData);
      navigate(`/campaigns/${newCampaign.id}`);
    } catch (err) {
      console.error('Campaign creation failed:', err);
      setError(err.message || 'Failed to create campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/user/campaigns')}
          className="flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-4 font-bold"
        >
          <ArrowLeft size={20} />
          Back to Campaigns
        </button>
        <div className="section-head">
          <h1 className="text-3xl font-bold text-slate-900">Create a Campaign</h1>
          <p className="text-slate-600 mt-2">Start a campaign to support your community and raise awareness</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 space-y-6">
        {/* Campaign Title */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            Campaign Title <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter campaign title"
            maxLength="200"
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-slate-500 mt-1">{formData.title.length}/200 characters</p>
        </div>

        {/* Campaign Description */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            Description <span className="text-red-600">*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Describe your campaign, what help is needed, and the impact it will have"
            maxLength="5000"
            rows="6"
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
          <p className="text-xs text-slate-500 mt-1">{formData.description.length}/5000 characters</p>
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

        {/* Campaign Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Category <span className="text-red-600">*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
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
              'Create Campaign'
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}

export default CampaignCreationPage;

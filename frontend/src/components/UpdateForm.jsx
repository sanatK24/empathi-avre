import React, { useState, useRef } from 'react';
import { Upload, X, Send } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import Button from './ui/Button';

const UpdateForm = ({ campaignId, onSuccess, onCancel }) => {
  const { profile } = useAppContext();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result;
        setImageUrl(base64);
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim()) {
      alert('Please enter update content');
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData = {
        content: content.trim(),
        image_url: imageUrl
      };

      const newUpdate = await apiService.createCampaignUpdate(
        profile.accessToken,
        campaignId,
        updateData
      );

      setContent('');
      setImageUrl(null);
      setImagePreview(null);
      onSuccess(newUpdate);
    } catch (err) {
      console.error('Failed to create update:', err);
      alert('Failed to create update. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Text Input */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share an update about your campaign..."
        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        rows={4}
        maxLength={2000}
      />

      {/* Character Count */}
      <div className="text-xs text-slate-500 text-right">
        {content.length}/2000
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="relative rounded-xl overflow-hidden max-h-64 bg-slate-100">
          <img
            src={imagePreview}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Image Upload */}
      {!imagePreview && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-primary-500 hover:bg-primary-50 transition-colors cursor-pointer"
        >
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">Click to upload image (optional)</p>
          <p className="text-xs text-slate-400">PNG, JPG, GIF up to 10MB</p>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          className="flex-1"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 flex items-center justify-center gap-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Posting...' : <>
            <Send size={16} />
            Post Update
          </>}
        </Button>
      </div>
    </form>
  );
};

export default UpdateForm;

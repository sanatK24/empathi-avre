import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { apiService } from '../services/apiService';

function SaveCampaignButton({ campaignId, token, onSaveChange }) {
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSaveToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setLoading(true);

      if (isSaved) {
        await apiService.unsaveCampaign(token, campaignId);
        setIsSaved(false);
      } else {
        await apiService.saveCampaign(token, campaignId);
        setIsSaved(true);
      }

      if (onSaveChange) {
        onSaveChange(!isSaved);
      }
    } catch (err) {
      console.error('Failed to toggle save:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSaveToggle}
      disabled={loading}
      className={`p-2 rounded-full transition-all ${
        isSaved
          ? 'bg-rose-100 text-rose-500 hover:bg-rose-200'
          : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      title={isSaved ? 'Remove from saved' : 'Save campaign'}
    >
      <Heart
        className="w-5 h-5"
        fill={isSaved ? 'currentColor' : 'none'}
        strokeWidth={2}
      />
    </button>
  );
}

export default SaveCampaignButton;

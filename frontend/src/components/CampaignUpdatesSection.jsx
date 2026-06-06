import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Pin, PinOff, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import UpdateCard from './UpdateCard';
import UpdateForm from './UpdateForm';
import CommentsModal from './CommentsModal';
import { handleImageError } from '../utils/imageUtils';
import Button from './ui/Button';
import { Card } from './ui/Card';
const CampaignUpdatesSection = ({ campaignId, isCreator, onUpdateCreated }) => {
  const { profile } = useAppContext();
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedUpdateForComments, setSelectedUpdateForComments] = useState(null);
  const [pinnedUpdate, setPinnedUpdate] = useState(null);
  useEffect(() => {
    fetchUpdates();
  }, [campaignId]);
  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const data = await apiService.getCampaignUpdates(profile.accessToken, campaignId);
      setUpdates(Array.isArray(data) ? data : []);
      const pinned = data?.find(u => u.is_pinned);
      setPinnedUpdate(pinned);
    } catch (err) {
      console.error('Failed to load updates:', err);
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  };
  const handleUpdateCreated = async (newUpdate) => {
    setShowForm(false);
    fetchUpdates();
    onUpdateCreated?.(newUpdate);
  };
  const handleLike = async (updateId, isLiked) => {
    try {
      if (isLiked) {
        await apiService.unlikeCampaignUpdate(profile.accessToken, campaignId, updateId);
      } else {
        await apiService.likeCampaignUpdate(profile.accessToken, campaignId, updateId);
      }
      fetchUpdates();
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };
  const handleDeleteUpdate = async (updateId) => {
    if (window.confirm('Are you sure you want to delete this update?')) {
      try {
        await apiService.deleteCampaignUpdate(profile.accessToken, campaignId, updateId);
        fetchUpdates();
      } catch (err) {
        console.error('Failed to delete update:', err);
      }
    }
  };
  const handleTogglePin = async (updateId, isPinned) => {
    try {
      await apiService.togglePinUpdate(profile.accessToken, campaignId, updateId);
      fetchUpdates();
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };
  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {}
      {pinnedUpdate && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary-50 to-rose-50 rounded-2xl p-6 border border-primary-200"
        >
          <div className="flex items-center gap-2 mb-3">
            <Pin size={16} className="text-primary-600 fill-primary-600" />
            <span className="text-sm font-bold text-primary-600 uppercase tracking-widest">Pinned Update</span>
          </div>
          <p className="text-slate-900 font-medium mb-2">{pinnedUpdate.content}</p>
          {pinnedUpdate.image_url && (
            <img
              src={pinnedUpdate.image_url}
              alt="Pinned update"
              className="w-full h-40 object-cover rounded-lg mb-3"
              onError={handleImageError('default')}
            />
          )}
          <p className="text-xs text-slate-500">
            {new Date(pinnedUpdate.created_at).toLocaleDateString()}
          </p>
        </motion.div>
      )}
      {}
      {isCreator && profile.isAuthenticated && (
        <Card className="p-6">
          {!showForm ? (
            <Button
              onClick={() => setShowForm(true)}
              className="w-full rounded-xl"
            >
              Post an Update
            </Button>
          ) : (
            <UpdateForm
              campaignId={campaignId}
              onSuccess={handleUpdateCreated}
              onCancel={() => setShowForm(false)}
            />
          )}
        </Card>
      )}
      {}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">
          Updates ({updates.length})
        </h3>
        {updates.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-slate-500">No updates yet</p>
          </Card>
        ) : (
          <AnimatePresence>
            {updates.map((update) => (
              <motion.div
                key={update.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                layout
              >
                <UpdateCard
                  update={update}
                  isCreator={isCreator}
                  currentUserId={profile.userId}
                  onLike={() => handleLike(update.id, update.is_liked_by_user)}
                  onCommentClick={() => setSelectedUpdateForComments(update)}
                  onDelete={() => handleDeleteUpdate(update.id)}
                  onTogglePin={() => handleTogglePin(update.id, update.is_pinned)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
      {}
      {selectedUpdateForComments && (
        <CommentsModal
          update={selectedUpdateForComments}
          campaignId={campaignId}
          onClose={() => setSelectedUpdateForComments(null)}
          onCommentAdded={fetchUpdates}
        />
      )}
    </div>
  );
};
export default CampaignUpdatesSection;

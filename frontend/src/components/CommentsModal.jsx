import React, { useState, useEffect } from 'react';
import { X, Send, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { handleImageError, getInitials } from '../utils/imageUtils';
const CommentsModal = ({ update, campaignId, onClose, onCommentAdded }) => {
  const { profile } = useAppContext();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const avatar = profile.avatar_url || profile.avatarUrl;
  const name = profile.name || profile.fullName;
  const fetchComments = async () => {
    try {
      setLoading(true);
      const data = await apiService.getUpdateComments(profile.accessToken, campaignId, update.id);
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load comments:', err);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchComments(); }, [update.id]);
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      await apiService.addUpdateComment(profile.accessToken, campaignId, update.id, { text: newComment });
      setNewComment('');
      fetchComments();
      onCommentAdded?.();
    } catch (err) {
      console.error('Failed to add comment:', err);
      alert('Failed to add comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleDeleteComment = async (commentId) => {
    if (window.confirm('Delete this comment?')) {
      try {
        await apiService.deleteUpdateComment(profile.accessToken, campaignId, update.id, commentId);
        fetchComments();
        onCommentAdded?.();
      } catch (err) {
        console.error('Failed to delete comment:', err);
      }
    }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl max-w-2xl w-full max-h-fit my-auto flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-900">Comments</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><X size={20} className="text-slate-600" /></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 p-6">
          {loading ? (
            <div className="text-center py-8"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div></div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 text-slate-500"><p>No comments yet</p><p className="text-sm">Be the first to comment!</p></div>
          ) : (
            comments.map((comment) => (
              <motion.div key={comment.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                {comment.user?.avatar_url ? <img src={comment.user.avatar_url} alt={comment.user.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" onError={handleImageError('default')} /> : <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0"><span className="text-xs font-black text-primary-600">{getInitials(comment.user?.name || '?')}</span></div>}
                <div className="flex-1">
                  <div className="bg-slate-100 rounded-xl p-3"><p className="font-bold text-sm text-slate-900">{comment.user?.name}</p><p className="text-sm text-slate-700 mt-1">{comment.text}</p></div>
                  <p className="text-xs text-slate-500 mt-1">{new Date(comment.created_at).toLocaleDateString()}</p>
                </div>
                {profile.userId === comment.user_id && (
                  <button onClick={() => handleDeleteComment(comment.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                )}
              </motion.div>
            ))
          )}
        </div>
        {profile.isAuthenticated && (
          <form onSubmit={handleAddComment} className="border-t border-slate-100 p-6 flex gap-3">
            {avatar ? <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" onError={handleImageError('default')} /> : <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0"><span className="text-xs font-black text-primary-600">{getInitials(name || '?')}</span></div>}
            <div className="flex-1 flex gap-2">
              <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." maxLength={500} className="flex-1 px-4 py-2 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <button type="submit" disabled={!newComment.trim() || isSubmitting} className="bg-primary-600 text-white p-2 rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><Send size={16} /></button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
};
export default CommentsModal;

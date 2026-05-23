import React from 'react';
import { Heart, MessageCircle, Share2, Pin, PinOff, Trash2, MoreVertical } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { motion } from 'framer-motion';
import { handleImageError, getInitials } from '../utils/imageUtils';

const UpdateCard = ({ 
  update, 
  isCreator, 
  currentUserId,
  onLike, 
  onCommentClick, 
  onDelete, 
  onTogglePin 
}) => {
  const [showMenu, setShowMenu] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const maxLength = 150;
  const isLongText = update.content && update.content.length > maxLength;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Campaign Update',
          text: update.content,
          url: window.location.href
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    }
  };

  return (
    <Card className="rounded-[2rem] overflow-hidden shadow-premium hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          {update.creator?.avatar_url ? (
            <img
              src={update.creator.avatar_url}
              alt={update.creator.name}
              className="w-10 h-10 rounded-full object-cover"
              onError={handleImageError('default')}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-black text-primary-600">{getInitials(update.creator?.name || '?')}</span>
            </div>
          )}
          <div>
            <p className="font-bold text-slate-900">{update.creator?.name}</p>
            <p className="text-xs text-slate-500">
              {new Date(update.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {isCreator && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <MoreVertical size={18} className="text-slate-600" />
            </button>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-slate-200 z-10"
              >
                <button
                  onClick={() => {
                    onTogglePin();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-sm font-medium"
                >
                  {update.is_pinned ? (
                    <>
                      <PinOff size={16} /> Unpin
                    </>
                  ) : (
                    <>
                      <Pin size={16} /> Pin to Top
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2 text-sm font-medium border-t border-slate-200"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Pinned Badge */}
      {update.is_pinned && (
        <div className="bg-primary-50 px-6 py-2 flex items-center gap-2">
          <Pin size={14} className="text-primary-600 fill-primary-600" />
          <span className="text-xs font-bold text-primary-600 uppercase">Pinned</span>
        </div>
      )}

      {/* Content */}
      <CardContent className="p-6 space-y-4">
        {/* WHEN NOT EXPANDED: Image first, then Truncated Text */}
        {!isExpanded ? (
          <>
            {update.image_url && (
              <img
                src={update.image_url}
                alt="Update"
                className="w-full rounded-xl max-h-96 object-cover cursor-pointer"
                onClick={() => isLongText && setIsExpanded(true)}
                onError={handleImageError('default')}
              />
            )}
            <div className="text-slate-800 leading-relaxed">
              {isLongText ? (
                <p>
                  {update.content.substring(0, maxLength)}...
                  <button onClick={() => setIsExpanded(true)} className="text-primary-600 font-bold ml-1 hover:underline">more</button>
                </p>
              ) : (
                <p>{update.content}</p>
              )}
            </div>
          </>
        ) : (
          /* WHEN EXPANDED: Full text first, then Full Image */
          <>
            <div className="text-slate-800 leading-relaxed">
              <p>{update.content}</p>
            </div>
            {update.image_url && (
              <img
                src={update.image_url}
                alt="Update"
                className="w-full rounded-xl object-contain cursor-pointer"
                onClick={() => setIsExpanded(false)}
                onError={handleImageError('default')}
              />
            )}
          </>
        )}

        {/* Stats */}
        <div className="flex gap-4 text-sm text-slate-600 pt-2">
          <span>{update.likes_count} likes</span>
          <span>{update.comments_count} comments</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={onLike}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-colors ${
              update.is_liked_by_user
                ? 'bg-rose-50 text-rose-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Heart
              size={18}
              className={update.is_liked_by_user ? 'fill-rose-600' : ''}
            />
            Like
          </button>

          <button
            onClick={onCommentClick}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <MessageCircle size={18} />
            Comment
          </button>

          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Share2 size={18} />
            Share
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UpdateCard;

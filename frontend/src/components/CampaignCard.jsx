import React from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import Badge from './ui/Badge';
import ProgressBar from './ProgressBar';
import Button from './ui/Button';
import { handleImageError } from '../utils/imageUtils';

const CampaignCard = ({ campaign, onClick }) => {
  const {
    id,
    title,
    description,
    cover_image,
    category,
    verified,
    trust_score = 0,
    urgency_level,
    raised_amount = 0,
    goal_amount = 1,
    creator_name,
    city
  } = campaign;

  const progress = Math.min(100, Math.round((raised_amount / goal_amount) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        onClick={() => onClick && onClick(id)}
        className="cursor-pointer h-full border-none ring-1 ring-slate-100 shadow-soft hover:shadow-xl transition-all overflow-hidden flex flex-col group"
      >
        <div className="relative h-48 bg-slate-100 overflow-hidden shrink-0">
          {cover_image ? (
            <img 
              src={cover_image} 
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={handleImageError(category)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <Heart className="w-12 h-12 text-white/50" />
            </div>
          )}
          
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {verified && (
              <Badge className="bg-emerald-500 text-white shadow-sm border-none backdrop-blur-md">
                ✓ Verified
              </Badge>
            )}
            {campaign.verification_status === 'FAILED' && (
              <Badge className="bg-red-500 text-white shadow-sm border-none backdrop-blur-md animate-pulse">
                ✗ Failed Verification
              </Badge>
            )}
            {trust_score > 0 && (
              <Badge className="bg-indigo-600 text-white shadow-sm border-none backdrop-blur-md font-bold">
                ★ {trust_score}% Trust
              </Badge>
            )}
            {urgency_level === 'critical' && (
              <Badge className="bg-red-500 text-white shadow-sm border-none backdrop-blur-md animate-pulse">
                Critical Need
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="p-5 flex flex-col flex-grow">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="secondary" className="bg-slate-100 text-slate-600">
              {category || 'General'}
            </Badge>
            <span className="text-xs font-bold text-slate-400">{city || 'Global'}</span>
          </div>

          <h3 className="font-bold text-lg text-slate-900 mb-2 line-clamp-2 leading-tight">
            {title}
          </h3>
          
          <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-grow">
            {description}
          </p>

          <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-bold text-slate-900">
                  ₹{Number(raised_amount).toLocaleString()}
                </span>
                <span className="text-slate-500">
                  of ₹{Number(goal_amount).toLocaleString()}
                </span>
              </div>
              <ProgressBar progress={progress} className="h-2" />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 truncate pr-2">
                By {creator_name || 'Community Member'}
              </span>
              <Button size="sm" variant="primary" className="shrink-0 px-4">
                View
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CampaignCard;

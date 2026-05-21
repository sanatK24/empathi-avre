import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, TrendingUp, AlertTriangle, Info, Clock, ExternalLink, RefreshCw, Bookmark } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { handleImageError } from '../utils/imageUtils';

const formatDistanceToNow = (date) => {
    if (!date) return 'Recently';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    if (seconds < 30) return "Just now";
    return Math.floor(seconds) + " seconds ago";
};

const CATEGORIES = ['All', 'Emergency', 'Disaster', 'Medical', 'Community', 'Civic'];

const SmartFeedPage = () => {
    const { profile } = useAppContext();
    const navigate = useNavigate();
    const [news, setNews] = useState([]);
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchNews = async () => {
        setLoading(true);
        try {
            const params = { city: profile.city || '' };
            if (activeCategory !== 'All') {
                params.category = activeCategory;
            }
            
            // Search override
            let feedData;
            if (searchQuery.trim()) {
                feedData = await apiService.searchNews(profile.accessToken, searchQuery);
            } else {
                feedData = await apiService.getPersonalizedNews(profile.accessToken, params);
            }
            setNews(feedData || []);
            
            // Trending
            const trendingData = await apiService.getTrendingNews(profile.accessToken);
            setTrending(trendingData || []);
        } catch (error) {
            console.error("Failed to load news feed", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchNews();
        }, 500); // debounce
        return () => clearTimeout(timeout);
    }, [activeCategory, searchQuery, profile.city]);

    const handleManualSync = async () => {
        setSyncing(true);
        try {
            await apiService.syncNews(profile.accessToken, profile.city);
            // Wait a sec for background job to fetch some
            setTimeout(fetchNews, 2000);
        } catch (error) {
            console.error("Sync failed", error);
        } finally {
            setSyncing(false);
        }
    };

    const renderNewsCard = (article, index, isTrending = false) => {
        const isCritical = article.urgency_score >= 0.7;
        const sentimentColor = article.sentiment === 'positive' ? 'text-emerald-600 bg-emerald-50' : 
                               article.sentiment === 'negative' ? 'text-rose-600 bg-rose-50' : 
                               'text-slate-600 bg-slate-100';

        return (
            <motion.div
                key={`${article.id}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white rounded-3xl p-5 shadow-sm border ${isCritical ? 'border-red-200 ring-1 ring-red-50' : 'border-slate-100'} hover:shadow-md transition-all group cursor-pointer relative overflow-hidden`}
                onClick={() => window.open(article.link, '_blank')}
            >
                {isCritical && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -mr-10 -mt-10 animate-pulse"></div>
                )}
                
                <div className="flex gap-4">
                    {/* Image Placeholder or Actual */}
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-slate-100 rounded-2xl shrink-0 overflow-hidden relative">
                        {article.image_url ? (
                            <img src={article.image_url} alt="News" className="w-full h-full object-cover group-hover:scale-105 transition-transform" onError={handleImageError('news')} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300">
                                {isCritical ? <AlertTriangle className="w-8 h-8 text-red-200" /> : <Info className="w-8 h-8" />}
                            </div>
                        )}
                        {isCritical && (
                            <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 shadow-lg shadow-red-500/30">
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                                Urgent
                            </div>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${sentimentColor}`}>
                                    {article.category}
                                </span>
                                {article.city && (
                                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-slate-400">
                                        <MapPin className="w-3 h-3" /> {article.city}
                                    </span>
                                )}
                            </div>
                            <h3 className="font-bold text-slate-900 leading-snug line-clamp-2 sm:line-clamp-3 mb-2 group-hover:text-blue-600 transition-colors">
                                {article.title}
                            </h3>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> 
                                    {article.published_at ? formatDistanceToNow(article.published_at) : 'Recently'}
                                </span>
                                <span className="text-[10px] font-black text-slate-400 hidden sm:block">•</span>
                                <span className="text-[10px] font-bold text-slate-500 truncate max-w-[100px]">{article.source}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" onClick={(e) => { e.stopPropagation(); /* Save Logic */ }}>
                                    <Bookmark className="w-4 h-4" />
                                </button>
                                <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="bg-slate-50 min-h-screen pb-20">
            {/* Massive Header */}
            <div className="bg-slate-900 text-white pt-10 md:pt-16 pb-16 md:pb-24 px-4 relative overflow-hidden rounded-b-[2rem] md:rounded-b-[3rem] shadow-xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -mr-48 -mt-48"></div>
                
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end gap-4 md:gap-6 relative z-10">
                    <div className="w-full md:w-auto">
                        <div className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1 md:py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] mb-2 md:mb-4 text-blue-300 border border-white/5">
                            <TrendingUp className="w-2.5 md:w-3 h-2.5 md:h-3" /> Live Community Intelligence
                        </div>
                        <h1 className="text-2xl md:text-5xl font-display font-black tracking-tight mb-1 md:mb-2">Community & Impact Feed</h1>
                        <p className="text-slate-400 font-medium max-w-xl text-xs md:text-base">
                            AI-curated updates, alerts, and community needs near {profile.city || 'you'}.
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-2 md:gap-3 w-full md:w-auto">
                        <button 
                            onClick={handleManualSync}
                            disabled={syncing}
                            className="text-[10px] md:text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl transition-colors flex items-center gap-1.5 md:gap-2 backdrop-blur-md"
                        >
                            <RefreshCw className={`w-3 md:w-4 h-3 md:h-4 ${syncing ? 'animate-spin text-blue-400' : ''}`} />
                            <span className="hidden md:inline">{syncing ? 'Scanning...' : 'Sync News'}</span><span className="md:hidden">{syncing ? 'Scanning...' : 'Sync'}</span>
                        </button>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3.5 md:w-4 h-3.5 md:h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search 'floods in Mumbai'..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 text-white placeholder:text-slate-500 rounded-lg md:rounded-xl py-2 md:py-3 pl-9 md:pl-10 pr-3 md:pr-4 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-md transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 -mt-8 md:-mt-10 relative z-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">
                    
                    {/* Main Feed */}
                    <div className="lg:col-span-8 space-y-4 md:space-y-6">
                        {/* Categories */}
                        <div className="flex gap-1.5 md:gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-2">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all shadow-sm ${
                                        activeCategory === cat 
                                        ? 'bg-blue-600 text-white shadow-blue-500/30' 
                                        : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-100'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Loading / Empty / Content */}
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="bg-white rounded-2xl md:rounded-3xl p-3 md:p-5 shadow-sm border border-slate-100 flex gap-3 md:gap-4 animate-pulse">
                                    <div className="w-16 md:w-24 h-16 md:h-24 md:sm:w-32 md:sm:h-32 bg-slate-100 rounded-xl md:rounded-2xl shrink-0"></div>
                                    <div className="flex-1 space-y-2 md:space-y-3 py-1 md:py-2">
                                        <div className="h-3 md:h-4 bg-slate-100 w-1/4 rounded"></div>
                                        <div className="h-3 md:h-4 bg-slate-100 w-full rounded"></div>
                                        <div className="h-3 md:h-4 bg-slate-100 w-3/4 rounded"></div>
                                    </div>
                                </div>
                            ))
                        ) : news.length === 0 ? (
                            <div className="text-center py-12 md:py-20 bg-white rounded-2xl md:rounded-3xl border border-dashed border-slate-200">
                                <Info className="w-8 md:w-12 h-8 md:h-12 text-slate-200 mx-auto mb-3 md:mb-4" />
                                <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1">No News Found</h3>
                                <p className="text-xs md:text-sm text-slate-500 max-w-sm mx-auto px-2">
                                    We couldn't find any relevant updates for "{searchQuery || activeCategory}" right now. Check back later or hit sync.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3 md:space-y-4">
                                <AnimatePresence>
                                    {news.map((article, i) => renderNewsCard(article, i))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Breaking Sidebar Block */}
                        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 sticky top-24">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute"></div>
                                <div className="w-2 h-2 rounded-full bg-red-500 relative"></div>
                                <h3 className="font-black text-slate-900 tracking-tight text-lg">Top Emergencies</h3>
                            </div>
                            
                            <div className="space-y-5">
                                {trending.slice(0,5).map((article, i) => (
                                    <div key={i} className="group cursor-pointer" onClick={() => window.open(article.link, '_blank')}>
                                        <h4 className="text-sm font-bold text-slate-800 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2 mb-1.5">
                                            {article.title}
                                        </h4>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded-md">
                                                {article.city || 'Global'}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-bold">{formatDistanceToNow(article.published_at)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-6 pt-6 border-t border-slate-100">
                                <button 
                                    className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest rounded-xl transition-colors"
                                    onClick={() => navigate('/emergency')}
                                >
                                    Open Emergency Hub
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SmartFeedPage;

import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  MessageSquare,
  Share2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Plus,
  ChevronUp,
  ChevronDown,
  Upload,
  X,
  Sparkles,
  Check
} from 'lucide-react';
import { Video } from '../../types.ts';
import { apiRequest, uploadMedia } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export const ReelsView: React.FC = () => {
  const { user, authModal } = useAuth();
  const [reels, setReels] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Upload Modal state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reelTitle, setReelTitle] = useState('');
  const [reelDesc, setReelDesc] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const fetchReels = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ reels: Video[]; pagination?: any } | Video[]>('/videos/reels');
      if (res.success && res.data) {
        if (Array.isArray(res.data)) {
          setReels(res.data);
        } else if (res.data && Array.isArray((res.data as any).reels)) {
          setReels((res.data as any).reels);
        } else {
          setReels([]);
        }
      } else {
        setReels([]);
      }
    } catch (err) {
      console.error('Failed to load reels:', err);
      setReels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReels();
  }, []);

  const currentReel = reels[currentIndex];

  const handleNext = () => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsPlaying(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsPlaying(true);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleLike = async () => {
    if (!user) {
      authModal.open('login');
      return;
    }
    if (!currentReel) return;

    const res = await apiRequest<{ likesCount: number; isLiked: boolean }>(
      `/videos/${currentReel.id}/react`,
      { method: 'POST' }
    );

    if (res.success && res.data) {
      setReels(prev =>
        prev.map((r, i) =>
          i === currentIndex
            ? { ...r, likes_count: res.data!.likesCount, isLiked: res.data!.isLiked }
            : r
        )
      );
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadMedia(file, 'reels');
      if (url) {
        setVideoUrl(url);
      }
    } catch (err: any) {
      alert(err.message || 'Video upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      authModal.open('login');
      return;
    }
    if (!videoUrl) {
      alert('Please upload a short video');
      return;
    }

    const res = await apiRequest('/videos/reels', {
      method: 'POST',
      body: {
        title: reelTitle,
        description: reelDesc,
        videoUrl,
        duration: 30
      }
    });

    if (res.success) {
      setUploadOpen(false);
      setReelTitle('');
      setReelDesc('');
      setVideoUrl('');
      fetchReels();
    } else {
      alert(res.message || 'Failed to publish reel');
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 max-w-4xl mx-auto w-full">
      {/* Top Header Row with Upload Trigger */}
      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Developer Reels
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white">
              Shorts
            </span>
          </h2>
          <p className="text-xs text-slate-500">Fast dev tips, setup tours & demos</p>
        </div>

        <button
          onClick={() => {
            if (!user) authModal.open('login');
            else setUploadOpen(true);
          }}
          className="flex items-center space-x-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Reel</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">Loading reels...</div>
      ) : reels.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 max-w-md">
          <Sparkles className="w-10 h-10 text-sky-500 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 dark:text-white">No Reels Yet</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">Be the first to share a developer quick reel!</p>
          <button
            onClick={() => setUploadOpen(true)}
            className="px-4 py-2 bg-sky-600 text-white text-xs font-semibold rounded-xl"
          >
            Create Reel
          </button>
        </div>
      ) : (
        <div className="relative w-full max-w-sm sm:max-w-md h-[78vh] max-h-[720px] rounded-3xl overflow-hidden bg-black shadow-2xl flex items-center justify-center">
          {/* Main Video Element */}
          <video
            ref={videoRef}
            src={currentReel.video_url}
            autoPlay
            loop
            playsInline
            muted={isMuted}
            onClick={togglePlay}
            className="w-full h-full object-cover cursor-pointer"
          />

          {/* Pause overlay icon */}
          {!isPlaying && (
            <div
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer z-10"
            >
              <div className="w-16 h-16 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-xs">
                <Play className="w-8 h-8 fill-white ml-1" />
              </div>
            </div>
          )}

          {/* Right Floating Actions Column */}
          <div className="absolute right-3 bottom-16 z-20 flex flex-col items-center space-y-4">
            {/* Like */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleLike}
                className={`p-3 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md transition-colors ${
                  currentReel.isLiked ? 'text-rose-500' : 'text-white'
                }`}
              >
                <Heart className={`w-6 h-6 ${currentReel.isLiked ? 'fill-rose-500' : ''}`} />
              </button>
              <span className="text-[11px] font-bold text-white drop-shadow-sm mt-1">
                {currentReel.likes_count}
              </span>
            </div>

            {/* Comment */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => alert('Reel comments coming up')}
                className="p-3 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white transition-colors"
              >
                <MessageSquare className="w-6 h-6" />
              </button>
              <span className="text-[11px] font-bold text-white drop-shadow-sm mt-1">
                {currentReel.comments_count}
              </span>
            </div>

            {/* Share */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleShare}
                className="p-3 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white transition-colors"
              >
                {copiedLink ? <Check className="w-6 h-6 text-emerald-400" /> : <Share2 className="w-6 h-6" />}
              </button>
              <span className="text-[11px] font-bold text-white drop-shadow-sm mt-1">
                {copiedLink ? 'Copied' : 'Share'}
              </span>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-3 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white transition-colors"
            >
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>
          </div>

          {/* Vertical Navigation Arrows */}
          <div className="absolute top-4 right-4 z-20 flex flex-col space-y-1">
            <button
              disabled={currentIndex === 0}
              onClick={handlePrev}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white disabled:opacity-30 backdrop-blur-xs"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <button
              disabled={currentIndex === reels.length - 1}
              onClick={handleNext}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white disabled:opacity-30 backdrop-blur-xs"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Bottom Reel Author & Caption Overlay */}
          <div className="absolute left-4 bottom-4 right-16 z-20 text-white">
            <div className="flex items-center space-x-2.5 mb-2">
              <img
                src={currentReel.author?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${currentReel.author?.username || 'user'}`}
                alt=""
                className="w-9 h-9 rounded-full object-cover border-2 border-white/60"
              />
              <div>
                <span className="text-xs font-bold text-white drop-shadow-xs">
                  {currentReel.author?.full_name}
                </span>
                <span className="text-[10px] text-white/80 block -mt-0.5">
                  @{currentReel.author?.username}
                </span>
              </div>
            </div>

            <h3 className="text-sm font-semibold text-white drop-shadow-sm line-clamp-2">
              {currentReel.title}
            </h3>
            {currentReel.description && (
              <p className="text-xs text-white/80 line-clamp-1 mt-0.5">{currentReel.description}</p>
            )}
          </div>
        </div>
      )}

      {/* UPLOAD REEL MODAL */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Upload Short Reel</h3>
              <button onClick={() => setUploadOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReel} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reel Title
                </label>
                <input
                  type="text"
                  required
                  value={reelTitle}
                  onChange={e => setReelTitle(e.target.value)}
                  placeholder="e.g., 3 CSS Tricks in 30 Seconds"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description / Tags
                </label>
                <textarea
                  rows={2}
                  value={reelDesc}
                  onChange={e => setReelDesc(e.target.value)}
                  placeholder="#css #webdev #frontend"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Video File (MP4/WebM)
                </label>
                <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-sky-500 transition-colors">
                  <Upload className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {uploading ? 'Uploading to storage...' : videoUrl ? 'Video Ready' : 'Click to select video'}
                  </span>
                  <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                </label>
              </div>

              <button
                type="submit"
                disabled={uploading || !videoUrl || !reelTitle.trim()}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                Publish Reel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

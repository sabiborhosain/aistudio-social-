import React, { useState, useEffect, useRef } from 'react';
import { Play, Plus, Search, Eye, ThumbsUp, X, Upload, Tv } from 'lucide-react';
import { Video } from '../../types.ts';
import { apiRequest, uploadMedia } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { AudioTrackSelector } from './AudioTrackSelector.tsx';

export const VideosView: React.FC = () => {
  const { user, authModal } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Active playing video modal
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);

  // Upload modal
  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbUrl, setThumbUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<Video[]>('/videos/catalog');
      if (res.success && res.data) {
        setVideos(Array.isArray(res.data) ? res.data : []);
      } else {
        setVideos([]);
      }
    } catch (err) {
      console.error('Failed to load videos:', err);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleUploadVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadMedia(file, 'videos');
      if (url) setVideoUrl(url);
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadThumb = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadMedia(file, 'thumbnails');
      if (url) setThumbUrl(url);
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      authModal.open('login');
      return;
    }

    const res = await apiRequest('/videos/catalog', {
      method: 'POST',
      body: {
        title,
        description,
        videoUrl,
        thumbnailUrl: thumbUrl || null,
        duration: 360
      }
    });

    if (res.success) {
      setUploadOpen(false);
      setTitle('');
      setDescription('');
      setVideoUrl('');
      setThumbUrl('');
      fetchVideos();
    } else {
      alert(res.message || 'Failed to publish video');
    }
  };

  const safeVideos = Array.isArray(videos) ? videos : [];
  const filteredVideos = safeVideos.filter(v =>
    v.title?.toLowerCase().includes(search.toLowerCase()) ||
    (v.description && v.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="w-full max-w-5xl mx-auto py-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Tv className="w-5 h-5 text-sky-500" />
            Developer Tech Tutorials & Deep Dives
          </h2>
          <p className="text-xs text-slate-500">
            System design, language masterclasses, and architecture walkthroughs
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter tutorials..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl border-none text-slate-900 dark:text-white"
            />
          </div>

          <button
            onClick={() => {
              if (!user) authModal.open('login');
              else setUploadOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Video</span>
          </button>
        </div>
      </div>

      {/* Videos Grid */}
      {loading ? (
        <div className="text-center py-20 text-xs text-slate-400">Loading video catalog...</div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Tv className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">No Videos Found</h3>
          <p className="text-xs text-slate-400 mt-1">Upload tutorials to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVideos.map(video => (
            <div
              key={video.id}
              onClick={() => setActiveVideo(video)}
              className="group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs hover:border-sky-500/50 hover:shadow-md transition-all cursor-pointer flex flex-col"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video bg-slate-950 overflow-hidden">
                <img
                  src={
                    video.thumbnail_url ||
                    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=60'
                  }
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />

                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 text-white font-mono text-[10px] font-bold">
                  {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                </div>

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-sky-600/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="p-3.5 flex items-start space-x-3 flex-1">
                <img
                  src={video.author?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${video.author?.username || 'user'}`}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-sky-500 transition-colors">
                    {video.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {video.author?.full_name}
                  </p>
                  <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1">
                    <span>{video.views_count} views</span>
                    <span>•</span>
                    <span>{new Date(video.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ACTIVE VIDEO PLAYER MODAL */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="relative aspect-video bg-black">
              <video
                ref={videoPlayerRef}
                src={activeVideo.video_url}
                controls
                autoPlay
                className="w-full h-full"
              />
              <button
                onClick={() => setActiveVideo(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors z-20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              {/* Multi-language audio track selector */}
              <AudioTrackSelector videoId={activeVideo.id} videoRef={videoPlayerRef} />

              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {activeVideo.title}
              </h3>

              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-3">
                  <img
                    src={activeVideo.author?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${activeVideo.author?.username || 'user'}`}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      {activeVideo.author?.full_name}
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      @{activeVideo.author?.username}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs text-slate-500">
                  <span className="flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span>{activeVideo.views_count} views</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <ThumbsUp className="w-4 h-4" />
                    <span>{activeVideo.likes_count} likes</span>
                  </span>
                </div>
              </div>

              {activeVideo.description && (
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                  {activeVideo.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD VIDEO MODAL */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Upload Developer Video</h3>
              <button onClick={() => setUploadOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVideo} className="space-y-3.5 pt-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Video Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Building an Event-Driven Architecture with Go & Kafka"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Overview of topics covered in this masterclass..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Video File
                  </label>
                  <label className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:border-sky-500">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-[11px] text-slate-500 truncate max-w-[120px]">
                      {videoUrl ? 'Video Ready' : 'Select Video'}
                    </span>
                    <input type="file" accept="video/*" onChange={handleUploadVideoFile} className="hidden" />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Thumbnail Image
                  </label>
                  <label className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:border-sky-500">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-[11px] text-slate-500 truncate max-w-[120px]">
                      {thumbUrl ? 'Thumb Ready' : 'Select Photo'}
                    </span>
                    <input type="file" accept="image/*" onChange={handleUploadThumb} className="hidden" />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading || !videoUrl || !title.trim()}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 mt-2"
              >
                Publish Tutorial
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

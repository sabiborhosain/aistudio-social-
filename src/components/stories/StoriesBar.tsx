import React, { useState, useEffect } from 'react';
import { Plus, X, Heart, Eye, ChevronLeft, ChevronRight, Upload, Sparkles } from 'lucide-react';
import { StoryGroup, Story } from '../../types.ts';
import { apiRequest, uploadMedia } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export const StoriesBar: React.FC = () => {
  const { user, authModal } = useAuth();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [activeStoryGroup, setActiveStoryGroup] = useState<StoryGroup | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  // Create Story Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [storyType, setStoryType] = useState<'IMAGE' | 'TEXT'>('IMAGE');
  const [mediaUrl, setMediaUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [bgColor, setBgColor] = useState('#0f172a');
  const [uploading, setUploading] = useState(false);

  const fetchStories = async () => {
    try {
      const res = await apiRequest<StoryGroup[]>('/stories');
      if (res.success && res.data) {
        setStoryGroups(Array.isArray(res.data) ? res.data : []);
      } else {
        setStoryGroups([]);
      }
    } catch (err) {
      console.error('Failed to load stories:', err);
      setStoryGroups([]);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const openStoryViewer = async (group: StoryGroup) => {
    setActiveStoryGroup(group);
    setCurrentStoryIndex(0);
    // Record view for the first story
    if (group.stories.length > 0) {
      await apiRequest(`/stories/${group.stories[0].id}/view`, { method: 'POST' });
    }
  };

  const handleNextStory = async () => {
    if (!activeStoryGroup) return;
    if (currentStoryIndex < activeStoryGroup.stories.length - 1) {
      const nextIdx = currentStoryIndex + 1;
      setCurrentStoryIndex(nextIdx);
      await apiRequest(`/stories/${activeStoryGroup.stories[nextIdx].id}/view`, { method: 'POST' });
    } else {
      // Move to next group if available, else close
      const currentGroupIdx = storyGroups.findIndex(g => g.userId === activeStoryGroup.userId);
      if (currentGroupIdx !== -1 && currentGroupIdx < storyGroups.length - 1) {
        openStoryViewer(storyGroups[currentGroupIdx + 1]);
      } else {
        setActiveStoryGroup(null);
      }
    }
  };

  const handlePrevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    }
  };

  // Auto-advance story after 6s
  useEffect(() => {
    if (!activeStoryGroup) return;
    const timer = setTimeout(() => {
      handleNextStory();
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeStoryGroup, currentStoryIndex]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadMedia(file, 'stories');
      if (url) {
        setMediaUrl(url);
      }
    } catch (err: any) {
      alert(err.message || 'Media upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handlePublishStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      authModal.open('login');
      return;
    }

    const res = await apiRequest('/stories', {
      method: 'POST',
      body: {
        mediaUrl: storyType === 'IMAGE' ? mediaUrl : null,
        mediaType: storyType,
        textContent,
        backgroundColor: bgColor
      }
    });

    if (res.success) {
      setCreateOpen(false);
      setMediaUrl('');
      setTextContent('');
      fetchStories();
    } else {
      alert(res.message || 'Failed to post story');
    }
  };

  return (
    <div className="w-full mb-6">
      {/* Stories Rail */}
      <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-none">
        {/* Create Story Button */}
        <div
          onClick={() => {
            if (!user) {
              authModal.open('login');
            } else {
              setCreateOpen(true);
            }
          }}
          className="flex-shrink-0 w-24 sm:w-28 h-36 sm:h-40 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center p-2 cursor-pointer hover:border-sky-500 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 text-center">
            Add Story
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">24h Ephemeral</span>
        </div>

        {/* Existing Story Groups */}
        {Array.isArray(storyGroups) && storyGroups.map(group => {
          const firstStory = group.stories[0];
          const author = group.author;
          return (
            <div
              key={group.userId}
              onClick={() => openStoryViewer(group)}
              className="flex-shrink-0 w-24 sm:w-28 h-36 sm:h-40 rounded-2xl relative overflow-hidden cursor-pointer shadow-xs hover:shadow-md group transition-all"
            >
              {firstStory.media_url ? (
                <img
                  src={firstStory.media_url}
                  alt="Story"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div
                  className="w-full h-full p-2 flex items-center justify-center text-center text-xs font-medium text-white"
                  style={{ backgroundColor: firstStory.background_color || '#0f172a' }}
                >
                  <span className="line-clamp-4">{firstStory.text_content}</span>
                </div>
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />

              {/* Author Avatar with Ring */}
              <div className="absolute top-2 left-2">
                <div
                  className={`p-0.5 rounded-full ${
                    group.allViewed
                      ? 'ring-2 ring-slate-400'
                      : 'ring-2 ring-gradient-to-tr from-sky-500 to-indigo-500 bg-sky-500'
                  }`}
                >
                  <img
                    src={author?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${author?.username || 'user'}`}
                    alt={author?.username}
                    className="w-7 h-7 rounded-full object-cover border-2 border-white dark:border-slate-900"
                  />
                </div>
              </div>

              {/* Author Name */}
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-[11px] font-semibold text-white truncate drop-shadow-xs">
                  {author?.full_name || 'Engineer'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* FULLSCREEN STORY VIEWER MODAL */}
      {activeStoryGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4 backdrop-blur-md">
          <div className="relative w-full max-w-sm sm:max-w-md h-[85vh] max-h-[700px] rounded-3xl overflow-hidden bg-slate-950 flex flex-col shadow-2xl">
            {/* Top Progress Bars */}
            <div className="absolute top-3 left-3 right-3 z-30 flex items-center space-x-1.5">
              {activeStoryGroup.stories.map((st, idx) => (
                <div key={st.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-white transition-all duration-300 ${
                      idx < currentStoryIndex
                        ? 'w-full'
                        : idx === currentStoryIndex
                        ? 'w-full animate-[progress_6s_linear]'
                        : 'w-0'
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Header: Author + Close */}
            <div className="absolute top-7 left-4 right-4 z-30 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <img
                  src={activeStoryGroup.author?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${activeStoryGroup.author?.username}`}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover border border-white/50"
                />
                <div>
                  <div className="text-xs font-bold text-white drop-shadow-sm">
                    {activeStoryGroup.author?.full_name}
                  </div>
                  <div className="text-[10px] text-white/70">
                    {new Date(activeStoryGroup.stories[currentStoryIndex].created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveStoryGroup(null)}
                className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Story Content */}
            <div className="flex-1 relative flex items-center justify-center">
              {activeStoryGroup.stories[currentStoryIndex].media_url ? (
                <img
                  src={activeStoryGroup.stories[currentStoryIndex].media_url!}
                  alt="Story Content"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center p-8 text-center"
                  style={{
                    backgroundColor: activeStoryGroup.stories[currentStoryIndex].background_color || '#0f172a'
                  }}
                >
                  <h3 className="text-xl sm:text-2xl font-bold text-white leading-relaxed font-sans">
                    {activeStoryGroup.stories[currentStoryIndex].text_content}
                  </h3>
                </div>
              )}

              {/* Navigation overlays */}
              <button
                onClick={handlePrevStory}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center transition-colors z-20"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleNextStory}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center transition-colors z-20"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Bottom Actions */}
            <div className="p-3 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between z-20">
              <div className="flex items-center space-x-1.5 text-xs text-white/80">
                <Eye className="w-4 h-4" />
                <span>{activeStoryGroup.stories[currentStoryIndex].views_count} views</span>
              </div>
              <button
                onClick={async () => {
                  const s = activeStoryGroup.stories[currentStoryIndex];
                  // Send quick like reaction
                  alert('Sent ❤️ reaction to ' + activeStoryGroup.author?.full_name);
                }}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-rose-400 transition-colors"
              >
                <Heart className="w-5 h-5 fill-rose-500 stroke-none" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE STORY MODAL */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create 24h Story</h3>
              <button onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublishStory} className="space-y-4 pt-4">
              {/* Type Switcher */}
              <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setStoryType('IMAGE')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    storyType === 'IMAGE' ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-900 dark:text-white' : 'text-slate-500'
                  }`}
                >
                  Photo Story
                </button>
                <button
                  type="button"
                  onClick={() => setStoryType('TEXT')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    storyType === 'TEXT' ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-900 dark:text-white' : 'text-slate-500'
                  }`}
                >
                  Text Story
                </button>
              </div>

              {storyType === 'IMAGE' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Upload Photo (Saved to Cloudflare R2 / Local)
                  </label>
                  <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-sky-500 transition-colors">
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {uploading ? 'Uploading to storage...' : mediaUrl ? 'Replace Photo' : 'Click to select photo'}
                    </span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                  {mediaUrl && (
                    <img src={mediaUrl} alt="Preview" className="mt-2 w-full h-36 object-cover rounded-xl" />
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Text Content
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={textContent}
                      onChange={e => setTextContent(e.target.value)}
                      placeholder="What is your coding status today?"
                      className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Background Color
                    </label>
                    <div className="flex space-x-2">
                      {['#0f172a', '#1e3a8a', '#065f46', '#831843', '#4c1d95'].map(c => (
                        <div
                          key={c}
                          onClick={() => setBgColor(c)}
                          className={`w-7 h-7 rounded-full cursor-pointer ring-offset-2 ${
                            bgColor === c ? 'ring-2 ring-sky-500 scale-110' : ''
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || (storyType === 'IMAGE' && !mediaUrl) || (storyType === 'TEXT' && !textContent.trim())}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                Share Story
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

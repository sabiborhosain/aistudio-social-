import React, { useState, useEffect, useRef } from 'react';
import {
  Headphones,
  Plus,
  Trash2,
  Check,
  Globe,
  Settings,
  X,
  Upload,
  Volume2,
  VolumeX,
  Shield
} from 'lucide-react';
import { VideoAudioTrack } from '../../types.ts';
import { apiRequest, uploadMedia } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface AudioTrackSelectorProps {
  videoId: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export const AudioTrackSelector: React.FC<AudioTrackSelectorProps> = ({
  videoId,
  videoRef
}) => {
  const { user } = useAuth();
  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');

  const [tracks, setTracks] = useState<VideoAudioTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<VideoAudioTrack | null>(null);
  const [loading, setLoading] = useState(false);

  // Admin Modal
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [langName, setLangName] = useState('');
  const [langCode, setLangCode] = useState('');
  const [trackTitle, setTrackTitle] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchTracks = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<VideoAudioTrack[]>(`/videos/${videoId}/audio-tracks`);
      if (res.success && res.data) {
        const available = Array.isArray(res.data) ? res.data : [];
        setTracks(available);
        const def = available.find(t => t.is_default === 1);
        if (def && !selectedTrack) {
          setSelectedTrack(def);
        }
      }
    } catch {
      setTracks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, [videoId]);

  // Audio synchronization with video player
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!selectedTrack) {
      // Use original video native audio
      video.muted = false;
      if (audioRef.current) {
        audioRef.current.pause();
      }
      return;
    }

    // When custom track is selected, mute native video audio and sync external audio element
    video.muted = true;
    if (!audioRef.current) {
      audioRef.current = new Audio(selectedTrack.audio_url);
    } else {
      audioRef.current.src = selectedTrack.audio_url;
    }

    const audio = audioRef.current;
    audio.currentTime = video.currentTime;
    if (!video.paused) {
      audio.play().catch(() => {});
    }

    const onPlay = () => audio.play().catch(() => {});
    const onPause = () => audio.pause();
    const onSeeking = () => {
      audio.currentTime = video.currentTime;
    };
    const onTimeUpdate = () => {
      if (Math.abs(audio.currentTime - video.currentTime) > 0.3) {
        audio.currentTime = video.currentTime;
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeking', onSeeking);
    video.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeking', onSeeking);
      video.removeEventListener('timeupdate', onTimeUpdate);
      audio.pause();
    };
  }, [selectedTrack, videoRef.current]);

  const handleSelectTrack = (track: VideoAudioTrack | null) => {
    setSelectedTrack(track);
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingAudio(true);
      const url = await uploadMedia(file, 'audio');
      if (url) setAudioUrl(url);
    } catch (err: any) {
      alert(err.message || 'Audio upload failed');
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleAddTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSubmitting(true);
    const res = await apiRequest(`/videos/${videoId}/audio-tracks`, {
      method: 'POST',
      body: {
        languageName: langName,
        languageCode: langCode.toLowerCase(),
        title: trackTitle,
        audioUrl,
        isDefault
      }
    });
    setSubmitting(false);
    if (res.success) {
      setLangName('');
      setLangCode('');
      setTrackTitle('');
      setAudioUrl('');
      setIsDefault(false);
      fetchTracks();
      alert('Audio track added successfully!');
    } else {
      alert(res.message || 'Failed to add audio track');
    }
  };

  const handleDeleteTrack = async (trackId: number) => {
    if (!isAdmin) return;
    if (!confirm('Are you sure you want to delete this audio track?')) return;
    const res = await apiRequest(`/videos/${videoId}/audio-tracks/${trackId}`, {
      method: 'DELETE'
    });
    if (res.success) {
      if (selectedTrack?.id === trackId) {
        setSelectedTrack(null);
      }
      fetchTracks();
    } else {
      alert(res.message || 'Failed to delete audio track');
    }
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-3 border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center space-x-2">
        <Headphones className="w-4 h-4 text-sky-600 dark:text-sky-400" />
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          Audio Track:
        </span>

        {/* Track Selector Pill Buttons */}
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          <button
            onClick={() => handleSelectTrack(null)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              !selectedTrack
                ? 'bg-sky-600 text-white font-semibold shadow-xs'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Original Audio
          </button>

          {tracks.map(t => (
            <button
              key={t.id}
              onClick={() => handleSelectTrack(t)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center space-x-1 ${
                selectedTrack?.id === t.id
                  ? 'bg-sky-600 text-white font-semibold shadow-xs'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span>{t.language_name}</span>
              <span className="text-[10px] uppercase opacity-75">({t.language_code})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Admin Management Button */}
      {isAdmin && (
        <button
          onClick={() => setManageModalOpen(true)}
          className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold rounded-lg flex items-center space-x-1 transition-colors"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Manage Tracks (Admin)</span>
        </button>
      )}

      {/* Admin Track Manager Modal */}
      {manageModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Headphones className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Multi-Language Audio Tracks (Admin)
                </h3>
              </div>
              <button onClick={() => setManageModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Existing Tracks List */}
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Configured Tracks</h4>
              {tracks.length === 0 ? (
                <p className="text-xs text-slate-400">No alternate audio tracks added yet.</p>
              ) : (
                <div className="space-y-2">
                  {tracks.map(t => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          {t.language_name} ({t.language_code}) {t.is_default ? '★ Default' : ''}
                        </div>
                        <p className="text-[11px] text-slate-500">{t.title}</p>
                      </div>

                      <button
                        onClick={() => handleDeleteTrack(t.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Track Form */}
            <form onSubmit={handleAddTrack} className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Add New Language Track</h4>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Language Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bengali, Spanish"
                    value={langName}
                    onChange={e => setLangName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Language Code (ISO)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. bn, es, hi"
                    value={langCode}
                    onChange={e => setLangCode(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Track Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bengali Voiceover (Bangla Commentary)"
                  value={trackTitle}
                  onChange={e => setTrackTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Audio URL or File Upload</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="url"
                    required
                    placeholder="https://... or uploaded URL"
                    value={audioUrl}
                    onChange={e => setAudioUrl(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                  <label className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer flex items-center space-x-1 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingAudio ? 'Uploading...' : 'Upload MP3'}</span>
                    <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isDef"
                  checked={isDefault}
                  onChange={e => setIsDefault(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="isDef" className="text-xs text-slate-600 dark:text-slate-400">
                  Set as default audio track for this video
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setManageModalOpen(false)}
                  className="px-4 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submitting || !audioUrl}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Add Audio Track'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

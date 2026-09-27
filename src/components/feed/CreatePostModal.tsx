import React, { useState } from 'react';
import {
  Code2,
  Image as ImageIcon,
  Video as VideoIcon,
  Link as LinkIcon,
  Smile,
  MapPin,
  Globe,
  Lock,
  Users,
  Trash2,
  X,
  Upload,
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { apiRequest, uploadMedia } from '../../services/api.ts';
import { BlockType } from '../../types.ts';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
  groupId?: number;
}

interface NewBlock {
  type: BlockType;
  content: string;
  meta: {
    language?: string;
    title?: string;
    url?: string;
  };
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
  groupId
}) => {
  const { user, authModal } = useAuth();

  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<'PUBLIC' | 'FRIENDS' | 'ONLY_ME'>('PUBLIC');
  const [locationName, setLocationName] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [feelingEmoji, setFeelingEmoji] = useState<string | null>(null);
  const [feelingText, setFeelingText] = useState<string | null>(null);
  const [showFeelingPicker, setShowFeelingPicker] = useState(false);

  // Mixed Blocks
  const [blocks, setBlocks] = useState<NewBlock[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const feelings = [
    { emoji: '🚀', text: 'shipping' },
    { emoji: '💡', text: 'inspired' },
    { emoji: '🐛', text: 'debugging' },
    { emoji: '☕', text: 'caffeinated' },
    { emoji: '🔥', text: 'on fire' },
    { emoji: '🎉', text: 'celebrating' }
  ];

  const addBlock = (type: BlockType) => {
    if (type === 'CODE') {
      setBlocks(prev => [
        ...prev,
        {
          type: 'CODE',
          content: `// Type or paste your code snippet here\nfunction example() {\n  return "DevSphere";\n}`,
          meta: { language: 'typescript', title: 'snippet.ts' }
        }
      ]);
    } else if (type === 'IMAGE') {
      setBlocks(prev => [
        ...prev,
        {
          type: 'IMAGE',
          content: '',
          meta: {}
        }
      ]);
    } else if (type === 'VIDEO') {
      setBlocks(prev => [
        ...prev,
        {
          type: 'VIDEO',
          content: '',
          meta: {}
        }
      ]);
    } else if (type === 'LINK') {
      setBlocks(prev => [
        ...prev,
        {
          type: 'LINK',
          content: 'https://',
          meta: { title: 'External Documentation' }
        }
      ]);
    }
  };

  const removeBlock = (index: number) => {
    setBlocks(prev => prev.filter((_, i) => i !== index));
  };

  const updateBlockContent = (index: number, newContent: string) => {
    setBlocks(prev =>
      prev.map((b, i) => (i === index ? { ...b, content: newContent } : b))
    );
  };

  const updateBlockMeta = (index: number, metaUpdate: Partial<NewBlock['meta']>) => {
    setBlocks(prev =>
      prev.map((b, i) =>
        i === index ? { ...b, meta: { ...b.meta, ...metaUpdate } } : b
      )
    );
  };

  const handleFileUpload = async (index: number, file: File) => {
    try {
      setUploading(true);
      const url = await uploadMedia(file, 'posts');
      if (url) {
        updateBlockContent(index, url);
      }
    } catch (err: any) {
      alert(err.message || 'Media upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      authModal.open('login');
      return;
    }

    if (!content.trim() && blocks.length === 0) {
      alert('Please add some text or code blocks before publishing.');
      return;
    }

    setSubmitting(true);
    const res = await apiRequest('/posts', {
      method: 'POST',
      body: {
        content,
        privacy,
        locationName: locationName || null,
        feelingEmoji,
        feelingText,
        blocks,
        group_id: groupId || null
      }
    });

    setSubmitting(false);
    if (res.success) {
      setContent('');
      setBlocks([]);
      setLocationName('');
      setFeelingEmoji(null);
      setFeelingText(null);
      onPostCreated();
      onClose();
    } else {
      alert(res.message || 'Failed to publish post');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <img
              src={user?.profile.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${user?.profile.username || 'user'}`}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {user?.profile.full_name || 'Guest'}
                </span>
                {feelingEmoji && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    is feeling {feelingEmoji} {feelingText}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 mt-0.5">
                <select
                  value={privacy}
                  onChange={e => setPrivacy(e.target.value as any)}
                  className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-none rounded-lg px-2 py-0.5 font-medium cursor-pointer"
                >
                  <option value="PUBLIC">🌍 Public</option>
                  <option value="FRIENDS">👥 Friends</option>
                  <option value="ONLY_ME">🔒 Only Me</option>
                </select>

                {locationName && (
                  <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                    📍 {locationName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Main Textarea */}
          <textarea
            rows={3}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="What code, architecture, or tech challenge are you tackling today?"
            className="w-full text-sm sm:text-base border-none resize-none focus:outline-hidden bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 leading-relaxed"
          />

          {/* Location input popup */}
          {showLocationInput && (
            <div className="flex items-center space-x-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <MapPin className="w-4 h-4 text-sky-500" />
              <input
                type="text"
                placeholder="Where are you coding from? (e.g., San Francisco, CA)"
                value={locationName}
                onChange={e => setLocationName(e.target.value)}
                className="flex-1 text-xs bg-transparent border-none text-slate-900 dark:text-white focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowLocationInput(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Done
              </button>
            </div>
          )}

          {/* Feeling Picker */}
          {showFeelingPicker && (
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-2 items-center">
              <span className="text-xs font-semibold text-slate-500 mr-1">Feeling:</span>
              {feelings.map(f => (
                <button
                  type="button"
                  key={f.text}
                  onClick={() => {
                    setFeelingEmoji(f.emoji);
                    setFeelingText(f.text);
                    setShowFeelingPicker(false);
                  }}
                  className="px-2.5 py-1 text-xs bg-white dark:bg-slate-700 rounded-lg shadow-2xs hover:bg-sky-50 dark:hover:bg-slate-600 transition-colors flex items-center space-x-1"
                >
                  <span>{f.emoji}</span>
                  <span className="capitalize">{f.text}</span>
                </button>
              ))}
            </div>
          )}

          {/* DYNAMIC POST BLOCKS */}
          {blocks.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Post Content Blocks ({blocks.length})
              </div>

              {blocks.map((block, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 relative space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 uppercase tracking-wider">
                      Block {idx + 1}: {block.type}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBlock(idx)}
                      className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors"
                      title="Remove block"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* CODE BLOCK BUILDER */}
                  {block.type === 'CODE' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="File name (e.g., server.ts)"
                          value={block.meta.title || ''}
                          onChange={e => updateBlockMeta(idx, { title: e.target.value })}
                          className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                        />
                        <select
                          value={block.meta.language || 'typescript'}
                          onChange={e => updateBlockMeta(idx, { language: e.target.value })}
                          className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                        >
                          <option value="typescript">TypeScript</option>
                          <option value="javascript">JavaScript</option>
                          <option value="python">Python</option>
                          <option value="go">Go</option>
                          <option value="rust">Rust</option>
                          <option value="sql">SQL / MySQL</option>
                          <option value="html">HTML / CSS</option>
                          <option value="json">JSON</option>
                        </select>
                      </div>

                      <textarea
                        rows={6}
                        value={block.content}
                        onChange={e => updateBlockContent(idx, e.target.value)}
                        className="w-full p-3 font-mono text-xs bg-[#0d1117] text-emerald-400 rounded-xl border border-slate-800 focus:outline-hidden leading-relaxed"
                      />
                    </div>
                  )}

                  {/* IMAGE BLOCK BUILDER */}
                  {block.type === 'IMAGE' && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder="Image URL (or upload below)"
                          value={block.content}
                          onChange={e => updateBlockContent(idx, e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                        />
                        <label className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-xs font-semibold rounded-lg cursor-pointer flex items-center space-x-1">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => {
                              if (e.target.files?.[0]) handleFileUpload(idx, e.target.files[0]);
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                      {block.content && (
                        <img
                          src={block.content}
                          alt="Preview"
                          className="w-full max-h-48 object-cover rounded-xl"
                        />
                      )}
                    </div>
                  )}

                  {/* VIDEO BLOCK BUILDER */}
                  {block.type === 'VIDEO' && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder="Video URL (.mp4, .webm or storage link)"
                          value={block.content}
                          onChange={e => updateBlockContent(idx, e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                        />
                        <label className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-xs font-semibold rounded-lg cursor-pointer flex items-center space-x-1">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload</span>
                          <input
                            type="file"
                            accept="video/*"
                            onChange={e => {
                              if (e.target.files?.[0]) handleFileUpload(idx, e.target.files[0]);
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                      {block.content && (
                        <video
                          src={block.content}
                          controls
                          className="w-full max-h-48 rounded-xl bg-black"
                        />
                      )}
                    </div>
                  )}

                  {/* LINK BLOCK BUILDER */}
                  {block.type === 'LINK' && (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Link Title"
                        value={block.meta.title || ''}
                        onChange={e => updateBlockMeta(idx, { title: e.target.value })}
                        className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                      <input
                        type="url"
                        placeholder="https://example.com"
                        value={block.content}
                        onChange={e => updateBlockContent(idx, e.target.value)}
                        className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Block Tool Buttons */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 mb-2">
              Add Mixed Content Blocks:
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => addBlock('CODE')}
                className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 text-xs font-semibold flex items-center space-x-1.5 hover:bg-sky-100 transition-colors"
              >
                <Code2 className="w-4 h-4" />
                <span>+ Code Block</span>
              </button>

              <button
                type="button"
                onClick={() => addBlock('IMAGE')}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center space-x-1.5 hover:bg-emerald-100 transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
                <span>+ Photo</span>
              </button>

              <button
                type="button"
                onClick={() => addBlock('VIDEO')}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold flex items-center space-x-1.5 hover:bg-indigo-100 transition-colors"
              >
                <VideoIcon className="w-4 h-4" />
                <span>+ Video</span>
              </button>

              <button
                type="button"
                onClick={() => addBlock('LINK')}
                className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 text-xs font-semibold flex items-center space-x-1.5 hover:bg-purple-100 transition-colors"
              >
                <LinkIcon className="w-4 h-4" />
                <span>+ Link</span>
              </button>
            </div>
          </div>

          {/* Quick auxiliary tools: Location & Feeling */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setShowFeelingPicker(!showFeelingPicker)}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center space-x-1"
            >
              <Smile className="w-4 h-4 text-amber-500" />
              <span>Feelings</span>
            </button>
            <button
              type="button"
              onClick={() => setShowLocationInput(!showLocationInput)}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center space-x-1"
            >
              <MapPin className="w-4 h-4 text-rose-500" />
              <span>Location</span>
            </button>
          </div>

          {/* Submit Button */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={submitting || uploading}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {submitting ? 'Publishing...' : 'Publish Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

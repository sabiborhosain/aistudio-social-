import React, { useState } from 'react';
import {
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  MoreHorizontal,
  Code2,
  Globe,
  Lock,
  Users,
  ExternalLink,
  Trash2,
  Flag,
  Pin,
  Check
} from 'lucide-react';
import { Post, ReactionType } from '../../types.ts';
import { CodeViewer } from '../common/CodeViewer.tsx';
import { CommentSection } from './CommentSection.tsx';
import { apiRequest } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface PostCardProps {
  post: Post;
  onPostUpdated: () => void;
  onSelectUser?: (username: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onPostUpdated, onSelectUser }) => {
  const { user, authModal } = useAuth();

  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [reactionsCount, setReactionsCount] = useState(post.reactions_count);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(post.userReaction || null);
  const [isSaved, setIsSaved] = useState(post.isSaved || false);

  // Popups & states
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Report modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Spam or misleading');

  const reactionEmojis: Record<ReactionType, { emoji: string; label: string }> = {
    LIKE: { emoji: '👍', label: 'Like' },
    LOVE: { emoji: '❤️', label: 'Love' },
    CODE: { emoji: '💻', label: 'Code' },
    HAHA: { emoji: '😆', label: 'Haha' },
    WOW: { emoji: '😮', label: 'Wow' },
    SAD: { emoji: '😢', label: 'Sad' },
    ANGRY: { emoji: '😡', label: 'Angry' }
  };

  const handleReact = async (type: ReactionType) => {
    if (!user) {
      authModal.open('login');
      return;
    }

    const previousReaction = userReaction;
    const isTogglingOff = previousReaction === type;

    // Optimistic update
    setUserReaction(isTogglingOff ? null : type);
    setReactionsCount(prev => (isTogglingOff ? prev - 1 : previousReaction ? prev : prev + 1));
    setShowReactionsMenu(false);

    const res = await apiRequest<{ reactionsCount: number; userReaction: ReactionType | null }>(
      `/posts/${post.id}/react`,
      {
        method: 'POST',
        body: { reactionType: type }
      }
    );

    if (res.success && res.data) {
      setReactionsCount(res.data.reactionsCount);
      setUserReaction(res.data.userReaction);
    }
  };

  const handleSaveToggle = async () => {
    if (!user) {
      authModal.open('login');
      return;
    }

    setIsSaved(!isSaved);
    const res = await apiRequest<{ saved: boolean }>(`/posts/${post.id}/save`, { method: 'POST' });
    if (res.success && res.data) {
      setIsSaved(res.data.saved);
    }
  };

  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}/#post-${post.id}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    const res = await apiRequest(`/posts/${post.id}`, { method: 'DELETE' });
    if (res.success) {
      onPostUpdated();
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      authModal.open('login');
      return;
    }

    const res = await apiRequest('/reports', {
      method: 'POST',
      body: {
        reportedType: 'POST',
        reportedId: post.id,
        reason: reportReason
      }
    });

    if (res.success) {
      alert('Report submitted for moderation review.');
      setShowReportModal(false);
    }
  };

  const author = post.author;
  const isAuthor = user && user.id === post.user_id;
  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');

  return (
    <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700/80 transition-all overflow-hidden mb-5">
      {/* Header */}
      <div className="p-4 sm:p-5 pb-2 sm:pb-3 flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <img
            onClick={() => onSelectUser && onSelectUser(author?.username || post.user_id.toString())}
            src={author?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${author?.username || 'user'}`}
            alt={author?.username}
            className="w-10 h-10 rounded-full object-cover cursor-pointer ring-1 ring-slate-200 dark:ring-slate-800 hover:ring-2 hover:ring-sky-500/50 transition-all"
          />
          <div>
            <div className="flex items-center flex-wrap gap-1.5">
              <span
                onClick={() => onSelectUser && onSelectUser(author?.username || post.user_id.toString())}
                className="font-bold text-sm text-slate-900 dark:text-white cursor-pointer hover:underline"
              >
                {author?.full_name}
              </span>
              <span className="text-xs text-slate-500">@{author?.username}</span>

              {post.feeling_emoji && (
                <span className="text-xs text-slate-500">
                  is feeling {post.feeling_emoji} {post.feeling_text}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
              <span>{new Date(post.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              <span>•</span>
              {post.privacy === 'PUBLIC' ? (
                <span className="flex items-center space-x-0.5">
                  <Globe className="w-3 h-3" />
                  <span>Public</span>
                </span>
              ) : post.privacy === 'FRIENDS' ? (
                <span className="flex items-center space-x-0.5">
                  <Users className="w-3 h-3" />
                  <span>Friends</span>
                </span>
              ) : (
                <span className="flex items-center space-x-0.5">
                  <Lock className="w-3 h-3" />
                  <span>Only Me</span>
                </span>
              )}
              {post.location_name && (
                <>
                  <span>•</span>
                  <span>📍 {post.location_name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Options Menu Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {showOptionsMenu && (
            <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 z-30">
              <button
                onClick={() => {
                  setShowReportModal(true);
                  setShowOptionsMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
              >
                <Flag className="w-4 h-4 text-slate-400" />
                <span>Report Content</span>
              </button>

              {(isAuthor || isAdmin) && (
                <button
                  onClick={() => {
                    handleDelete();
                    setShowOptionsMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Post</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Post Text Content */}
      {post.content && (
        <div className="px-4 sm:px-5 py-2 text-sm sm:text-[15px] text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line select-text">
          {post.content}
        </div>
      )}

      {/* Post Blocks (Mixed Media + Code Snippets) */}
      {Array.isArray(post.blocks) && post.blocks.length > 0 && (
        <div className="px-4 sm:px-5 py-1 space-y-3">
          {post.blocks.map((block, idx) => {
            if (block.block_type === 'CODE') {
              return (
                <CodeViewer
                  key={idx}
                  code={block.content}
                  language={block.meta_json?.language || 'typescript'}
                  title={block.meta_json?.title}
                />
              );
            }
            if (block.block_type === 'IMAGE') {
              return (
                <div key={idx} className="rounded-xl overflow-hidden my-2 border border-slate-100 dark:border-slate-800">
                  <img src={block.content} alt="Media" className="w-full max-h-[500px] object-cover" />
                </div>
              );
            }
            if (block.block_type === 'VIDEO') {
              return (
                <div key={idx} className="rounded-xl overflow-hidden my-2 bg-black">
                  <video src={block.content} controls className="w-full max-h-[480px]" />
                </div>
              );
            }
            if (block.block_type === 'LINK') {
              return (
                <a
                  key={idx}
                  href={block.content}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:border-sky-500 transition-colors group"
                >
                  <div className="min-w-0 pr-3">
                    <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-sky-500 block truncate">
                      {block.meta_json?.title || 'Shared Link'}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate block mt-0.5">
                      {block.content}
                    </span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-sky-500 shrink-0" />
                </a>
              );
            }
            return null;
          })}
        </div>
      )}

      {/* Reaction and Engagement Stats Bar */}
      <div className="px-4 sm:px-5 py-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-1.5">
          {userReaction ? (
            <span className="flex items-center space-x-1 font-semibold text-sky-600 dark:text-sky-400">
              <span>{reactionEmojis[userReaction].emoji}</span>
              <span>{reactionsCount} reactions</span>
            </span>
          ) : (
            <span>{reactionsCount > 0 ? `${reactionsCount} reactions` : 'Be the first to react'}</span>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <button onClick={() => setShowComments(!showComments)} className="hover:underline">
            {commentsCount} comments
          </button>
          <span>{post.shares_count} shares</span>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="px-2 sm:px-4 py-1.5 flex items-center justify-between relative">
        {/* Reaction Popover & Button */}
        <div className="relative">
          <button
            onClick={() => handleReact(userReaction ? userReaction : 'LIKE')}
            onMouseEnter={() => setShowReactionsMenu(true)}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
              userReaction
                ? 'text-sky-600 dark:text-sky-400 font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {userReaction ? (
              <>
                <span>{reactionEmojis[userReaction].emoji}</span>
                <span>{reactionEmojis[userReaction].label}</span>
              </>
            ) : (
              <>
                <Heart className="w-4 h-4" />
                <span>React</span>
              </>
            )}
          </button>

          {/* Floating Emoji Reactions Bar */}
          {showReactionsMenu && (
            <div
              onMouseLeave={() => setShowReactionsMenu(false)}
              className="absolute left-0 -top-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-full px-2 py-1 flex items-center space-x-1 z-30 animate-in fade-in zoom-in-95 duration-150"
            >
              {(Object.keys(reactionEmojis) as ReactionType[]).map(r => (
                <button
                  key={r}
                  onClick={() => handleReact(r)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg hover:scale-125 transition-transform"
                  title={reactionEmojis[r].label}
                >
                  {reactionEmojis[r].emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Comment Button */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Comment</span>
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {copiedLink ? (
            <>
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-500">Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </>
          )}
        </button>

        {/* Bookmark Button */}
        <button
          onClick={handleSaveToggle}
          className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
            isSaved
              ? 'text-sky-600 dark:text-sky-400 font-bold'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
        </button>
      </div>

      {/* Expanded Comments Section */}
      {showComments && (
        <div className="px-4 sm:px-5 pb-4">
          <CommentSection
            postId={post.id}
            initialCommentsCount={commentsCount}
            onCommentsCountChange={setCommentsCount}
            onSelectUser={onSelectUser}
          />
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Report Content</h4>
            <p className="text-xs text-slate-500 mb-3">
              Why are you reporting this developer post?
            </p>
            <form onSubmit={handleReport} className="space-y-3">
              <select
                value={reportReason}
                onChange={e => setReportReason(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                <option value="Spam or misleading">Spam or misleading</option>
                <option value="Malicious code snippet">Malicious or insecure code snippet</option>
                <option value="Harassment or hate speech">Harassment or hate speech</option>
                <option value="Copyright violation">Copyright or license infringement</option>
                <option value="Other">Other violation</option>
              </select>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </article>
  );
};

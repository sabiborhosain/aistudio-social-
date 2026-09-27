import React, { useState, useEffect } from 'react';
import { Send, Code2, Image as ImageIcon, Heart, CornerDownRight, X, Trash2 } from 'lucide-react';
import { Comment } from '../../types.ts';
import { apiRequest } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { CodeViewer } from '../common/CodeViewer.tsx';

interface CommentSectionProps {
  postId: number;
  initialCommentsCount: number;
  onCommentsCountChange?: (count: number) => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  initialCommentsCount,
  onCommentsCountChange
}) => {
  const { user, authModal } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  // New comment input
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: number; authorName: string } | null>(null);

  // Code snippet attachment
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('typescript');

  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    const res = await apiRequest<Comment[]>(`/posts/${postId}/comments`);
    if (res.success && res.data) {
      const commentsList = Array.isArray(res.data) ? res.data : [];
      setComments(commentsList);
      if (onCommentsCountChange) {
        // Count top level + replies
        let total = commentsList.length;
        commentsList.forEach(c => {
          total += c.replies?.length || 0;
        });
        onCommentsCountChange(total);
      }
    } else {
      setComments([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      authModal.open('login');
      return;
    }

    if (!text.trim() && !codeSnippet.trim()) return;

    setSubmitting(true);
    const res = await apiRequest<Comment>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: {
        content: text.trim(),
        codeSnippet: showCodeInput && codeSnippet.trim() ? codeSnippet.trim() : null,
        codeLanguage: showCodeInput ? codeLanguage : null,
        parentId: replyTo?.id || null
      }
    });

    setSubmitting(false);
    if (res.success && res.data) {
      setText('');
      setCodeSnippet('');
      setShowCodeInput(false);
      setReplyTo(null);
      fetchComments();
    }
  };

  const handleReact = async (commentId: number) => {
    if (!user) {
      authModal.open('login');
      return;
    }
    const res = await apiRequest<{ likesCount: number; hasLiked: boolean }>(`/comments/${commentId}/react`, {
      method: 'POST'
    });
    if (res.success && res.data) {
      setComments(prev =>
        prev.map(c => {
          if (c.id === commentId) {
            return {
              ...c,
              likes_count: res.data!.likesCount,
              userReaction: res.data!.hasLiked ? 'LIKE' : null
            };
          }
          // check replies
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map(r =>
                r.id === commentId
                  ? {
                      ...r,
                      likes_count: res.data!.likesCount,
                      userReaction: res.data!.hasLiked ? 'LIKE' : null
                    }
                  : r
              )
            };
          }
          return c;
        })
      );
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!confirm('Delete this comment?')) return;
    const res = await apiRequest(`/comments/${commentId}`, { method: 'DELETE' });
    if (res.success) {
      fetchComments();
    }
  };

  return (
    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
      {/* Comments List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-3 text-xs text-slate-400">Loading comments...</div>
        ) : !Array.isArray(comments) || comments.length === 0 ? (
          <div className="text-center py-2 text-xs text-slate-400">
            No comments yet. Share your thoughts or attach a code solution!
          </div>
        ) : (
          comments.map(c => (
            <div key={c.id} className="space-y-2">
              {/* Parent Comment */}
              <div className="flex items-start space-x-2.5">
                <img
                  src={c.author?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${c.author?.username || 'user'}`}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {c.author?.full_name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
                    {c.content}
                  </p>

                  {/* Comment Code Snippet */}
                  {c.code_snippet && (
                    <CodeViewer
                      code={c.code_snippet}
                      language={c.code_language || 'typescript'}
                      title="Solution"
                    />
                  )}

                  {/* Actions */}
                  <div className="flex items-center space-x-3 mt-1.5 pt-1 text-[11px] text-slate-500">
                    <button
                      onClick={() => handleReact(c.id)}
                      className={`flex items-center space-x-1 hover:text-rose-500 transition-colors ${
                        c.userReaction === 'LIKE' ? 'text-rose-500 font-semibold' : ''
                      }`}
                    >
                      <Heart className="w-3.5 h-3.5 fill-current" />
                      <span>{c.likes_count > 0 ? c.likes_count : 'Like'}</span>
                    </button>

                    <button
                      onClick={() => setReplyTo({ id: c.id, authorName: c.author?.full_name || 'User' })}
                      className="hover:text-sky-500 transition-colors"
                    >
                      Reply
                    </button>

                    {user && (user.id === c.user_id || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="hover:text-rose-500 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Replies */}
              {c.replies && c.replies.length > 0 && (
                <div className="pl-8 space-y-2">
                  {c.replies.map(r => (
                    <div key={r.id} className="flex items-start space-x-2">
                      <CornerDownRight className="w-4 h-4 text-slate-400 shrink-0 mt-2" />
                      <img
                        src={r.author?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${r.author?.username || 'user'}`}
                        alt=""
                        className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                      />
                      <div className="flex-1 min-w-0 bg-slate-50/80 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                            {r.author?.full_name}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-200 mt-0.5">
                          {r.content}
                        </p>
                        {r.code_snippet && (
                          <CodeViewer
                            code={r.code_snippet}
                            language={r.code_language || 'typescript'}
                            title="Reply Snippet"
                          />
                        )}
                        <div className="flex items-center space-x-3 mt-1 text-[10px] text-slate-500">
                          <button
                            onClick={() => handleReact(r.id)}
                            className={`flex items-center space-x-1 hover:text-rose-500 ${
                              r.userReaction === 'LIKE' ? 'text-rose-500 font-semibold' : ''
                            }`}
                          >
                            <Heart className="w-3 h-3 fill-current" />
                            <span>{r.likes_count > 0 ? r.likes_count : 'Like'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Reply Banner */}
      {replyTo && (
        <div className="flex items-center justify-between px-3 py-1 bg-sky-50 dark:bg-sky-950/40 rounded-lg text-xs text-sky-700 dark:text-sky-300">
          <span>Replying to <strong>{replyTo.authorName}</strong></span>
          <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Code Snippet input toggle form */}
      {showCodeInput && (
        <div className="p-2.5 bg-[#0d1117] rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Code2 className="w-4 h-4 text-sky-400" />
              <span className="text-xs text-slate-300 font-semibold">Attach Code to Comment</span>
            </div>
            <select
              value={codeLanguage}
              onChange={e => setCodeLanguage(e.target.value)}
              className="text-xs bg-slate-800 text-sky-400 border border-slate-700 rounded-md px-2 py-0.5"
            >
              <option value="typescript">TypeScript</option>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="sql">SQL</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
            </select>
          </div>
          <textarea
            rows={3}
            value={codeSnippet}
            onChange={e => setCodeSnippet(e.target.value)}
            placeholder="// Paste snippet..."
            className="w-full p-2 font-mono text-xs bg-slate-900 text-emerald-300 rounded-lg border border-slate-800 focus:outline-hidden"
          />
        </div>
      )}

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <div className="flex-1 flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-sky-500">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={replyTo ? `Replying to ${replyTo.authorName}...` : 'Write a comment or share solution...'}
            className="flex-1 text-xs bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
          />

          <button
            type="button"
            onClick={() => setShowCodeInput(!showCodeInput)}
            className={`p-1 rounded-lg text-slate-400 hover:text-sky-500 transition-colors ${
              showCodeInput ? 'text-sky-500 bg-sky-50 dark:bg-sky-950' : ''
            }`}
            title="Attach code snippet"
          >
            <Code2 className="w-4 h-4" />
          </button>
        </div>

        <button
          type="submit"
          disabled={submitting || (!text.trim() && !codeSnippet.trim())}
          className="p-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-40 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

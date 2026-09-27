import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Database, FileCode, CheckCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface RightSidebarProps {
  onSelectUser?: (username: string) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ onSelectUser }) => {
  const { user, authModal } = useAuth();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await apiRequest<any[]>('/users/suggestions');
        if (res.success && res.data) {
          setSuggestions(Array.isArray(res.data) ? res.data : []);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error('Failed to load suggestions:', err);
        setSuggestions([]);
      }
    };
    fetchSuggestions();
  }, [user]);

  const handleFollow = async (userId: number) => {
    if (!user) {
      authModal.open('login');
      return;
    }
    const isCurrently = followingMap[userId];
    setFollowingMap(prev => ({ ...prev, [userId]: !isCurrently }));
    await apiRequest(`/users/${userId}/follow`, { method: 'POST' });
  };

  const trendingTopics = [
    { tag: '#TypeScript5', posts: '1.2k posts' },
    { tag: '#CloudflareR2', posts: '850 posts' },
    { tag: '#MySQL8', posts: '620 posts' },
    { tag: '#SystemDesign', posts: '2.4k posts' },
    { tag: '#DevOps', posts: '940 posts' }
  ];

  return (
    <aside className="hidden xl:flex flex-col w-80 shrink-0 space-y-4 py-6 pl-4 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
      {/* Recommended Engineers */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
            <span>Engineers to Follow</span>
          </h3>
        </div>

        <div className="space-y-3">
          {Array.isArray(suggestions) && suggestions.map(s => {
            const isFollowed = followingMap[s.id];
            return (
              <div key={s.id} className="flex items-center justify-between">
                <div
                  onClick={() => onSelectUser && onSelectUser(s.username)}
                  className="flex items-center space-x-2.5 cursor-pointer min-w-0"
                >
                  <img
                    src={s.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${s.username}`}
                    alt={s.username}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate hover:underline">
                      {s.full_name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">@{s.username}</div>
                  </div>
                </div>

                <button
                  onClick={() => handleFollow(s.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                    isFollowed
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      : 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 hover:bg-sky-100'
                  }`}
                >
                  {isFollowed ? 'Following' : 'Follow'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trending Topics */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5 mb-3">
          <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
          <span>Trending in Engineering</span>
        </h3>

        <div className="space-y-2.5">
          {trendingTopics.map(t => (
            <div key={t.tag} className="flex items-center justify-between text-xs cursor-pointer hover:opacity-80">
              <div>
                <span className="font-semibold text-sky-600 dark:text-sky-400 block">{t.tag}</span>
                <span className="text-[10px] text-slate-400">{t.posts}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Database & Architecture Specification Badge */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-4 border border-slate-800 shadow-md">
        <div className="flex items-center space-x-2 text-sky-400 mb-2">
          <Database className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">MySQL 8.0 & phpMyAdmin</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          Production schema ready in <code className="text-sky-300 font-mono">database/database.sql</code>. Import directly into phpMyAdmin or CyberPanel VPS.
        </p>
        <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>JWT + RBAC + R2 Storage</span>
          </span>
          <span className="font-mono text-sky-400">REST v1</span>
        </div>
      </div>
    </aside>
  );
};

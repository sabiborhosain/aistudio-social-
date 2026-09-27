import React from 'react';
import {
  Home,
  Code2,
  Users,
  Bookmark,
  Film,
  Tv,
  Flag,
  Shield,
  Layers,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  feedFilter: 'all' | 'following' | 'code';
  setFeedFilter: (filter: 'all' | 'following' | 'code') => void;
  onSelectUser?: (username: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  feedFilter,
  setFeedFilter,
  onSelectUser
}) => {
  const { user, authModal } = useAuth();

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 space-y-4 py-6 pr-4 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
      {/* User Card */}
      {user ? (
        <div
          onClick={() => {
            if (user && onSelectUser) onSelectUser(user.profile.username);
            setActiveTab('profile');
          }}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-sky-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center space-x-3">
            <img
              src={user.profile.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.profile.username}`}
              alt={user.profile.username}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-sky-500/20 group-hover:ring-sky-500/50 transition-all"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {user.profile.full_name}
              </h4>
              <p className="text-xs text-slate-500 truncate">@{user.profile.username}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{user.profile.posts_count}</div>
              <div className="text-[10px] text-slate-400">Posts</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{user.profile.followers_count}</div>
              <div className="text-[10px] text-slate-400">Followers</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{user.profile.following_count}</div>
              <div className="text-[10px] text-slate-400">Following</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/10 to-indigo-500/10 border border-sky-500/20 text-center">
          <div className="w-10 h-10 mx-auto rounded-xl bg-sky-600 text-white flex items-center justify-center mb-2">
            <Sparkles className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-white">Join the Dev Community</h4>
          <p className="text-[11px] text-slate-500 mt-1 mb-3">Share code snippets, watch reels, and collaborate.</p>
          <button
            onClick={() => authModal.open('register')}
            className="w-full py-1.5 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
          >
            Create Account
          </button>
        </div>
      )}

      {/* Feed Filters */}
      <div className="space-y-1">
        <div className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Feeds
        </div>

        <button
          onClick={() => {
            setActiveTab('feed');
            setFeedFilter('all');
          }}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
            activeTab === 'feed' && feedFilter === 'all'
              ? 'bg-sky-500 text-white font-semibold shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>All Updates</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('feed');
            setFeedFilter('code');
          }}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
            activeTab === 'feed' && feedFilter === 'code'
              ? 'bg-sky-500 text-white font-semibold shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Code Snippets Only</span>
        </button>

        {user && (
          <button
            onClick={() => {
              setActiveTab('feed');
              setFeedFilter('following');
            }}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'feed' && feedFilter === 'following'
                ? 'bg-sky-500 text-white font-semibold shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Following Feed</span>
          </button>
        )}

        {user && (
          <button
            onClick={() => setActiveTab('saved')}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'saved'
                ? 'bg-sky-500 text-white font-semibold shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Saved Bookmarks</span>
          </button>
        )}
      </div>

      {/* Social Network Section */}
      <div className="space-y-1">
        <div className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Social Network
        </div>

        <button
          onClick={() => setActiveTab('friends')}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
            activeTab === 'friends'
              ? 'bg-sky-500 text-white font-semibold shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Friends Network</span>
        </button>

        <button
          onClick={() => setActiveTab('messages')}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
            activeTab === 'messages'
              ? 'bg-sky-500 text-white font-semibold shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Direct Messages</span>
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
            activeTab === 'groups'
              ? 'bg-sky-500 text-white font-semibold shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Developer Groups</span>
        </button>
      </div>

      {/* Explore Section */}
      <div className="space-y-1">
        <div className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Explore Media
        </div>

        <button
          onClick={() => setActiveTab('reels')}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
            activeTab === 'reels'
              ? 'bg-sky-500 text-white font-semibold shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Short Videos / Reels</span>
        </button>

        <button
          onClick={() => setActiveTab('videos')}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
            activeTab === 'videos'
              ? 'bg-sky-500 text-white font-semibold shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Tv className="w-4 h-4" />
          <span>Video Catalog</span>
        </button>

        <button
          onClick={() => setActiveTab('pages')}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
            activeTab === 'pages'
              ? 'bg-sky-500 text-white font-semibold shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Flag className="w-4 h-4" />
          <span>Developer Pages</span>
        </button>
      </div>

      {/* Admin Quick Link */}
      {isAdmin && (
        <div className="space-y-1 pt-2">
          <div className="px-3 text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-1">
            Supervision
          </div>
          <button
            onClick={() => setActiveTab('admin')}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'admin'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Admin Control Panel</span>
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className="pt-4 text-[11px] text-slate-400 px-3">
        <p>© 2026 DevSphere Social</p>
        <p className="mt-0.5">MySQL 8.0 • Cloudflare R2 • REST API</p>
      </div>
    </aside>
  );
};

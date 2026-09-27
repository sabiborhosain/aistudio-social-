import React, { useState, useEffect } from 'react';
import { Flag, Plus, Users, CheckCircle, Search, ExternalLink, X } from 'lucide-react';
import { Page } from '../../types.ts';
import { apiRequest } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export const PagesView: React.FC = () => {
  const { user, authModal } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Create page modal
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Technology');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<Page[]>('/pages');
      if (res.success && res.data) {
        setPages(Array.isArray(res.data) ? res.data : []);
      } else {
        setPages([]);
      }
    } catch (err) {
      console.error('Failed to load pages:', err);
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleFollowToggle = async (pageId: number) => {
    if (!user) {
      authModal.open('login');
      return;
    }
    const res = await apiRequest<{ isFollowing: boolean; followersCount: number }>(
      `/pages/${pageId}/follow`,
      { method: 'POST' }
    );
    if (res.success && res.data) {
      setPages(prev =>
        prev.map(p =>
          p.id === pageId
            ? { ...p, isFollowing: res.data!.isFollowing, followers_count: res.data!.followersCount }
            : p
        )
      );
    }
  };

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      authModal.open('login');
      return;
    }

    const res = await apiRequest<Page>('/pages', {
      method: 'POST',
      body: { name, category, description, website }
    });

    if (res.success) {
      setCreateOpen(false);
      setName('');
      setDescription('');
      setWebsite('');
      fetchPages();
    } else {
      alert(res.message || 'Failed to create page');
    }
  };

  const categories = ['ALL', 'Technology', 'Community', 'DevOps', 'Open Source'];

  const safePages = Array.isArray(pages) ? pages : [];
  const filteredPages = safePages.filter(p => {
    const matchCat = categoryFilter === 'ALL' || p.category.toLowerCase() === categoryFilter.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="w-full max-w-5xl mx-auto py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Flag className="w-5 h-5 text-sky-500" />
            Developer Communities & Pages
          </h2>
          <p className="text-xs text-slate-500">
            Connect with tech hubs, open-source organizations, and architecture working groups
          </p>
        </div>

        <button
          onClick={() => {
            if (!user) authModal.open('login');
            else setCreateOpen(true);
          }}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Page</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                categoryFilter === cat
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search pages..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl border-none text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Pages Grid */}
      {loading ? (
        <div className="text-center py-20 text-xs text-slate-400">Loading developer pages...</div>
      ) : filteredPages.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Flag className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">No Pages Found</h3>
          <p className="text-xs text-slate-400 mt-1">Try changing category or create a new community page</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPages.map(page => (
            <div
              key={page.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:border-sky-500/50 hover:shadow-md transition-all flex flex-col"
            >
              {/* Cover Banner */}
              <div className="h-24 bg-gradient-to-r from-sky-600 to-indigo-700 relative overflow-hidden">
                {page.cover_url && (
                  <img src={page.cover_url} alt="" className="w-full h-full object-cover" />
                )}
              </div>

              {/* Avatar & Content */}
              <div className="px-4 pb-4 pt-0 relative flex-1 flex flex-col">
                <div className="flex justify-between items-end -mt-8 mb-3">
                  <img
                    src={page.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${page.slug}`}
                    alt={page.name}
                    className="w-16 h-16 rounded-2xl object-cover border-4 border-white dark:border-slate-900 shadow-md bg-white"
                  />
                  <button
                    onClick={() => handleFollowToggle(page.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      page.isFollowing
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600'
                        : 'bg-sky-600 hover:bg-sky-700 text-white shadow-2xs'
                    }`}
                  >
                    {page.isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>

                <div className="flex-1">
                  <div className="flex items-center space-x-1.5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {page.name}
                    </h3>
                    {page.is_verified === 1 && (
                      <CheckCircle className="w-4 h-4 text-sky-500 shrink-0" />
                    )}
                  </div>

                  <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    {page.category}
                  </span>

                  {page.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                      {page.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{page.followers_count} followers</span>
                  </span>

                  {page.website && (
                    <a
                      href={page.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-500 hover:underline flex items-center space-x-0.5 text-[11px]"
                    >
                      <span>Website</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE PAGE MODAL */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Create Developer Page</h3>
              <button onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePage} className="space-y-3.5 pt-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Community / Page Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Distributed Systems Guild"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="Technology">Technology</option>
                  <option value="Community">Community</option>
                  <option value="DevOps">DevOps</option>
                  <option value="Open Source">Open Source</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What is the mission of this group?"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Website / GitHub
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://github.com/orgs/..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={!name.trim()}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 mt-2"
              >
                Create Page
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

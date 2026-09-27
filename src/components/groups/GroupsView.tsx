import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Lock,
  Globe,
  Shield,
  MessageSquare,
  Sparkles,
  Settings,
  UserPlus,
  Check,
  X,
  UserCheck,
  UserX,
  AlertTriangle,
  FileText,
  Clock,
  ArrowLeft,
  Crown
} from 'lucide-react';
import { Group, GroupMember, GroupJoinRequest, Post } from '../../types.ts';
import { apiRequest } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { PostCard } from '../feed/PostCard.tsx';
import { CreatePostModal } from '../feed/CreatePostModal.tsx';

interface GroupsViewProps {
  onSelectUser?: (username: string) => void;
}

export const GroupsView: React.FC<GroupsViewProps> = ({ onSelectUser }) => {
  const { user, authModal } = useAuth();

  // Navigation: list or single group detail
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [activeTab, setActiveTab] = useState<'discover' | 'my-groups'>('discover');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Groups data
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Group Detail state
  const [detailTab, setDetailTab] = useState<'posts' | 'members' | 'requests' | 'rules'>('posts');
  const [groupPosts, setGroupPosts] = useState<Post[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [createPostOpen, setCreatePostOpen] = useState(false);

  // Create Group Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('Architecture');
  const [newGroupPrivacy, setNewGroupPrivacy] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [newGroupRules, setNewGroupRules] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  const categories = [
    'ALL',
    'Architecture',
    'Frontend',
    'Backend',
    'DevOps & Cloud',
    'AI & Machine Learning',
    'Open Source',
    'Career & Startups'
  ];

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const query = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
      const res = await apiRequest<Group[]>(`/groups${query}`);
      if (res.success && res.data) {
        setGroups(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyGroups = async () => {
    if (!user) return;
    try {
      const res = await apiRequest<Group[]>('/groups/my/list');
      if (res.success && res.data) {
        setMyGroups(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      setMyGroups([]);
    }
  };

  useEffect(() => {
    if (!selectedGroup) {
      fetchGroups();
      if (user) fetchMyGroups();
    }
  }, [selectedGroup, activeTab]);

  // Load single group detail data
  const loadGroupDetail = async (groupId: number) => {
    setLoadingDetail(true);
    try {
      const res = await apiRequest<Group>(`/groups/${groupId}`);
      if (res.success && res.data) {
        setSelectedGroup(res.data);
      }

      // Fetch posts for group
      const postRes = await apiRequest<{ posts: Post[] } | Post[]>(`/groups/${groupId}/posts`);
      if (postRes.success && postRes.data) {
        if (Array.isArray(postRes.data)) {
          setGroupPosts(postRes.data);
        } else if (postRes.data && Array.isArray((postRes.data as any).posts)) {
          setGroupPosts((postRes.data as any).posts);
        } else {
          setGroupPosts([]);
        }
      } else {
        setGroupPosts([]);
      }

      // Fetch members
      const memberRes = await apiRequest<GroupMember[]>(`/groups/${groupId}/members`);
      if (memberRes.success && memberRes.data) {
        setGroupMembers(Array.isArray(memberRes.data) ? memberRes.data : []);
      }

      // If user is owner or admin, fetch join requests
      if (user) {
        try {
          const reqRes = await apiRequest<GroupJoinRequest[]>(`/groups/${groupId}/requests`);
          if (reqRes.success && reqRes.data) {
            setJoinRequests(Array.isArray(reqRes.data) ? reqRes.data : []);
          }
        } catch {
          // not admin or public group
        }
      }
    } catch (err) {
      console.error('Failed to load group detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleJoin = async (groupId: number) => {
    if (!user) {
      authModal.open('login');
      return;
    }
    const res = await apiRequest(`/groups/${groupId}/join`, { method: 'POST' });
    if (res.success) {
      alert(res.message || 'Joined group!');
      if (selectedGroup) loadGroupDetail(selectedGroup.id);
      fetchGroups();
      fetchMyGroups();
    } else {
      alert(res.message || 'Failed to join');
    }
  };

  const handleLeave = async (groupId: number) => {
    if (!confirm('Are you sure you want to leave this group?')) return;
    const res = await apiRequest(`/groups/${groupId}/leave`, { method: 'POST' });
    if (res.success) {
      alert('You have left the group.');
      if (selectedGroup) loadGroupDetail(selectedGroup.id);
      fetchGroups();
      fetchMyGroups();
    } else {
      alert(res.message || 'Failed to leave');
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreatingGroup(true);
    const res = await apiRequest<Group>('/groups', {
      method: 'POST',
      body: {
        name: newGroupName,
        description: newGroupDesc,
        category: newGroupCategory,
        privacy: newGroupPrivacy,
        rules: newGroupRules
      }
    });
    setCreatingGroup(false);
    if (res.success && res.data) {
      setCreateModalOpen(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupRules('');
      loadGroupDetail(res.data.id);
      fetchGroups();
      fetchMyGroups();
    } else {
      alert(res.message || 'Failed to create group');
    }
  };

  const handleApproveRequest = async (requestId: number) => {
    if (!selectedGroup) return;
    const res = await apiRequest(`/groups/${selectedGroup.id}/requests/${requestId}/approve`, {
      method: 'POST'
    });
    if (res.success) {
      setJoinRequests(prev => prev.filter(r => r.id !== requestId));
      loadGroupDetail(selectedGroup.id);
    } else {
      alert(res.message || 'Failed to approve');
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    if (!selectedGroup) return;
    const res = await apiRequest(`/groups/${selectedGroup.id}/requests/${requestId}/reject`, {
      method: 'POST'
    });
    if (res.success) {
      setJoinRequests(prev => prev.filter(r => r.id !== requestId));
    } else {
      alert(res.message || 'Failed to reject');
    }
  };

  const handleRemoveMember = async (targetUserId: number) => {
    if (!selectedGroup) return;
    if (!confirm('Remove this member from the group?')) return;
    const res = await apiRequest(`/groups/${selectedGroup.id}/members/${targetUserId}`, {
      method: 'DELETE'
    });
    if (res.success) {
      loadGroupDetail(selectedGroup.id);
    } else {
      alert(res.message || 'Failed to remove member');
    }
  };

  const handleUpdateRole = async (targetUserId: number, newRole: string) => {
    if (!selectedGroup) return;
    const res = await apiRequest(`/groups/${selectedGroup.id}/members/${targetUserId}/role`, {
      method: 'PUT',
      body: { role: newRole }
    });
    if (res.success) {
      loadGroupDetail(selectedGroup.id);
    } else {
      alert(res.message || 'Failed to update role');
    }
  };

  // Filter groups by category & search
  const displayedGroups = (activeTab === 'discover' ? groups : myGroups).filter(g => {
    const matchCategory = selectedCategory === 'ALL' || g.category === selectedCategory;
    const matchSearch = !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const isGroupAdmin = selectedGroup && (
    selectedGroup.currentUserRole === 'OWNER' ||
    selectedGroup.currentUserRole === 'ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN'
  );

  return (
    <div className="w-full max-w-4xl mx-auto py-2">
      {/* If single group selected: render group detail */}
      {selectedGroup ? (
        <div className="space-y-6">
          {/* Back button */}
          <button
            onClick={() => setSelectedGroup(null)}
            className="flex items-center space-x-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Groups</span>
          </button>

          {/* Group Header Banner Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            {/* Cover */}
            <div className="h-44 sm:h-56 bg-gradient-to-r from-indigo-700 via-sky-600 to-teal-600 relative">
              {selectedGroup.cover_url && (
                <img src={selectedGroup.cover_url} alt="" className="w-full h-full object-cover" />
              )}
            </div>

            <div className="px-6 pb-6 pt-4 relative">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-18 gap-4 mb-4">
                <div className="flex items-end space-x-4">
                  <img
                    src={selectedGroup.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${selectedGroup.slug}`}
                    alt=""
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white dark:border-slate-900 shadow-xl bg-white"
                  />
                  <div className="mb-1">
                    <div className="flex items-center space-x-2">
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                        {selectedGroup.name}
                      </h2>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                      <span className="flex items-center space-x-1">
                        {selectedGroup.privacy === 'PUBLIC' ? (
                          <Globe className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        <span>{selectedGroup.privacy} GROUP</span>
                      </span>
                      <span>•</span>
                      <span>{selectedGroup.members_count} members</span>
                      <span>•</span>
                      <span>{selectedGroup.posts_count} posts</span>
                    </div>
                  </div>
                </div>

                {/* Membership Action Button */}
                <div className="flex items-center space-x-2">
                  {selectedGroup.isMember ? (
                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-xl flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Member ({selectedGroup.currentUserRole})</span>
                      </span>
                      {selectedGroup.currentUserRole !== 'OWNER' && (
                        <button
                          onClick={() => handleLeave(selectedGroup.id)}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-semibold rounded-xl transition-colors"
                        >
                          Leave
                        </button>
                      )}
                    </div>
                  ) : selectedGroup.hasPendingRequest ? (
                    <span className="px-3.5 py-1.5 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 text-xs font-semibold rounded-xl flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Request Pending</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleJoin(selectedGroup.id)}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-xs transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{selectedGroup.privacy === 'PUBLIC' ? 'Join Group' : 'Request to Join'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Group Description */}
              {selectedGroup.description && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-4 whitespace-pre-line">
                  {selectedGroup.description}
                </p>
              )}

              {/* Group Tabs */}
              <div className="flex items-center space-x-1 border-t border-slate-100 dark:border-slate-800 pt-3">
                <button
                  onClick={() => setDetailTab('posts')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    detailTab === 'posts'
                      ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  Discussion
                </button>
                <button
                  onClick={() => setDetailTab('members')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    detailTab === 'members'
                      ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  Members ({selectedGroup.members_count})
                </button>
                {isGroupAdmin && selectedGroup.privacy === 'PRIVATE' && (
                  <button
                    onClick={() => setDetailTab('requests')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors relative ${
                      detailTab === 'requests'
                        ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    Join Requests
                    {joinRequests.length > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
                        {joinRequests.length}
                      </span>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setDetailTab('rules')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    detailTab === 'rules'
                      ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  About & Rules
                </button>
              </div>
            </div>
          </div>

          {/* TAB: DISCUSSION */}
          {detailTab === 'posts' && (
            <div className="space-y-4">
              {/* If member: show post prompt */}
              {selectedGroup.isMember && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3">
                  <img
                    src={user?.profile.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${user?.profile.username}`}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                  <button
                    onClick={() => setCreatePostOpen(true)}
                    className="flex-1 text-left px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm text-slate-500 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-colors"
                  >
                    Share code, architecture insights, or start a discussion in {selectedGroup.name}...
                  </button>
                </div>
              )}

              {loadingDetail ? (
                <div className="py-16 text-center text-xs text-slate-400">Loading group discussions...</div>
              ) : groupPosts.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800">
                  <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">No Posts in this Group Yet</h4>
                  <p className="text-xs text-slate-400 mt-1 mb-4">
                    Be the first member to start an engineering conversation!
                  </p>
                  {selectedGroup.isMember && (
                    <button
                      onClick={() => setCreatePostOpen(true)}
                      className="px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-semibold"
                    >
                      Post in Group
                    </button>
                  )}
                </div>
              ) : (
                groupPosts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onPostUpdated={() => loadGroupDetail(selectedGroup.id)}
                    onSelectUser={onSelectUser}
                  />
                ))
              )}
            </div>
          )}

          {/* TAB: MEMBERS */}
          {detailTab === 'members' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">
                Group Members ({groupMembers.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupMembers.map(m => (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3"
                  >
                    <div
                      className="flex items-center space-x-3 cursor-pointer min-w-0"
                      onClick={() => onSelectUser && m.profile && onSelectUser(m.profile.username)}
                    >
                      <img
                        src={m.profile?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${m.profile?.username}`}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {m.profile?.full_name}
                          </h4>
                          {m.role === 'OWNER' && (
                            <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[9px] font-extrabold rounded-md flex items-center gap-0.5">
                              <Crown className="w-2.5 h-2.5" /> OWNER
                            </span>
                          )}
                          {m.role === 'ADMIN' && (
                            <span className="px-1.5 py-0.2 bg-sky-500 text-white text-[9px] font-extrabold rounded-md">
                              ADMIN
                            </span>
                          )}
                          {m.role === 'MODERATOR' && (
                            <span className="px-1.5 py-0.2 bg-indigo-500 text-white text-[9px] font-extrabold rounded-md">
                              MOD
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">@{m.profile?.username}</p>
                      </div>
                    </div>

                    {/* Admin Moderation Controls */}
                    {isGroupAdmin && m.user_id !== user?.id && m.role !== 'OWNER' && (
                      <div className="flex items-center space-x-1 shrink-0">
                        <select
                          value={m.role}
                          onChange={e => handleUpdateRole(m.user_id, e.target.value)}
                          className="px-2 py-1 text-[11px] rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                        >
                          <option value="MEMBER">Member</option>
                          <option value="MODERATOR">Moderator</option>
                          <option value="ADMIN">Admin</option>
                        </select>

                        <button
                          title="Remove from group"
                          onClick={() => handleRemoveMember(m.user_id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: JOIN REQUESTS (Private group admins) */}
          {detailTab === 'requests' && isGroupAdmin && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">
                Pending Join Requests ({joinRequests.length})
              </h3>

              {joinRequests.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  No pending join requests for this private group.
                </div>
              ) : (
                <div className="space-y-3">
                  {joinRequests.map(req => (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3"
                    >
                      <div
                        className="flex items-center space-x-3 cursor-pointer"
                        onClick={() => onSelectUser && req.user?.username && onSelectUser(req.user.username)}
                      >
                        <img
                          src={req.user?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${req.user?.username}`}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 hover:ring-2 hover:ring-sky-500/50 transition-all"
                        />
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white hover:underline">
                            {req.user?.full_name}
                          </h4>
                          <p className="text-[11px] text-slate-400">@{req.user?.username}</p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>Requested {new Date(req.created_at).toLocaleDateString()}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleApproveRequest(req.id)}
                          className="px-3 py-1.5 bg-sky-600 text-white rounded-xl text-xs font-semibold flex items-center space-x-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.id)}
                          className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: RULES & ABOUT */}
          {detailTab === 'rules' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Group Guidelines & Rules</h3>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                  {selectedGroup.rules || 'No custom rules defined yet. Standard DevSphere Community Guidelines apply.'}
                </div>
              </div>

              <div className="pt-2 text-xs text-slate-400">
                Created on {new Date(selectedGroup.created_at).toLocaleDateString()} by @{selectedGroup.owner?.username || 'admin'}
              </div>
            </div>
          )}

          {/* Create Post in Group Modal */}
          <CreatePostModal
            isOpen={createPostOpen}
            onClose={() => setCreatePostOpen(false)}
            onPostCreated={() => {
              setCreatePostOpen(false);
              loadGroupDetail(selectedGroup.id);
            }}
            groupId={selectedGroup.id}
          />
        </div>
      ) : (
        /* GROUPS LIST VIEW */
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Engineering Groups</h2>
                  <p className="text-xs text-slate-500">
                    Join topic communities, discuss system designs, and collaborate.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    if (!user) authModal.open('login');
                    else setCreateModalOpen(true);
                  }}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Group</span>
                </button>
              </div>
            </div>

            {/* Sub-tab & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl shrink-0">
                <button
                  onClick={() => setActiveTab('discover')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    activeTab === 'discover'
                      ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Discover ({groups.length})
                </button>
                {user && (
                  <button
                    onClick={() => setActiveTab('my-groups')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      activeTab === 'my-groups'
                        ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    My Groups ({myGroups.length})
                  </button>
                )}
              </div>

              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search groups by topic or name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pt-3 mt-1 pb-1 text-xs">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-xl whitespace-nowrap font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Groups Grid */}
          {loading ? (
            <div className="py-20 text-center text-xs text-slate-400">Loading communities...</div>
          ) : displayedGroups.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">No Groups Found</h4>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Be the founder of the next great developer group on DevSphere!
              </p>
              <button
                onClick={() => {
                  if (!user) authModal.open('login');
                  else setCreateModalOpen(true);
                }}
                className="px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-semibold"
              >
                Create Group
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedGroups.map(grp => (
                <div
                  key={grp.id}
                  onClick={() => loadGroupDetail(grp.id)}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:border-sky-500/50 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    {/* Cover Photo */}
                    <div className="h-28 bg-gradient-to-r from-sky-600 to-indigo-600 relative">
                      {grp.cover_url && (
                        <img src={grp.cover_url} alt="" className="w-full h-full object-cover" />
                      )}
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-semibold text-white flex items-center gap-1">
                        {grp.privacy === 'PUBLIC' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {grp.privacy}
                      </span>
                    </div>

                    <div className="p-4 relative">
                      <div className="flex items-start space-x-3 -mt-10 mb-2">
                        <img
                          src={grp.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${grp.slug}`}
                          alt=""
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-white dark:border-slate-900 shadow-md bg-white shrink-0"
                        />
                        <div className="pt-8 min-w-0">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-sky-500 transition-colors">
                            {grp.name}
                          </h4>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {grp.category}
                          </span>
                        </div>
                      </div>

                      {grp.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                          {grp.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                    <span>{grp.members_count} members • {grp.posts_count} posts</span>
                    <span className="text-sky-600 dark:text-sky-400 font-semibold group-hover:underline">
                      View Group →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CREATE GROUP MODAL */}
          {createModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
              <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Create Developer Group</h3>
                  <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateGroup} className="space-y-3.5 pt-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Group Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value)}
                      placeholder="e.g. Distributed Systems & High-Throughput DBs"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={newGroupCategory}
                      onChange={e => setNewGroupCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    >
                      {categories.filter(c => c !== 'ALL').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Privacy
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className={`p-3 rounded-xl border flex items-center space-x-2.5 cursor-pointer text-xs font-medium ${
                        newGroupPrivacy === 'PUBLIC'
                          ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}>
                        <input
                          type="radio"
                          name="privacy"
                          checked={newGroupPrivacy === 'PUBLIC'}
                          onChange={() => setNewGroupPrivacy('PUBLIC')}
                          className="hidden"
                        />
                        <Globe className="w-4 h-4 text-emerald-500" />
                        <div>
                          <div>Public</div>
                          <div className="text-[10px] text-slate-400">Anyone can join & view posts</div>
                        </div>
                      </label>

                      <label className={`p-3 rounded-xl border flex items-center space-x-2.5 cursor-pointer text-xs font-medium ${
                        newGroupPrivacy === 'PRIVATE'
                          ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}>
                        <input
                          type="radio"
                          name="privacy"
                          checked={newGroupPrivacy === 'PRIVATE'}
                          onChange={() => setNewGroupPrivacy('PRIVATE')}
                          className="hidden"
                        />
                        <Lock className="w-4 h-4 text-amber-500" />
                        <div>
                          <div>Private</div>
                          <div className="text-[10px] text-slate-400">Admin approval required</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={newGroupDesc}
                      onChange={e => setNewGroupDesc(e.target.value)}
                      placeholder="What is this group about? Who should join?"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Rules & Code of Conduct
                    </label>
                    <textarea
                      rows={2}
                      value={newGroupRules}
                      onChange={e => setNewGroupRules(e.target.value)}
                      placeholder="1. Constructive technical feedback only&#10;2. Share code and architecture diagrams&#10;3. No spam"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setCreateModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingGroup || !newGroupName.trim()}
                      className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                    >
                      {creatingGroup ? 'Creating...' : 'Create Group'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

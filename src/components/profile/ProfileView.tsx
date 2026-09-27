import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Briefcase,
  GraduationCap,
  Globe,
  Calendar,
  Edit3,
  Camera,
  Users,
  Grid,
  Bookmark,
  CheckCircle,
  X,
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  MessageSquare,
  Phone,
  Video,
  ShieldAlert,
  MoreHorizontal
} from 'lucide-react';
import { UserProfile, Post, FriendshipStatus } from '../../types.ts';
import { apiRequest, uploadMedia } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { PostCard } from '../feed/PostCard.tsx';

interface ProfileViewProps {
  username?: string;
  onOpenChat?: (userId: number) => void;
  onStartCall?: (userId: number, type: 'VOICE' | 'VIDEO') => void;
  onSelectUser?: (username: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  username,
  onOpenChat,
  onStartCall,
  onSelectUser
}) => {
  const { user, refreshUser, authModal } = useAuth();
  const targetUsername = username || user?.profile.username;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'friends' | 'about'>('posts');

  // Friendship state
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('NONE');
  const [requestId, setRequestId] = useState<number | undefined>(undefined);
  const [mutualFriends, setMutualFriends] = useState<any[]>([]);
  const [userFriends, setUserFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  // Edit Profile Modal
  const [editOpen, setEditOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [work, setWork] = useState('');
  const [education, setEducation] = useState('');
  const [website, setWebsite] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchProfileData = async () => {
    if (!targetUsername) return;
    setLoading(true);
    const res = await apiRequest<{ profile: UserProfile; posts: Post[]; isFollowing: boolean }>(
      `/users/profile/${targetUsername}`
    );
    if (res.success && res.data) {
      setProfile(res.data.profile);
      setPosts(Array.isArray(res.data.posts) ? res.data.posts : []);
      setIsFollowing(res.data.isFollowing);

      // Populate edit modal fields
      setFullName(res.data.profile.full_name);
      setBio(res.data.profile.bio || '');
      setLocation(res.data.profile.location || '');
      setWork(res.data.profile.work || '');
      setEducation(res.data.profile.education || '');
      setWebsite(res.data.profile.website || '');

      // If viewing someone else: fetch friendship status & mutual friends
      if (user && user.id !== res.data.profile.user_id) {
        fetchFriendshipData(res.data.profile.user_id);
      }
    }
    setLoading(false);
  };

  const fetchFriendshipData = async (targetUserId: number) => {
    try {
      const statusRes = await apiRequest<{ status: FriendshipStatus; requestId?: number }>(
        `/friends/status/${targetUserId}`
      );
      if (statusRes.success && statusRes.data) {
        setFriendshipStatus(statusRes.data.status);
        setRequestId(statusRes.data.requestId);
      }

      const mutualRes = await apiRequest<{ mutualFriends: any[]; count: number }>(
        `/friends/mutual/${targetUserId}`
      );
      if (mutualRes.success && mutualRes.data) {
        setMutualFriends(Array.isArray(mutualRes.data.mutualFriends) ? mutualRes.data.mutualFriends : []);
      }
    } catch (err) {
      console.error('Failed to fetch friendship data:', err);
    }
  };

  const fetchUserFriendsList = async (targetUserId: number) => {
    setLoadingFriends(true);
    try {
      const res = await apiRequest<any[]>(`/friends/${targetUserId}/list`);
      if (res.success && res.data) {
        setUserFriends(Array.isArray(res.data) ? res.data : []);
      } else {
        // Fallback: if viewing own profile, call /friends
        const selfRes = await apiRequest<any[]>('/friends');
        if (selfRes.success && selfRes.data) {
          setUserFriends(Array.isArray(selfRes.data) ? selfRes.data : []);
        }
      }
    } catch {
      setUserFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [targetUsername]);

  useEffect(() => {
    if (activeTab === 'friends' && profile) {
      fetchUserFriendsList(profile.user_id);
    }
  }, [activeTab, profile?.user_id]);

  const handleFollowToggle = async () => {
    if (!user) {
      authModal.open('login');
      return;
    }
    if (!profile) return;
    const res = await apiRequest<{ isFollowing: boolean; followersCount: number }>(
      `/users/${profile.user_id}/follow`,
      { method: 'POST' }
    );
    if (res.success && res.data) {
      setIsFollowing(res.data.isFollowing);
      setProfile(prev => (prev ? { ...prev, followers_count: res.data!.followersCount } : null));
    }
  };

  // Friendship actions
  const handleSendFriendRequest = async () => {
    if (!user) {
      authModal.open('login');
      return;
    }
    if (!profile) return;
    const res = await apiRequest<{ id: number }>(`/friends/request/${profile.user_id}`, {
      method: 'POST'
    });
    if (res.success) {
      setFriendshipStatus('REQUEST_SENT');
      if (res.data?.id) setRequestId(res.data.id);
    } else {
      alert(res.message || 'Failed to send friend request');
    }
  };

  const handleCancelRequest = async () => {
    if (!requestId) return;
    const res = await apiRequest(`/friends/requests/${requestId}/cancel`, { method: 'POST' });
    if (res.success) {
      setFriendshipStatus('NONE');
      setRequestId(undefined);
    } else {
      alert(res.message || 'Failed to cancel request');
    }
  };

  const handleAcceptRequest = async () => {
    if (!requestId) return;
    const res = await apiRequest(`/friends/requests/${requestId}/accept`, { method: 'POST' });
    if (res.success) {
      setFriendshipStatus('FRIENDS');
    } else {
      alert(res.message || 'Failed to accept request');
    }
  };

  const handleRejectRequest = async () => {
    if (!requestId) return;
    const res = await apiRequest(`/friends/requests/${requestId}/reject`, { method: 'POST' });
    if (res.success) {
      setFriendshipStatus('NONE');
      setRequestId(undefined);
    } else {
      alert(res.message || 'Failed to reject request');
    }
  };

  const handleUnfriend = async () => {
    if (!profile) return;
    if (!confirm(`Are you sure you want to unfriend ${profile.full_name}?`)) return;
    const res = await apiRequest(`/friends/${profile.user_id}`, { method: 'DELETE' });
    if (res.success) {
      setFriendshipStatus('NONE');
      setActionMenuOpen(false);
    } else {
      alert(res.message || 'Failed to unfriend');
    }
  };

  const handleBlockUser = async () => {
    if (!profile) return;
    if (!confirm(`Block ${profile.full_name}? They won't be able to message or view your profile.`)) return;
    const res = await apiRequest(`/friends/${profile.user_id}/block`, { method: 'POST' });
    if (res.success) {
      setFriendshipStatus('BLOCKED');
      setActionMenuOpen(false);
    } else {
      alert(res.message || 'Failed to block user');
    }
  };

  const handleUnblockUser = async () => {
    if (!profile) return;
    const res = await apiRequest(`/friends/${profile.user_id}/unblock`, { method: 'POST' });
    if (res.success) {
      setFriendshipStatus('NONE');
    } else {
      alert(res.message || 'Failed to unblock user');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadMedia(file, 'avatars');
      if (url) {
        await apiRequest('/users/profile', {
          method: 'PUT',
          body: { avatarUrl: url }
        });
        await refreshUser();
        fetchProfileData();
      }
    } catch (err: any) {
      alert(err.message || 'Avatar upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadMedia(file, 'covers');
      if (url) {
        await apiRequest('/users/profile', {
          method: 'PUT',
          body: { coverUrl: url }
        });
        await refreshUser();
        fetchProfileData();
      }
    } catch (err: any) {
      alert(err.message || 'Cover upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiRequest('/users/profile', {
      method: 'PUT',
      body: {
        fullName,
        bio,
        location,
        work,
        education,
        website
      }
    });

    if (res.success) {
      setEditOpen(false);
      await refreshUser();
      fetchProfileData();
    } else {
      alert(res.message || 'Failed to update profile');
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-xs text-slate-400">Loading engineer profile...</div>;
  }

  if (!profile) {
    return <div className="text-center py-20 text-xs text-slate-400">User profile not found.</div>;
  }

  const isOwner = user && user.id === profile.user_id;

  return (
    <div className="w-full max-w-4xl mx-auto py-2">
      {/* Cover and Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs mb-6">
        {/* Cover Photo */}
        <div className="relative h-44 sm:h-60 bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-700">
          {profile.cover_url && (
            <img src={profile.cover_url} alt="" className="w-full h-full object-cover" />
          )}

          {isOwner && (
            <label className="absolute bottom-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl cursor-pointer backdrop-blur-md transition-colors flex items-center space-x-1.5 text-xs font-medium">
              <Camera className="w-4 h-4" />
              <span>{uploading ? 'Uploading...' : 'Change Cover'}</span>
              <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
            </label>
          )}
        </div>

        {/* Profile Details Bar */}
        <div className="px-5 sm:px-8 pb-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 gap-4 mb-4">
            {/* Avatar */}
            <div className="relative inline-block">
              <img
                src={profile.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${profile.username}`}
                alt={profile.username}
                className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-cover border-4 border-white dark:border-slate-900 shadow-xl bg-white"
              />
              {isOwner && (
                <label className="absolute bottom-1 right-1 p-2 bg-sky-600 text-white rounded-xl shadow-lg cursor-pointer hover:bg-sky-700 transition-colors">
                  <Camera className="w-4 h-4" />
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              )}
            </div>

            {/* Action Buttons: Friendship & Communication */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {isOwner ? (
                <button
                  onClick={() => setEditOpen(true)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <>
                  {/* Friendship Button */}
                  {friendshipStatus === 'NONE' && (
                    <button
                      onClick={handleSendFriendRequest}
                      className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-xs transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Add Friend</span>
                    </button>
                  )}

                  {friendshipStatus === 'REQUEST_SENT' && (
                    <button
                      onClick={handleCancelRequest}
                      className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors"
                    >
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span>Cancel Request</span>
                    </button>
                  )}

                  {friendshipStatus === 'REQUEST_RECEIVED' && (
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={handleAcceptRequest}
                        className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1 shadow-xs"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={handleRejectRequest}
                        className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-200"
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  {friendshipStatus === 'FRIENDS' && (
                    <div className="relative">
                      <button
                        onClick={() => setActionMenuOpen(!actionMenuOpen)}
                        className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 text-xs font-semibold rounded-xl flex items-center space-x-1.5"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Friends</span>
                      </button>

                      {actionMenuOpen && (
                        <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 z-30 text-xs">
                          <button
                            onClick={handleUnfriend}
                            className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-rose-600 flex items-center space-x-2"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Unfriend</span>
                          </button>
                          <button
                            onClick={handleBlockUser}
                            className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center space-x-2"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Block User</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {friendshipStatus === 'BLOCKED' && (
                    <button
                      onClick={handleUnblockUser}
                      className="px-3.5 py-2 bg-rose-50 text-rose-600 text-xs font-semibold rounded-xl"
                    >
                      Unblock
                    </button>
                  )}

                  {/* Message & Call buttons */}
                  {onOpenChat && (
                    <button
                      title="Send Private Message"
                      onClick={() => onOpenChat(profile.user_id)}
                      className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4 text-sky-500" />
                      <span>Message</span>
                    </button>
                  )}

                  {onStartCall && (
                    <>
                      <button
                        title="Voice Call"
                        onClick={() => onStartCall(profile.user_id, 'VOICE')}
                        className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-xl transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        title="Video Call"
                        onClick={() => onStartCall(profile.user_id, 'VIDEO')}
                        className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-xl transition-colors"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {/* Follow Button */}
                  <button
                    onClick={handleFollowToggle}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      isFollowing
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* User Names & Bio */}
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {profile.full_name}
              </h1>
              <CheckCircle className="w-5 h-5 text-sky-500" />
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">@{profile.username}</p>

            {/* Mutual Friends Pill */}
            {!isOwner && mutualFriends.length > 0 && (
              <div className="flex items-center space-x-2 mt-2">
                <div className="flex -space-x-1.5 overflow-hidden">
                  {mutualFriends.slice(0, 3).map((mf: any) => (
                    <img
                      key={mf.id || mf.username}
                      src={mf.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${mf.username}`}
                      alt=""
                      className="inline-block h-5 w-5 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                    />
                  ))}
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {mutualFriends.length} mutual friend{mutualFriends.length > 1 ? 's' : ''}
                </span>
              </div>
            )}

            {profile.bio && (
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-2.5 max-w-2xl leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Quick Meta Badges */}
            <div className="flex flex-wrap gap-y-2 gap-x-4 text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              {profile.work && (
                <span className="flex items-center space-x-1">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>{profile.work}</span>
                </span>
              )}
              {profile.education && (
                <span className="flex items-center space-x-1">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  <span>{profile.education}</span>
                </span>
              )}
              {profile.location && (
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{profile.location}</span>
                </span>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1 text-sky-600 hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{profile.website.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
            </div>

            {/* Stats Counter */}
            <div className="flex items-center space-x-6 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <span className="font-bold text-slate-900 dark:text-white">{posts.length}</span>{' '}
                <span className="text-slate-500">Posts</span>
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white">{profile.followers_count}</span>{' '}
                <span className="text-slate-500">Followers</span>
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white">{profile.following_count}</span>{' '}
                <span className="text-slate-500">Following</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Tabs */}
        <div className="flex border-t border-slate-100 dark:border-slate-800 px-5 sm:px-8">
          <button
            onClick={() => setActiveTab('posts')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'posts'
                ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Posts ({posts.length})
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'friends'
                ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Friends
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'about'
                ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            About & Experience
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {!Array.isArray(posts) || posts.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <Grid className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">No Posts Yet</h3>
              <p className="text-xs text-slate-400 mt-1">This engineer hasn't published any updates or code</p>
            </div>
          ) : (
            posts.map(p => (
              <PostCard
                key={p.id}
                post={p}
                onPostUpdated={fetchProfileData}
                onSelectUser={onSelectUser}
              />
            ))
          )}
        </div>
      )}

      {/* FRIENDS TAB */}
      {activeTab === 'friends' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Friends Network</h3>
          {loadingFriends ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading friends...</div>
          ) : userFriends.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <Users className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p>No friends to display yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {userFriends.map(f => (
                <div
                  key={f.user_id || f.id}
                  onClick={() => onSelectUser && onSelectUser(f.username)}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center space-x-3 cursor-pointer hover:border-sky-500/50 transition-colors"
                >
                  <img
                    src={f.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${f.username}`}
                    alt=""
                    className="w-11 h-11 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate hover:underline">
                      {f.full_name}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">@{f.username}</p>
                    {f.work && <p className="text-[10px] text-slate-500 truncate">{f.work}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABOUT TAB */}
      {activeTab === 'about' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Developer Dossier</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <span className="text-slate-400 block mb-1">Company / Organization</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {profile.work || 'Independent Developer'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <span className="text-slate-400 block mb-1">Alma Mater / Education</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {profile.education || 'Self-Taught Engineer'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <span className="text-slate-400 block mb-1">Location</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {profile.location || 'Global Remote'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <span className="text-slate-400 block mb-1">Member Since</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {new Date(profile.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Edit Profile Details</h3>
              <button onClick={() => setEditOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5 pt-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Bio / Status
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell other engineers what you build..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Company / Work
                  </label>
                  <input
                    type="text"
                    value={work}
                    onChange={e => setWork(e.target.value)}
                    placeholder="e.g. Google, Vercel"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Alma Mater / School
                  </label>
                  <input
                    type="text"
                    value={education}
                    onChange={e => setEducation(e.target.value)}
                    placeholder="e.g. Stanford, MIT"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. San Francisco, CA"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Personal Website / Portfolio
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

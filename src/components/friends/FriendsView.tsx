import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Clock,
  ShieldAlert,
  Search,
  MessageSquare,
  Phone,
  Video,
  Check,
  X,
  MoreVertical,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { apiRequest } from '../../services/api.ts';
import { UserProfile, FriendshipStatus } from '../../types.ts';

interface FriendsViewProps {
  onSelectUser?: (username: string) => void;
  onOpenChat?: (userId: number) => void;
  onStartCall?: (userId: number, type: 'VOICE' | 'VIDEO') => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  onSelectUser,
  onOpenChat,
  onStartCall
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'sent' | 'discover' | 'blocked'>('friends');

  // Lists
  const [friends, setFriends] = useState<(UserProfile & { friendship_id?: number; mutualCount?: number })[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [discoverUsers, setDiscoverUsers] = useState<any[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Counts
  const [incomingCount, setIncomingCount] = useState(0);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<any[]>('/friends');
      if (res.success && res.data) {
        setFriends(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<any[]>('/friends/requests');
      if (res.success && res.data) {
        setIncomingRequests(Array.isArray(res.data) ? res.data : []);
        setIncomingCount(res.data.length);
      }
    } catch {
      setIncomingRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSentRequests = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<any[]>('/friends/sent');
      if (res.success && res.data) {
        setSentRequests(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      setSentRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlocked = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<any[]>('/friends/blocked');
      if (res.success && res.data) {
        setBlockedUsers(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      setBlockedUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscover = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<any[]>('/users/search?q=');
      if (res.success && res.data) {
        // filter out current user
        setDiscoverUsers(res.data.filter((u: any) => u.id !== user?.id && u.user_id !== user?.id));
      }
    } catch {
      setDiscoverUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'friends') fetchFriends();
    if (activeTab === 'requests') fetchRequests();
    if (activeTab === 'sent') fetchSentRequests();
    if (activeTab === 'discover') fetchDiscover();
    if (activeTab === 'blocked') fetchBlocked();
  }, [activeTab]);

  // Actions
  const handleAccept = async (requestId: number) => {
    const res = await apiRequest(`/friends/requests/${requestId}/accept`, { method: 'POST' });
    if (res.success) {
      fetchRequests();
      setIncomingCount(prev => Math.max(0, prev - 1));
    } else {
      alert(res.message || 'Failed to accept request');
    }
  };

  const handleReject = async (requestId: number) => {
    const res = await apiRequest(`/friends/requests/${requestId}/reject`, { method: 'POST' });
    if (res.success) {
      fetchRequests();
      setIncomingCount(prev => Math.max(0, prev - 1));
    } else {
      alert(res.message || 'Failed to reject request');
    }
  };

  const handleCancelRequest = async (requestId: number) => {
    const res = await apiRequest(`/friends/requests/${requestId}/cancel`, { method: 'POST' });
    if (res.success) {
      fetchSentRequests();
    } else {
      alert(res.message || 'Failed to cancel request');
    }
  };

  const handleUnfriend = async (friendUserId: number) => {
    if (!confirm('Are you sure you want to remove this friend?')) return;
    const res = await apiRequest(`/friends/${friendUserId}`, { method: 'DELETE' });
    if (res.success) {
      fetchFriends();
    } else {
      alert(res.message || 'Failed to unfriend');
    }
  };

  const handleBlock = async (targetUserId: number) => {
    if (!confirm('Are you sure you want to block this user? They will not be able to message or see your profile.')) return;
    const res = await apiRequest(`/friends/${targetUserId}/block`, { method: 'POST' });
    if (res.success) {
      fetchFriends();
    } else {
      alert(res.message || 'Failed to block user');
    }
  };

  const handleUnblock = async (targetUserId: number) => {
    const res = await apiRequest(`/friends/${targetUserId}/unblock`, { method: 'POST' });
    if (res.success) {
      fetchBlocked();
    } else {
      alert(res.message || 'Failed to unblock user');
    }
  };

  const handleSendFriendRequest = async (targetUserId: number) => {
    const res = await apiRequest(`/friends/request/${targetUserId}`, { method: 'POST' });
    if (res.success) {
      alert('Friend request sent!');
      fetchDiscover();
    } else {
      alert(res.message || 'Failed to send request');
    }
  };

  const filteredFriends = friends.filter(f =>
    f.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-4xl mx-auto py-2">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Friends Network</h2>
              <p className="text-xs text-slate-500">Connect, collaborate, and chat directly with verified engineers.</p>
            </div>
          </div>

          {/* Sub-tab Navigation */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl overflow-x-auto">
            <button
              onClick={() => setActiveTab('friends')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'friends'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All Friends ({friends.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap relative transition-colors ${
                activeTab === 'requests'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Requests
              {incomingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
                  {incomingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'sent'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Sent ({sentRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'discover'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Discover
            </button>
            <button
              onClick={() => setActiveTab('blocked')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'blocked'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Blocked
            </button>
          </div>
        </div>

        {/* Search Bar for Friends tab */}
        {activeTab === 'friends' && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search friends by name or username..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>
        )}
      </div>

      {/* TAB CONTENT */}

      {/* 1. ALL FRIENDS */}
      {activeTab === 'friends' && (
        <div>
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading your friends...</div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">No Friends Found</h4>
              <p className="text-xs text-slate-400 mt-1 mb-4">Discover engineers or accept pending requests to connect!</p>
              <button
                onClick={() => setActiveTab('discover')}
                className="px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-semibold"
              >
                Find People
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFriends.map(friend => (
                <div
                  key={friend.user_id || friend.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 hover:border-sky-500/40 transition-colors"
                >
                  <div
                    className="flex items-center space-x-3 cursor-pointer min-w-0"
                    onClick={() => onSelectUser && onSelectUser(friend.username)}
                  >
                    <img
                      src={friend.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${friend.username}`}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate hover:underline">
                        {friend.full_name}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">@{friend.username}</p>
                      {friend.work && (
                        <p className="text-[10px] text-slate-500 truncate">{friend.work}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    {onOpenChat && (
                      <button
                        title="Send Message"
                        onClick={() => onOpenChat(friend.user_id || friend.id)}
                        className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 hover:bg-sky-100 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    )}
                    {onStartCall && (
                      <button
                        title="Voice Call"
                        onClick={() => onStartCall(friend.user_id || friend.id, 'VOICE')}
                        className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                    )}
                    {onStartCall && (
                      <button
                        title="Video Call"
                        onClick={() => onStartCall(friend.user_id || friend.id, 'VIDEO')}
                        className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      title="Unfriend"
                      onClick={() => handleUnfriend(friend.user_id || friend.id)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. INCOMING REQUESTS */}
      {activeTab === 'requests' && (
        <div>
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading requests...</div>
          ) : incomingRequests.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800">
              <UserCheck className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">No Pending Requests</h4>
              <p className="text-xs text-slate-400 mt-1">You have responded to all incoming friend requests.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incomingRequests.map(req => (
                <div
                  key={req.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3"
                >
                  <div
                    className="flex items-center space-x-3 cursor-pointer min-w-0"
                    onClick={() => onSelectUser && req.sender && onSelectUser(req.sender.username)}
                  >
                    <img
                      src={req.sender?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${req.sender?.username}`}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {req.sender?.full_name}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">@{req.sender?.username}</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(req.created_at).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleAccept(req.id)}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm</span>
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-xl text-xs font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. SENT REQUESTS */}
      {activeTab === 'sent' && (
        <div>
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading sent requests...</div>
          ) : sentRequests.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800">
              <Clock className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">No Sent Requests</h4>
              <p className="text-xs text-slate-400 mt-1">You do not have any pending outgoing requests.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sentRequests.map(req => (
                <div
                  key={req.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3"
                >
                  <div
                    className="flex items-center space-x-3 cursor-pointer min-w-0"
                    onClick={() => onSelectUser && req.receiver && onSelectUser(req.receiver.username)}
                  >
                    <img
                      src={req.receiver?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${req.receiver?.username}`}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {req.receiver?.full_name}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">@{req.receiver?.username}</p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 text-[9px] rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-semibold">
                        Awaiting response
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCancelRequest(req.id)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors"
                  >
                    Cancel Request
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. DISCOVER / SUGGESTIONS */}
      {activeTab === 'discover' && (
        <div>
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">Finding engineers...</div>
          ) : discoverUsers.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800">
              <Sparkles className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">No New Users to Show</h4>
              <p className="text-xs text-slate-400 mt-1">Check back later for new developers joining DevSphere.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {discoverUsers.map(u => (
                <div
                  key={u.id || u.user_id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3"
                >
                  <div
                    className="flex items-center space-x-3 cursor-pointer min-w-0"
                    onClick={() => onSelectUser && onSelectUser(u.username)}
                  >
                    <img
                      src={u.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${u.username}`}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {u.full_name}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">@{u.username}</p>
                      {u.bio && (
                        <p className="text-[10px] text-slate-500 truncate">{u.bio}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleSendFriendRequest(u.user_id || u.id)}
                    className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1 shadow-xs shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Friend</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. BLOCKED USERS */}
      {activeTab === 'blocked' && (
        <div>
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading blocked list...</div>
          ) : blockedUsers.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800">
              <ShieldAlert className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">No Blocked Users</h4>
              <p className="text-xs text-slate-400 mt-1">You have not blocked any users on DevSphere.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {blockedUsers.map(b => (
                <div
                  key={b.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={b.user?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${b.user?.username}`}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                        {b.user?.full_name}
                      </h4>
                      <p className="text-[11px] text-slate-400">@{b.user?.username}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleUnblock(b.blocked_id || b.user_id || b.user?.user_id)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

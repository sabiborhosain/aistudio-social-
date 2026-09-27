import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/layout/Navbar.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { RightSidebar } from './components/layout/RightSidebar.tsx';
import { StoriesBar } from './components/stories/StoriesBar.tsx';
import { CreatePostModal } from './components/feed/CreatePostModal.tsx';
import { PostCard } from './components/feed/PostCard.tsx';
import { ReelsView } from './components/reels/ReelsView.tsx';
import { VideosView } from './components/videos/VideosView.tsx';
import { PagesView } from './components/pages/PagesView.tsx';
import { ProfileView } from './components/profile/ProfileView.tsx';
import { FriendsView } from './components/friends/FriendsView.tsx';
import { MessagesView } from './components/chat/MessagesView.tsx';
import { GroupsView } from './components/groups/GroupsView.tsx';
import { CallModal } from './components/calling/CallModal.tsx';
import { AdminPanel } from './components/admin/AdminPanel.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { Post, Call, UserProfile } from './types.ts';
import { apiRequest } from './services/api.ts';
import { socketService } from './services/socket.ts';
import {
  Code2,
  Image as ImageIcon,
  Smile,
  Bookmark,
  Sparkles,
  Lock,
  X,
  AlertCircle
} from 'lucide-react';

function MainApp() {
  const { user, authModal } = useAuth();

  // Helper to parse route from current window.location.pathname
  const parseCurrentRoute = () => {
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    const profileMatch = path.match(/^\/(?:profile|u)\/([^/?#]+)/i);
    if (profileMatch) {
      const param = decodeURIComponent(profileMatch[1]);
      return { tab: 'profile' as const, profileParam: param, chatUserId: null };
    }
    const messagesMatch = path.match(/^\/(?:messages|chat)(?:\/(\d+))?/i);
    if (messagesMatch) {
      const recipientId = messagesMatch[1] ? parseInt(messagesMatch[1]) : null;
      return { tab: 'messages' as const, profileParam: undefined, chatUserId: recipientId };
    }
    if (path.startsWith('/friends')) return { tab: 'friends' as const, profileParam: undefined, chatUserId: null };
    if (path.startsWith('/groups')) return { tab: 'groups' as const, profileParam: undefined, chatUserId: null };
    if (path.startsWith('/saved')) return { tab: 'saved' as const, profileParam: undefined, chatUserId: null };
    if (path.startsWith('/reels')) return { tab: 'reels' as const, profileParam: undefined, chatUserId: null };
    if (path.startsWith('/videos')) return { tab: 'videos' as const, profileParam: undefined, chatUserId: null };
    if (path.startsWith('/pages')) return { tab: 'pages' as const, profileParam: undefined, chatUserId: null };
    if (path.startsWith('/admin')) return { tab: 'admin' as const, profileParam: undefined, chatUserId: null };
    if (path.startsWith('/profile')) return { tab: 'profile' as const, profileParam: undefined, chatUserId: null };
    return { tab: 'feed' as const, profileParam: undefined, chatUserId: null };
  };

  const initialRoute = parseCurrentRoute();
  const [activeTab, setActiveTab] = useState<
    'feed' | 'reels' | 'videos' | 'pages' | 'profile' | 'admin' | 'saved' | 'friends' | 'messages' | 'groups'
  >(initialRoute.tab);
  const [feedFilter, setFeedFilter] = useState<'all' | 'following' | 'code'>('all');
  const [selectedProfileUsername, setSelectedProfileUsername] = useState<string | undefined>(initialRoute.profileParam);
  const [selectedChatUserId, setSelectedChatUserId] = useState<number | null>(initialRoute.chatUserId);

  // Sync route on popstate (browser back / forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const route = parseCurrentRoute();
      setActiveTab(route.tab);
      setSelectedProfileUsername(route.profileParam);
      if (route.chatUserId !== null) {
        setSelectedChatUserId(route.chatUserId);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Calling state
  const [callState, setCallState] = useState<{
    isOpen: boolean;
    mode: 'incoming' | 'outgoing' | 'connected';
    call: Call | null;
    targetUser?: UserProfile | null;
    callType: 'VOICE' | 'VIDEO';
  }>({
    isOpen: false,
    mode: 'outgoing',
    call: null,
    targetUser: null,
    callType: 'VOICE'
  });

  // Posts Feed state
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [createPostOpen, setCreatePostOpen] = useState(false);

  // Forced password change modal for security compliance
  const [showPasswordChangePrompt, setShowPasswordChangePrompt] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Check if user must change password
  useEffect(() => {
    if (user?.mustChangePassword) {
      setShowPasswordChangePrompt(true);
    }
  }, [user]);

  // Connect socket and register listeners
  useEffect(() => {
    if (!user) {
      socketService.disconnect();
      return;
    }

    socketService.connect();

    const unbindIncoming = socketService.on('call:incoming', (data: any) => {
      setCallState({
        isOpen: true,
        mode: 'incoming',
        call: {
          id: data.callId,
          caller_id: data.callerId,
          receiver_id: user.id,
          call_type: data.callType || 'VOICE',
          status: 'RINGING',
          duration_seconds: 0,
          created_at: data.timestamp || new Date().toISOString()
        },
        targetUser: data.caller,
        callType: data.callType || 'VOICE'
      });
    });

    const unbindAccepted = socketService.on('call:accepted', () => {
      setCallState(prev => ({ ...prev, mode: 'connected' }));
    });

    const unbindRejected = socketService.on('call:rejected', () => {
      alert('Call was declined.');
      setCallState(prev => ({ ...prev, isOpen: false }));
    });

    const unbindEnded = socketService.on('call:ended', () => {
      setCallState(prev => ({ ...prev, isOpen: false }));
    });

    return () => {
      unbindIncoming();
      unbindAccepted();
      unbindRejected();
      unbindEnded();
    };
  }, [user?.id]);

  // Fetch feed
  const fetchFeed = async () => {
    setLoadingPosts(true);
    let url = '/posts';
    if (activeTab === 'saved') {
      url = '/posts/saved';
    } else {
      url = `/posts?feedType=${feedFilter}`;
    }

    try {
      const res = await apiRequest<{ posts: Post[]; pagination?: any } | Post[]>(url);
      if (res.success && res.data) {
        if (Array.isArray(res.data)) {
          setPosts(res.data);
        } else if (res.data && Array.isArray((res.data as any).posts)) {
          setPosts((res.data as any).posts);
        } else {
          setPosts([]);
        }
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.error('Error fetching feed:', err);
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'feed' || activeTab === 'saved') {
      fetchFeed();
    }
  }, [activeTab, feedFilter]);

  const handleSelectUser = (userParam: string | number) => {
    const param = String(userParam).trim();
    setSelectedProfileUsername(param);
    setActiveTab('profile');
    const newPath = `/profile/${encodeURIComponent(param)}`;
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenChatWithUser = (userId: number) => {
    setSelectedChatUserId(userId);
    setActiveTab('messages');
    const newPath = `/messages/${userId}`;
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === 'profile') {
      const myUsername = user?.profile?.username || (user?.id ? String(user.id) : undefined);
      if (myUsername) {
        setSelectedProfileUsername(myUsername);
        const newPath = `/profile/${encodeURIComponent(myUsername)}`;
        if (window.location.pathname !== newPath) {
          window.history.pushState(null, '', newPath);
        }
      } else {
        const newPath = '/profile';
        if (window.location.pathname !== newPath) {
          window.history.pushState(null, '', newPath);
        }
      }
    } else {
      setSelectedProfileUsername(undefined);
      const newPath = tab === 'feed' ? '/' : `/${tab}`;
      if (window.location.pathname !== newPath) {
        window.history.pushState(null, '', newPath);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartCall = async (targetUserId: number, type: 'VOICE' | 'VIDEO') => {
    if (!user) {
      authModal.open('login');
      return;
    }

    try {
      const res = await apiRequest<Call>('/calls', {
        method: 'POST',
        body: {
          receiver_id: targetUserId,
          call_type: type
        }
      });

      if (res.success && res.data) {
        setCallState({
          isOpen: true,
          mode: 'outgoing',
          call: res.data,
          targetUser: res.data.receiver || null,
          callType: type
        });

        // Send websocket signaling invite
        socketService.send('call:invite', {
          receiverId: targetUserId,
          callType: type,
          callId: res.data.id
        });
      } else {
        alert(res.message || 'Failed to initiate call');
      }
    } catch (err: any) {
      alert(err.message || 'Calling error');
    }
  };

  const handleAcceptCall = async () => {
    if (!callState.call) return;
    try {
      await apiRequest(`/calls/${callState.call.id}`, {
        method: 'PUT',
        body: { status: 'ACCEPTED' }
      });
      socketService.send('call:accept', {
        callerId: callState.call.caller_id,
        callId: callState.call.id
      });
      setCallState(prev => ({ ...prev, mode: 'connected' }));
    } catch (err) {
      console.error('Accept call error:', err);
    }
  };

  const handleRejectCall = async () => {
    if (!callState.call) return;
    try {
      await apiRequest(`/calls/${callState.call.id}`, {
        method: 'PUT',
        body: { status: 'REJECTED' }
      });
      socketService.send('call:reject', {
        callerId: callState.call.caller_id,
        callId: callState.call.id
      });
    } catch {
      // Ignored
    } finally {
      setCallState(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleEndCall = async () => {
    if (!callState.call) return;
    try {
      await apiRequest(`/calls/${callState.call.id}`, {
        method: 'PUT',
        body: { status: 'ENDED' }
      });
      const otherUserId = callState.call.caller_id === user?.id ? callState.call.receiver_id : callState.call.caller_id;
      socketService.send('call:end', {
        otherUserId,
        callId: callState.call.id
      });
    } catch {
      // Ignored
    } finally {
      setCallState(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    setSavingPassword(true);
    const res = await apiRequest('/auth/password/update', {
      method: 'POST',
      body: { newPassword }
    });
    setSavingPassword(false);
    if (res.success) {
      alert('Password updated securely. You are all set!');
      setShowPasswordChangePrompt(false);
    } else {
      alert(res.message || 'Failed to update password');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased pb-16 md:pb-0">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onSelectUser={handleSelectUser}
      />

      {/* Mandatory Change Default Password Banner */}
      {user?.mustChangePassword && showPasswordChangePrompt && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 flex items-center justify-between text-xs font-semibold shadow-xs">
          <div className="flex items-center space-x-2 max-w-4xl mx-auto w-full">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Security Notice: You are logged in with the initial default password. Please update your account password for security.
            </span>
            <button
              onClick={() => setShowPasswordChangePrompt(true)}
              className="ml-auto underline font-bold px-2 py-0.5 rounded bg-black/10 hover:bg-black/20"
            >
              Update Password Now
            </button>
          </div>
        </div>
      )}

      {/* App Body Container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 w-full flex-1 flex">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          feedFilter={feedFilter}
          setFeedFilter={setFeedFilter}
          onSelectUser={handleSelectUser}
        />

        {/* Center Main Content Area */}
        <main className="flex-1 min-w-0 py-6 px-0 sm:px-4 lg:px-6">
          {/* TAB: FEED */}
          {activeTab === 'feed' && (
            <div className="max-w-2xl mx-auto">
              {/* Ephemeral Stories Bar */}
              <StoriesBar />

              {/* Create Post Prompt Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs mb-5">
                <div className="flex items-center space-x-3 mb-3">
                  <img
                    src={
                      user?.profile.avatar_url ||
                      `https://api.dicebear.com/7.x/identicon/svg?seed=${user?.profile.username || 'user'}`
                    }
                    alt=""
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                  <button
                    onClick={() => {
                      if (!user) authModal.open('login');
                      else setCreatePostOpen(true);
                    }}
                    className="flex-1 text-left px-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-800 text-xs sm:text-sm text-slate-500 dark:text-slate-400 rounded-xl transition-colors"
                  >
                    Share code snippet, architecture update, or demo...
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      if (!user) authModal.open('login');
                      else setCreatePostOpen(true);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                  >
                    <Code2 className="w-4 h-4" />
                    <span>Code Snippet</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!user) authModal.open('login');
                      else setCreatePostOpen(true);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Photo / Video</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!user) authModal.open('login');
                      else setCreatePostOpen(true);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                  >
                    <Smile className="w-4 h-4" />
                    <span>Feeling / Activity</span>
                  </button>
                </div>
              </div>

              {/* Feed Filter Segment Pills */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setFeedFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      feedFilter === 'all'
                        ? 'bg-sky-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    All Updates
                  </button>

                  <button
                    onClick={() => setFeedFilter('code')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      feedFilter === 'code'
                        ? 'bg-sky-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Code Snippets</span>
                  </button>

                  {user && (
                    <button
                      onClick={() => setFeedFilter('following')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        feedFilter === 'following'
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      Following
                    </button>
                  )}
                </div>

                <span className="text-xs text-slate-400 font-medium">
                  {Array.isArray(posts) ? posts.length : 0} {Array.isArray(posts) && posts.length === 1 ? 'post' : 'posts'}
                </span>
              </div>

              {/* Posts Stream */}
              {loadingPosts ? (
                <div className="py-20 text-center text-xs text-slate-400">Loading developer feed...</div>
              ) : !Array.isArray(posts) || posts.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800">
                  <Sparkles className="w-10 h-10 text-sky-500 mx-auto mb-2" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">No Posts in this Feed</h3>
                  <p className="text-xs text-slate-400 mt-1 mb-4">
                    Be the first to share your code or insights!
                  </p>
                  <button
                    onClick={() => setCreatePostOpen(true)}
                    className="px-4 py-2 bg-sky-600 text-white text-xs font-semibold rounded-xl"
                  >
                    Create Post
                  </button>
                </div>
              ) : (
                posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onPostUpdated={fetchFeed}
                    onSelectUser={handleSelectUser}
                  />
                ))
              )}
            </div>
          )}

          {/* TAB: FRIENDS */}
          {activeTab === 'friends' && (
            <FriendsView
              onSelectUser={handleSelectUser}
              onOpenChat={handleOpenChatWithUser}
              onStartCall={handleStartCall}
            />
          )}

          {/* TAB: MESSAGES */}
          {activeTab === 'messages' && (
            <MessagesView
              initialRecipientId={selectedChatUserId}
              onStartCall={handleStartCall}
              onSelectUser={handleSelectUser}
            />
          )}

          {/* TAB: GROUPS */}
          {activeTab === 'groups' && (
            <GroupsView onSelectUser={handleSelectUser} />
          )}

          {/* TAB: SAVED BOOKMARKS */}
          {activeTab === 'saved' && (
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center space-x-2 mb-4">
                <Bookmark className="w-5 h-5 text-sky-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Saved Bookmarks</h2>
              </div>

              {loadingPosts ? (
                <div className="py-20 text-center text-xs text-slate-400">Loading saved posts...</div>
              ) : !Array.isArray(posts) || posts.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800">
                  <Bookmark className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">No Saved Posts</h3>
                  <p className="text-xs text-slate-400 mt-1">Bookmark posts to reference their code solutions later</p>
                </div>
              ) : (
                posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onPostUpdated={fetchFeed}
                    onSelectUser={handleSelectUser}
                  />
                ))
              )}
            </div>
          )}

          {/* TAB: REELS */}
          {activeTab === 'reels' && <ReelsView />}

          {/* TAB: VIDEOS */}
          {activeTab === 'videos' && <VideosView />}

          {/* TAB: PAGES */}
          {activeTab === 'pages' && <PagesView />}

          {/* TAB: PROFILE */}
          {activeTab === 'profile' && (
            <ProfileView
              username={selectedProfileUsername}
              onOpenChat={handleOpenChatWithUser}
              onStartCall={handleStartCall}
              onSelectUser={handleSelectUser}
            />
          )}

          {/* TAB: ADMIN */}
          {activeTab === 'admin' && <AdminPanel />}
        </main>

        {/* Right Sidebar Widget */}
        <RightSidebar onSelectUser={handleSelectUser} />
      </div>

      {/* Global Create Post Modal */}
      <CreatePostModal
        isOpen={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        onPostCreated={fetchFeed}
      />

      {/* Global Auth Modal */}
      <AuthModal />

      {/* Global WebRTC CallModal */}
      {callState.isOpen && (
        <CallModal
          isOpen={callState.isOpen}
          onClose={() => setCallState(prev => ({ ...prev, isOpen: false }))}
          mode={callState.mode}
          call={callState.call}
          targetUser={callState.targetUser}
          callType={callState.callType}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
          onEndCall={handleEndCall}
        />
      )}

      {/* Forced Password Change Modal */}
      {showPasswordChangePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2 text-amber-600 mb-2">
              <Lock className="w-5 h-5" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Change Default Password</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Your account currently uses the setup password (<code className="font-mono">100200300</code>). Set your personal password below:
            </p>
            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordChangePrompt(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                >
                  Remind Me Later
                </button>
                <button
                  type="submit"
                  disabled={savingPassword || newPassword.length < 6}
                  className="px-4 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-xl disabled:opacity-50"
                >
                  {savingPassword ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import {
  Code2,
  Home,
  Tv,
  Film,
  Flag,
  Bell,
  Search,
  Shield,
  Bookmark,
  LogOut,
  User,
  Settings,
  Sun,
  Moon,
  Check,
  ChevronDown,
  Users,
  MessageSquare,
  Sparkles,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { apiRequest } from '../../services/api.ts';
import { NotificationItem } from '../../types.ts';
import { socketService } from '../../services/socket.ts';

interface NavbarProps {
  activeTab: 'feed' | 'reels' | 'videos' | 'pages' | 'profile' | 'admin' | 'saved' | 'friends' | 'groups' | 'messages';
  setActiveTab: (tab: any) => void;
  onSelectUser?: (username: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onSelectUser }) => {
  const { user, logout, authModal } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [friendRequestsCount, setFriendRequestsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await apiRequest<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications');
      if (res.success && res.data) {
        setNotifications(Array.isArray(res.data.notifications) ? res.data.notifications : []);
        setUnreadCount(typeof res.data.unreadCount === 'number' ? res.data.unreadCount : 0);
      } else {
        setNotifications([]);
      }
    } catch {
      setNotifications([]);
    }
  };

  // Fetch friend requests count
  const fetchFriendRequestsCount = async () => {
    if (!user) return;
    try {
      const res = await apiRequest<any[]>('/friends/requests');
      if (res.success && Array.isArray(res.data)) {
        setFriendRequestsCount(res.data.length);
      }
    } catch {
      // Ignored
    }
  };

  // Fetch unread messages count
  const fetchUnreadMessagesCount = async () => {
    if (!user) return;
    try {
      const res = await apiRequest<any[]>('/chat/conversations');
      if (res.success && Array.isArray(res.data)) {
        const total = res.data.reduce((acc: number, c: any) => acc + (c.unread_count || c.unreadCount || 0), 0);
        setUnreadMessagesCount(total);
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchFriendRequestsCount();
      fetchUnreadMessagesCount();

      // Listen for socket events
      const unbindFriend = socketService.on('friend:request_received', () => {
        setFriendRequestsCount(prev => prev + 1);
        fetchNotifications();
      });

      const unbindChat = socketService.on('chat:message_received', () => {
        setUnreadMessagesCount(prev => prev + 1);
      });

      return () => {
        unbindFriend();
        unbindChat();
      };
    }
  }, [user]);

  // Handle search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest<any[]>(`/users/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.success && res.data) {
          setSearchResults(Array.isArray(res.data) ? res.data : []);
          setSearchOpen(true);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markNotifRead = async (id: number) => {
    await apiRequest(`/notifications/${id}/read`, { method: 'PUT' });
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: 1 } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md bg-opacity-95 dark:bg-opacity-95 transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          {/* Left: Brand Logo & Search */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => setActiveTab('feed')}
              className="flex items-center space-x-2.5 group focus:outline-hidden"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20 group-hover:scale-105 transition-transform">
                <Code2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  DevSphere
                  <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                    v1.0
                  </span>
                </span>
                <p className="text-[11px] text-slate-500 font-medium -mt-1">For Engineers & Builders</p>
              </div>
            </button>

            {/* Search Bar */}
            <div className="relative hidden md:block w-48 lg:w-64" ref={searchRef}>
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search engineers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:bg-white dark:focus:bg-slate-800/90 transition-all"
              />
              {/* Search Dropdown */}
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="p-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    People on DevSphere
                  </div>
                  {searchResults.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (onSelectUser) onSelectUser(p.username);
                        setActiveTab('profile');
                        setSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="w-full px-3 py-2 flex items-center space-x-3 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors text-left"
                    >
                      <img
                        src={p.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${p.username}`}
                        alt={p.username}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          {p.full_name}
                        </div>
                        <div className="text-[11px] text-slate-500">@{p.username}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Center: Primary Navigation Tabs (Desktop) */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5">
            <button
              onClick={() => setActiveTab('feed')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'feed'
                  ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>

            <button
              onClick={() => setActiveTab('friends')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors relative ${
                activeTab === 'friends'
                  ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Friends</span>
              {friendRequestsCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {friendRequestsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('messages')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors relative ${
                activeTab === 'messages'
                  ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Messages</span>
              {unreadMessagesCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-sky-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadMessagesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('groups')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'groups'
                  ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Groups</span>
            </button>

            <button
              onClick={() => setActiveTab('reels')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'reels'
                  ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Film className="w-4 h-4" />
              <span className="hidden lg:inline">Reels</span>
            </button>

            <button
              onClick={() => setActiveTab('videos')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'videos'
                  ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span className="hidden lg:inline">Videos</span>
            </button>

            <button
              onClick={() => setActiveTab('pages')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'pages'
                  ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Flag className="w-4 h-4" />
              <span className="hidden lg:inline">Pages</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  activeTab === 'admin'
                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 shadow-2xs'
                    : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </button>
            )}
          </nav>

          {/* Right: Actions, Notifications, Profile Dropdown */}
          <div className="flex items-center space-x-2">
            {user ? (
              <>
                {/* Notification Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                    className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 relative transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Popover */}
                  {notifDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">Notifications</span>
                        <span className="text-xs text-sky-600 font-medium">{unreadCount} unread</span>
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 text-xs">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div
                              key={n.id}
                              onClick={() => markNotifRead(n.id)}
                              className={`p-3.5 flex items-start space-x-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                                !n.is_read ? 'bg-sky-50/50 dark:bg-sky-950/20' : ''
                              }`}
                            >
                              <img
                                src={n.actor?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${n.actor?.username || 'user'}`}
                                alt="Actor"
                                className="w-9 h-9 rounded-full object-cover shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-2">
                                  {n.message}
                                </p>
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                  {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              {!n.is_read && (
                                <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0 mt-1.5" />
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center space-x-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <img
                      src={
                        user.profile.avatar_url ||
                        `https://api.dicebear.com/7.x/identicon/svg?seed=${user.profile.username}`
                      }
                      alt={user.profile.username}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-sky-500/30"
                    />
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* Profile Menu Dropdown */}
                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-1.5 z-50 text-xs">
                      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {user.profile.full_name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">@{user.profile.username}</p>
                      </div>

                      <button
                        onClick={() => {
                          setActiveTab('profile');
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center space-x-2"
                      >
                        <User className="w-4 h-4" />
                        <span>View Profile</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('friends');
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center space-x-2"
                      >
                        <Users className="w-4 h-4" />
                        <span>Friends Network</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('messages');
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center space-x-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Direct Messages</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('saved');
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center space-x-2"
                      >
                        <Bookmark className="w-4 h-4" />
                        <span>Saved Bookmarks</span>
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => {
                            setActiveTab('admin');
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 font-semibold flex items-center space-x-2"
                        >
                          <Shield className="w-4 h-4" />
                          <span>Admin Panel</span>
                        </button>
                      )}

                      <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                      <button
                        onClick={() => {
                          logout();
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 flex items-center space-x-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => authModal.open('login')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Log In
                </button>
                <button
                  onClick={() => authModal.open('register')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition-colors"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar - Visible on Small Screens */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around py-1.5 px-2 shadow-2xl backdrop-blur-md bg-opacity-95">
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex flex-col items-center p-1 rounded-xl text-[10px] font-semibold transition-colors ${
            activeTab === 'feed' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => setActiveTab('friends')}
          className={`flex flex-col items-center p-1 rounded-xl text-[10px] font-semibold relative transition-colors ${
            activeTab === 'friends' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <div className="relative">
            <Users className="w-5 h-5 mb-0.5" />
            {friendRequestsCount > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {friendRequestsCount}
              </span>
            )}
          </div>
          <span>Friends</span>
        </button>

        <button
          onClick={() => setActiveTab('messages')}
          className={`flex flex-col items-center p-1 rounded-xl text-[10px] font-semibold relative transition-colors ${
            activeTab === 'messages' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 mb-0.5" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-sky-600 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadMessagesCount}
              </span>
            )}
          </div>
          <span>Messages</span>
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={`flex flex-col items-center p-1 rounded-xl text-[10px] font-semibold transition-colors ${
            activeTab === 'groups' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Layers className="w-5 h-5 mb-0.5" />
          <span>Groups</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center p-1 rounded-xl text-[10px] font-semibold transition-colors ${
            activeTab === 'profile' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {user ? (
            <img
              src={
                user.profile.avatar_url ||
                `https://api.dicebear.com/7.x/identicon/svg?seed=${user.profile.username}`
              }
              alt=""
              className="w-5 h-5 rounded-full object-cover mb-0.5 ring-1 ring-slate-300 dark:ring-slate-700"
            />
          ) : (
            <User className="w-5 h-5 mb-0.5" />
          )}
          <span>Profile</span>
        </button>
      </nav>
    </>
  );
};

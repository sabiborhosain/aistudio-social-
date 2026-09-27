export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DEACTIVATED';
export type PostType = 'NORMAL' | 'CODE' | 'MEDIA' | 'MIXED';
export type PostPrivacy = 'PUBLIC' | 'FRIENDS' | 'ONLY_ME';
export type BlockType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'CODE' | 'LINK';
export type ReactionType = 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY' | 'CODE';
export type MediaType = 'IMAGE' | 'VIDEO' | 'TEXT';
export type StorageType = 'LOCAL' | 'R2';

export interface User {
  id: number;
  email: string;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  is_email_verified: number;
  must_change_password: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: number;
  user_id: number;
  username: string;
  full_name: string;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  work: string | null;
  education: string | null;
  gender: string | null;
  followers_count: number;
  following_count: number;
  friends_count: number;
  posts_count: number;
  created_at: string;
  updated_at: string;
}

export interface PostBlock {
  id?: number;
  post_id?: number;
  block_order: number;
  block_type: BlockType;
  content: string;
  meta_json?: {
    language?: string;
    title?: string;
    url?: string;
    width?: number;
    height?: number;
  } | null;
}

export interface Post {
  id: number;
  user_id: number;
  page_id?: number | null;
  group_id?: number | null;
  post_type: PostType;
  privacy: PostPrivacy;
  content: string | null;
  location_name?: string | null;
  feeling_emoji?: string | null;
  feeling_text?: string | null;
  reactions_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  is_pinned: number;
  is_deleted: number;
  created_at: string;
  updated_at: string;
  author?: UserProfile;
  blocks?: PostBlock[];
  userReaction?: ReactionType | null;
  isSaved?: boolean;
  group?: any;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  parent_id: number | null;
  content: string;
  code_snippet: string | null;
  code_language: string | null;
  image_url: string | null;
  likes_count: number;
  is_deleted: number;
  created_at: string;
  author?: UserProfile;
  userReaction?: ReactionType | null;
  replies?: Comment[];
}

export interface Story {
  id: number;
  user_id: number;
  media_url: string | null;
  media_type: MediaType;
  text_content: string | null;
  background_color: string | null;
  views_count: number;
  expires_at: string;
  is_deleted: number;
  created_at: string;
  author?: UserProfile;
  hasViewed?: boolean;
}

export interface Video {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration: number;
  views_count: number;
  likes_count: number;
  comments_count: number;
  storage_type: StorageType;
  is_short: number;
  is_deleted: number;
  created_at: string;
  author?: UserProfile;
  userReaction?: string | null;
}

export interface Page {
  id: number;
  user_id: number;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  avatar_url: string | null;
  cover_url: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  followers_count: number;
  is_verified: number;
  created_at: string;
  isFollowing?: boolean;
  owner?: UserProfile;
}

export interface Report {
  id: number;
  reporter_id: number;
  reported_type: 'USER' | 'POST' | 'COMMENT' | 'VIDEO' | 'SHORT_VIDEO' | 'PAGE';
  reported_id: number;
  reason: 'SPAM' | 'HARASSMENT' | 'FALSE_INFO' | 'VIOLENCE' | 'COPYRIGHT' | 'INAPPROPRIATE' | 'OTHER';
  details: string | null;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  moderator_id: number | null;
  moderator_notes: string | null;
  created_at: string;
  reporter?: UserProfile;
  reportedContent?: any;
}

// ===================== FRIEND SYSTEM TYPES =====================
export type FriendshipStatus = 'NONE' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'FRIENDS' | 'BLOCKED';

export interface FriendRequest {
  id: number;
  sender_id: number;
  receiver_id: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  created_at: string;
  updated_at: string;
  sender?: UserProfile;
  receiver?: UserProfile;
}

export interface Friendship {
  id: number;
  user_id: number;
  friend_id: number;
  created_at: string;
  friend?: UserProfile;
}

export interface BlockedUser {
  id: number;
  user_id: number;
  blocked_user_id: number;
  reason?: string | null;
  created_at: string;
  blocked_profile?: UserProfile;
}

// ===================== PRIVATE MESSAGING TYPES =====================
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'CODE';

export interface Conversation {
  id: number;
  type: 'DIRECT' | 'GROUP';
  title?: string | null;
  created_at: string;
  updated_at: string;
  members?: ConversationMember[];
  lastMessage?: Message;
  otherUser?: UserProfile;
  unreadCount?: number;
}

export interface ConversationMember {
  id: number;
  conversation_id: number;
  user_id: number;
  joined_at: string;
  last_read_message_id?: number | null;
  last_read_at?: string | null;
  is_muted?: number;
  profile?: UserProfile;
}

export interface MessageAttachment {
  id: number;
  message_id: number;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  storage_type: StorageType;
  created_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  message_type: MessageType;
  content: string;
  code_language?: string | null;
  code_title?: string | null;
  parent_id?: number | null;
  is_edited: number;
  is_deleted: number;
  created_at: string;
  updated_at: string;
  sender?: UserProfile;
  attachments?: MessageAttachment[];
  parentMessage?: Message;
  isSeen?: boolean;
}

// ===================== CALLING & WEBRTC TYPES =====================
export type CallType = 'VOICE' | 'VIDEO';
export type CallStatus = 'INITIATED' | 'RINGING' | 'ACCEPTED' | 'REJECTED' | 'MISSED' | 'ENDED' | 'BUSY';

export interface CallRecord {
  id: number;
  caller_id: number;
  receiver_id: number;
  call_type: CallType;
  status: CallStatus;
  started_at?: string | null;
  ended_at?: string | null;
  duration_seconds: number;
  created_at: string;
  caller?: UserProfile;
  receiver?: UserProfile;
}

export interface WebRTCSettings {
  stun_server: string;
  turn_server: string;
  turn_username: string;
  turn_credential: string;
}

// ===================== GROUP SYSTEM TYPES =====================
export type GroupPrivacy = 'PUBLIC' | 'PRIVATE';
export type GroupRole = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';

export interface Group {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  privacy: GroupPrivacy;
  avatar_url: string | null;
  cover_url: string | null;
  rules: string | null;
  owner_id: number;
  members_count: number;
  posts_count: number;
  created_at: string;
  updated_at: string;
  currentUserRole?: GroupRole | null;
  isMember?: boolean;
  hasPendingRequest?: boolean;
  owner?: UserProfile;
}

export interface GroupMember {
  id: number;
  group_id: number;
  user_id: number;
  role: GroupRole;
  is_muted: number;
  joined_at: string;
  profile?: UserProfile;
}

export interface GroupJoinRequest {
  id: number;
  group_id: number;
  user_id: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  updated_at: string;
  user?: UserProfile;
}

export interface GroupBan {
  id: number;
  group_id: number;
  user_id: number;
  banned_by: number;
  reason: string | null;
  created_at: string;
  user?: UserProfile;
}

// ===================== MULTI-LANGUAGE VIDEO AUDIO TRACK TYPES =====================
export interface VideoAudioTrack {
  id: number;
  video_id: number;
  language_name: string;
  language_code: string;
  title: string;
  storage_key: string;
  audio_url: string;
  is_default: number;
  is_active: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}


import fs from 'fs';
import path from 'path';
import mysql, { Pool } from 'mysql2/promise';
import type {
  CallRecord,
  Conversation,
  ConversationMember,
  FriendRequest,
  Friendship,
  Group,
  GroupBan,
  GroupJoinRequest,
  GroupMember,
  Message,
  MessageAttachment,
  VideoAudioTrack,
  WebRTCSettings
} from '../types/index.ts';

let mysqlPool: Pool | null = null;
let isUsingMySQL = false;

// Path for file-backed persistent store fallback
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure uploads folder exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initial seed data mirroring database/database.sql
const DEFAULT_SEED_DATA = {
  users: [
    {
      id: 1,
      email: 'sabiborhosain@gmail.com',
      password_hash: '$2b$10$Ca1REzcAD361CHe99dIY7e8uLQ8DJX6RVcDLvbC18pGios4bAm8Yq', // '100200300'
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      is_email_verified: 1,
      must_change_password: 1,
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      email: 'alex.coder@devsphere.io',
      password_hash: '$2b$10$Ca1REzcAD361CHe99dIY7e8uLQ8DJX6RVcDLvbC18pGios4bAm8Yq',
      role: 'USER',
      status: 'ACTIVE',
      is_email_verified: 1,
      must_change_password: 0,
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 3,
      email: 'sarah.engineer@devsphere.io',
      password_hash: '$2b$10$Ca1REzcAD361CHe99dIY7e8uLQ8DJX6RVcDLvbC18pGios4bAm8Yq',
      role: 'USER',
      status: 'ACTIVE',
      is_email_verified: 1,
      must_change_password: 0,
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  user_profiles: [
    {
      id: 1,
      user_id: 1,
      username: 'sabiborhosain',
      full_name: 'Sabibor Hosain',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      cover_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      bio: 'Platform Founder & Lead Architect at DevSphere. Passionate about high-throughput distributed systems, React, and MySQL.',
      location: 'San Francisco, CA',
      website: 'https://devsphere.social',
      work: 'Chief Technology Officer',
      education: 'Computer Science M.S.',
      gender: 'Male',
      followers_count: 1420,
      following_count: 18,
      friends_count: 320,
      posts_count: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      user_id: 2,
      username: 'alex_dev',
      full_name: 'Alex Vance',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      cover_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
      bio: 'Full-stack TypeScript developer & Rust enthusiast. Writing clean code and building scalable cloud microservices.',
      location: 'Austin, TX',
      website: 'https://alexvance.codes',
      work: 'Senior Software Engineer',
      education: 'B.S. Software Engineering',
      gender: 'Male',
      followers_count: 890,
      following_count: 142,
      friends_count: 210,
      posts_count: 8,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 3,
      user_id: 3,
      username: 'sarah_tech',
      full_name: 'Sarah Connor',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
      cover_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
      bio: 'DevOps & Cloud Architect. Kubernetes, Docker, Cloudflare R2, and Terraform advocate.',
      location: 'Seattle, WA',
      website: 'https://cloudsarah.io',
      work: 'Principal Cloud Architect',
      education: 'M.Sc. Information Security',
      gender: 'Female',
      followers_count: 1120,
      following_count: 95,
      friends_count: 180,
      posts_count: 12,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  user_settings: [
    { id: 1, user_id: 1, theme: 'light', email_notifications: 1, sound_enabled: 1, code_theme: 'vivid-dark' },
    { id: 2, user_id: 2, theme: 'light', email_notifications: 1, sound_enabled: 1, code_theme: 'vivid-dark' },
    { id: 3, user_id: 3, theme: 'light', email_notifications: 1, sound_enabled: 1, code_theme: 'vivid-dark' }
  ],
  privacy_settings: [
    { id: 1, user_id: 1, who_can_see_posts: 'PUBLIC', who_can_send_requests: 'EVERYONE', who_can_see_friends: 'PUBLIC' },
    { id: 2, user_id: 2, who_can_see_posts: 'PUBLIC', who_can_send_requests: 'EVERYONE', who_can_see_friends: 'PUBLIC' },
    { id: 3, user_id: 3, who_can_see_posts: 'PUBLIC', who_can_send_requests: 'EVERYONE', who_can_see_friends: 'PUBLIC' }
  ],
  pages: [
    {
      id: 1,
      user_id: 1,
      name: 'TypeScript Architects',
      slug: 'typescript-architects',
      description: 'The official community for TypeScript design patterns, strict mode practices, and advanced type gymnastics.',
      category: 'Technology',
      avatar_url: 'https://images.unsplash.com/photo-1516116211227-bbc3e617d59b?auto=format&fit=crop&w=400&q=80',
      cover_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      website: 'https://typescriptlang.org',
      phone: '+1 415 555 0192',
      email: 'community@typescriptarchitects.org',
      location: 'Global / Remote',
      followers_count: 5420,
      is_verified: 1,
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      user_id: 2,
      name: 'Cloud & DevOps Masters',
      slug: 'cloud-devops-masters',
      description: 'Deep dives into AWS, Cloudflare R2, Docker, CI/CD pipelines, and high availability hosting.',
      category: 'Community',
      avatar_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80',
      cover_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80',
      website: 'https://devopsmasters.io',
      phone: '+1 512 555 0148',
      email: 'hello@devopsmasters.io',
      location: 'Austin, TX',
      followers_count: 3810,
      is_verified: 1,
      created_at: new Date().toISOString()
    }
  ],
  posts: [
    {
      id: 1,
      user_id: 1,
      page_id: null,
      post_type: 'MIXED',
      privacy: 'PUBLIC',
      content: 'Welcome to DevSphere! We are thrilled to launch this complete, production-ready developer social platform. Here is how our block-based post architecture cleanly separates code execution, formatting, and responsive viewing:',
      location_name: 'DevSphere HQ, Silicon Valley',
      feeling_emoji: '🚀',
      feeling_text: 'excited',
      reactions_count: 42,
      comments_count: 6,
      shares_count: 14,
      views_count: 240,
      is_pinned: 1,
      is_deleted: 0,
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    },
    {
      id: 2,
      user_id: 2,
      page_id: null,
      post_type: 'CODE',
      privacy: 'PUBLIC',
      content: 'Check out this clean TypeScript utility for verifying RSA-signed JWT payloads with fallback token rotation. What do you think about this pattern?',
      location_name: 'Austin Tech District',
      feeling_emoji: '💡',
      feeling_text: 'thoughtful',
      reactions_count: 19,
      comments_count: 3,
      shares_count: 5,
      views_count: 180,
      is_pinned: 0,
      is_deleted: 0,
      created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3600 * 1000).toISOString()
    }
  ],
  post_blocks: [
    {
      id: 1,
      post_id: 1,
      block_order: 0,
      block_type: 'TEXT',
      content: 'DevSphere empowers developers and engineers to share rich multimedia thoughts, interactive code snippets with syntax highlighting, and architecture deep dives.',
      meta_json: null
    },
    {
      id: 2,
      post_id: 1,
      block_order: 1,
      block_type: 'CODE',
      content: `/**
 * Enterprise Resilient Database Connection Pool
 * Supports seamless MySQL connection with automatic failover fallback
 */
import mysql from "mysql2/promise";

export async function createConnectionPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "devsphere_db",
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0
  });
}`,
      meta_json: { language: 'typescript', title: 'db-pool.ts' }
    },
    {
      id: 3,
      post_id: 1,
      block_order: 2,
      block_type: 'TEXT',
      content: 'Every code block supports one-click copying, line numbering, and syntax highlighting for 20+ languages including TypeScript, Python, Go, and SQL.',
      meta_json: null
    },
    {
      id: 4,
      post_id: 2,
      block_order: 0,
      block_type: 'TEXT',
      content: 'Here is the token validation function with strict payload parsing:',
      meta_json: null
    },
    {
      id: 5,
      post_id: 2,
      block_order: 1,
      block_type: 'CODE',
      content: `import jwt from "jsonwebtoken";

interface TokenPayload {
  userId: number;
  email: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
}

export function verifyUserToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
  } catch (err) {
    return null;
  }
}`,
      meta_json: { language: 'typescript', title: 'verifyToken.ts' }
    }
  ],
  post_reactions: [
    { id: 1, post_id: 1, user_id: 2, reaction_type: 'CODE', created_at: new Date().toISOString() },
    { id: 2, post_id: 1, user_id: 3, reaction_type: 'LOVE', created_at: new Date().toISOString() },
    { id: 3, post_id: 2, user_id: 1, reaction_type: 'LIKE', created_at: new Date().toISOString() }
  ],
  saved_posts: [
    { id: 1, user_id: 1, post_id: 2, created_at: new Date().toISOString() }
  ],
  comments: [
    {
      id: 1,
      post_id: 1,
      user_id: 2,
      parent_id: null,
      content: 'The block-based post architecture is super clean! Here is an example of calling it from our React frontend hook:',
      code_snippet: `const { data, loading } = useFeed({
  cursor: 0,
  limit: 10
});`,
      code_language: 'typescript',
      image_url: null,
      likes_count: 4,
      is_deleted: 0,
      created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString()
    },
    {
      id: 2,
      post_id: 1,
      user_id: 3,
      parent_id: null,
      content: 'Great job team! Cloudflare R2 integration makes storing high-resolution photos and video reels fast and affordable.',
      code_snippet: null,
      code_language: null,
      image_url: null,
      likes_count: 2,
      is_deleted: 0,
      created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString()
    }
  ],
  comment_reactions: [
    { id: 1, comment_id: 1, user_id: 1, reaction_type: 'LIKE', created_at: new Date().toISOString() }
  ],
  stories: [
    {
      id: 1,
      user_id: 1,
      media_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80',
      media_type: 'IMAGE',
      text_content: 'Shipping DevSphere v1.0.0 today! 🎉',
      background_color: '#0f172a',
      views_count: 142,
      expires_at: new Date(Date.now() + 22 * 3600 * 1000).toISOString(),
      is_deleted: 0,
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    },
    {
      id: 2,
      user_id: 2,
      media_url: null,
      media_type: 'TEXT',
      text_content: 'Migrating our distributed cache to Redis v7 tomorrow morning at 04:00 UTC.',
      background_color: '#1e3a8a',
      views_count: 88,
      expires_at: new Date(Date.now() + 20 * 3600 * 1000).toISOString(),
      is_deleted: 0,
      created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
    }
  ],
  story_views: [
    { id: 1, story_id: 1, user_id: 2, viewed_at: new Date().toISOString() }
  ],
  videos: [
    {
      id: 1,
      user_id: 1,
      title: '5 TypeScript Tips in 60 Seconds',
      description: 'Level up your type safety with satisfies operator, const assertions, and branded types!',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbnail_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
      duration: 58,
      views_count: 2340,
      likes_count: 189,
      comments_count: 12,
      storage_type: 'LOCAL',
      is_short: 1,
      is_deleted: 0,
      created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString()
    },
    {
      id: 2,
      user_id: 2,
      title: 'Building Cloudflare R2 Media Pipelines with Node.js',
      description: 'Comprehensive guide to generating signed PUT URLs and direct client-side uploads with zero backend bandwidth load.',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      thumbnail_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
      duration: 720,
      views_count: 1250,
      likes_count: 94,
      comments_count: 7,
      storage_type: 'LOCAL',
      is_short: 0,
      is_deleted: 0,
      created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
    }
  ],
  video_reactions: [
    { id: 1, video_id: 1, user_id: 2, reaction_type: 'LIKE', created_at: new Date().toISOString() }
  ],
  followers: [
    { id: 1, follower_id: 2, following_id: 1, created_at: new Date().toISOString() },
    { id: 2, follower_id: 3, following_id: 1, created_at: new Date().toISOString() },
    { id: 3, follower_id: 1, following_id: 2, created_at: new Date().toISOString() }
  ],
  page_followers: [
    { id: 1, page_id: 1, user_id: 1, created_at: new Date().toISOString() },
    { id: 2, page_id: 1, user_id: 2, created_at: new Date().toISOString() }
  ],
  reports: [
    {
      id: 1,
      reporter_id: 2,
      reported_type: 'POST',
      reported_id: 2,
      reason: 'SPAM',
      details: 'Automated test report checking admin moderation queue.',
      status: 'PENDING',
      moderator_id: null,
      moderator_notes: null,
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    }
  ],
  admin_logs: [
    {
      id: 1,
      admin_id: 1,
      action: 'SYSTEM_INITIALIZED',
      target_type: 'SYSTEM',
      target_id: 1,
      ip_address: '127.0.0.1',
      details: 'DevSphere platform database seeded with super administrator.',
      created_at: new Date().toISOString()
    }
  ],
  login_logs: [
    {
      id: 1,
      user_id: 1,
      email: 'sabiborhosain@gmail.com',
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      status: 'SUCCESS',
      created_at: new Date().toISOString()
    }
  ],
  sessions: [
    {
      id: 1,
      user_id: 1,
      token: 'seed-session-token-1',
      ip_address: '127.0.0.1',
      user_agent: 'Chrome 122 on Windows',
      device_type: 'Desktop',
      is_active: 1,
      last_active_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }
  ],
  notifications: [] as any[],
  otp_verifications: [] as any[],
  password_reset_otps: [] as any[],
  email_verifications: [] as any[],

  // Friend system collections
  friendships: [
    { id: 1, user_id: 1, friend_id: 2, created_at: new Date(Date.now() - 7 * 86400000).toISOString() },
    { id: 2, user_id: 2, friend_id: 1, created_at: new Date(Date.now() - 7 * 86400000).toISOString() }
  ] as Friendship[],
  friend_requests: [
    { id: 1, sender_id: 3, receiver_id: 1, status: 'PENDING', created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date(Date.now() - 3600000).toISOString() }
  ] as FriendRequest[],
  blocked_users: [] as any[],

  // Private messaging collections
  conversations: [
    {
      id: 1,
      type: 'DIRECT',
      title: null,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 15 * 60000).toISOString()
    }
  ] as Conversation[],
  conversation_members: [
    { id: 1, conversation_id: 1, user_id: 1, joined_at: new Date(Date.now() - 86400000).toISOString(), last_read_message_id: 2, last_read_at: new Date().toISOString(), is_muted: 0 },
    { id: 2, conversation_id: 1, user_id: 2, joined_at: new Date(Date.now() - 86400000).toISOString(), last_read_message_id: 2, last_read_at: new Date().toISOString(), is_muted: 0 }
  ] as ConversationMember[],
  messages: [
    {
      id: 1,
      conversation_id: 1,
      sender_id: 2,
      message_type: 'TEXT',
      content: 'Hey Sabibor! Have you tested the new WebRTC signaling bridge for DevSphere audio/video calls?',
      code_language: null,
      code_title: null,
      parent_id: null,
      is_edited: 0,
      is_deleted: 0,
      created_at: new Date(Date.now() - 60 * 60000).toISOString(),
      updated_at: new Date(Date.now() - 60 * 60000).toISOString()
    },
    {
      id: 2,
      conversation_id: 1,
      sender_id: 1,
      message_type: 'CODE',
      content: `// WebRTC Peer Connection Initializer
const peer = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
});`,
      code_language: 'typescript',
      code_title: 'peer-config.ts',
      parent_id: null,
      is_edited: 0,
      is_deleted: 0,
      created_at: new Date(Date.now() - 15 * 60000).toISOString(),
      updated_at: new Date(Date.now() - 15 * 60000).toISOString()
    }
  ] as Message[],
  message_attachments: [] as MessageAttachment[],
  message_reads: [
    { id: 1, message_id: 1, user_id: 1, read_at: new Date().toISOString() },
    { id: 2, message_id: 2, user_id: 2, read_at: new Date().toISOString() }
  ],

  // Calling collections
  calls: [
    {
      id: 1,
      caller_id: 2,
      receiver_id: 1,
      call_type: 'VIDEO',
      status: 'ENDED',
      started_at: new Date(Date.now() - 120 * 60000).toISOString(),
      ended_at: new Date(Date.now() - 115 * 60000).toISOString(),
      duration_seconds: 300,
      created_at: new Date(Date.now() - 120 * 60000).toISOString()
    }
  ] as CallRecord[],
  webrtc_settings: {
    stun_server: 'stun:stun.l.google.com:19302',
    turn_server: '',
    turn_username: '',
    turn_credential: ''
  } as WebRTCSettings,

  // Group system collections
  groups: [
    {
      id: 1,
      name: 'System Design & Distributed Architectures',
      slug: 'system-design-distributed-architectures',
      description: 'Engineering discussions on microservices, event-driven pipelines, consensus algorithms, and database sharding.',
      category: 'Architecture',
      privacy: 'PUBLIC',
      avatar_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80',
      cover_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      rules: '1. Respect all members\n2. Share code and architecture diagrams\n3. No spam or self-promotion',
      owner_id: 1,
      members_count: 24,
      posts_count: 3,
      created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 14 * 86400000).toISOString()
    },
    {
      id: 2,
      name: 'React 19 & Next.js Core Contributors',
      slug: 'react-19-nextjs-contributors',
      description: 'Private research group evaluating React 19 Server Actions, compiler optimizations, and streaming SSR.',
      category: 'Frontend',
      privacy: 'PRIVATE',
      avatar_url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=400&q=80',
      cover_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      rules: '1. Active contribution required\n2. Confidential discussion',
      owner_id: 2,
      members_count: 8,
      posts_count: 1,
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 10 * 86400000).toISOString()
    }
  ] as Group[],
  group_members: [
    { id: 1, group_id: 1, user_id: 1, role: 'OWNER', is_muted: 0, joined_at: new Date(Date.now() - 14 * 86400000).toISOString() },
    { id: 2, group_id: 1, user_id: 2, role: 'ADMIN', is_muted: 0, joined_at: new Date(Date.now() - 13 * 86400000).toISOString() },
    { id: 3, group_id: 1, user_id: 3, role: 'MEMBER', is_muted: 0, joined_at: new Date(Date.now() - 12 * 86400000).toISOString() },
    { id: 4, group_id: 2, user_id: 2, role: 'OWNER', is_muted: 0, joined_at: new Date(Date.now() - 10 * 86400000).toISOString() },
    { id: 5, group_id: 2, user_id: 1, role: 'MEMBER', is_muted: 0, joined_at: new Date(Date.now() - 9 * 86400000).toISOString() }
  ] as GroupMember[],
  group_join_requests: [
    { id: 1, group_id: 2, user_id: 3, status: 'PENDING', created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date(Date.now() - 3600000).toISOString() }
  ] as GroupJoinRequest[],
  group_bans: [] as GroupBan[],
  group_invites: [] as any[],

  // Video multi-language audio tracks
  video_audio_tracks: [
    {
      id: 1,
      video_id: 2,
      language_name: 'Bengali',
      language_code: 'bn',
      title: 'বাংলা ধারাভাষ্য (Cloudflare R2 গাইড)',
      storage_key: 'audio_tracks/video_2_bn.mp3',
      audio_url: 'https://actions.google.com/sounds/v1/ambiences/daytime_forest_bonfire.ogg',
      is_default: 0,
      is_active: 1,
      created_by: 1,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 2,
      video_id: 2,
      language_name: 'English',
      language_code: 'en',
      title: 'English Narration & Deep-Dive',
      storage_key: 'audio_tracks/video_2_en.mp3',
      audio_url: 'https://actions.google.com/sounds/v1/science_fiction/alien_hum.ogg',
      is_default: 1,
      is_active: 1,
      created_by: 1,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 3,
      video_id: 2,
      language_name: 'Hindi',
      language_code: 'hi',
      title: 'हिन्दी ऑडियो ट्रैक',
      storage_key: 'audio_tracks/video_2_hi.mp3',
      audio_url: 'https://actions.google.com/sounds/v1/ambiences/outdoor_festival.ogg',
      is_default: 0,
      is_active: 1,
      created_by: 1,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString()
    }
  ] as VideoAudioTrack[],

  r2_settings: {
    account_id: '',
    access_key_id: '',
    secret_access_key: '',
    bucket_name: 'devsphere-media',
    endpoint: '',
    public_url: '',
    is_active: 0
  },
  smtp_settings: {
    host: '',
    port: 587,
    username: '',
    password: '',
    encryption: 'tls' as 'tls' | 'ssl' | 'none',
    from_email: 'no-reply@devsphere.com',
    from_name: 'DevSphere Social',
    is_active: 0
  },
  system_settings: {
    site_name: 'DevSphere Social',
    site_tagline: 'The Social Network for Developers & Engineers',
    site_description: 'Connect, share code blocks, watch reels, and collaborate with tech minds worldwide.',
    allow_registration: '1',
    email_verification_required: '0',
    max_upload_size_mb: '50'
  }
};

// In-memory data copy loaded from or saved to disk
let memoryDB: typeof DEFAULT_SEED_DATA;

function loadMemoryDB() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      memoryDB = JSON.parse(raw);

      // Backfill any missing collections from DEFAULT_SEED_DATA
      let updated = false;
      for (const key of Object.keys(DEFAULT_SEED_DATA) as Array<keyof typeof DEFAULT_SEED_DATA>) {
        if (memoryDB[key] === undefined) {
          (memoryDB as any)[key] = JSON.parse(JSON.stringify(DEFAULT_SEED_DATA[key]));
          updated = true;
        }
      }
      if (updated) {
        saveMemoryDB();
      }
    } catch (err) {
      console.error('[DB] Failed reading disk DB, using default seed:', err);
      memoryDB = JSON.parse(JSON.stringify(DEFAULT_SEED_DATA));
      saveMemoryDB();
    }
  } else {
    memoryDB = JSON.parse(JSON.stringify(DEFAULT_SEED_DATA));
    saveMemoryDB();
  }
}

export function saveMemoryDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(memoryDB, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB] Error saving to disk DB:', err);
  }
}

// Initialize database
export async function initDatabase(): Promise<void> {
  loadMemoryDB();

  const isProduction = process.env.NODE_ENV === 'production';
  const host = process.env.DB_HOST?.trim();
  const user = process.env.DB_USER?.trim();
  const database = process.env.DB_NAME?.trim();

  // In development preview mode, if MySQL credentials are not explicitly supplied,
  // immediately use the local file-backed JSON/memory database without delay.
  if (!host || !user || !database) {
    console.log('[DevSphere DB] Preview/Development mode active: MySQL credentials not provided.');
    console.log('[DevSphere DB] Utilizing local persistent JSON/memory database (data/database.json).');
    isUsingMySQL = false;
    return;
  }

  // If credentials are provided (e.g. in production or local MySQL setup), attempt connection
  try {
    const pool = mysql.createPool({
      host,
      port: Number(process.env.DB_PORT) || 3306,
      user,
      password: process.env.DB_PASSWORD || '',
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 2000 // Fast 2-second timeout to prevent any dev preview hang
    });

    // Test connectivity
    const conn = await pool.getConnection();
    conn.release();
    mysqlPool = pool;
    isUsingMySQL = true;
    console.log(`[DevSphere DB] Connected successfully to MySQL at ${host}:${process.env.DB_PORT || 3306}/${database}`);

    // Synchronize system settings from MySQL if tables exist
    await syncSettingsFromMySQL(pool);
    // Ensure all social interaction tables exist and are synchronized
    await ensureSocialTablesAndSync(pool);
    return;
  } catch (err: any) {
    if (isProduction) {
      console.error(`[DevSphere DB] Production MySQL connection error (${host}): ${err.message}`);
    } else {
      console.warn(`[DevSphere DB] MySQL connection could not be established (${err.message}).`);
    }
    console.log('[DevSphere DB] Gracefully falling back to local persistent database (data/database.json). Preview startup guaranteed.');
    isUsingMySQL = false;
    mysqlPool = null;
  }
}

async function syncSettingsFromMySQL(pool: Pool): Promise<void> {
  try {
    // 1. Sync R2 Settings
    const [r2Rows]: any = await pool.query('SELECT * FROM r2_settings LIMIT 1');
    if (r2Rows && r2Rows.length > 0) {
      const row = r2Rows[0];
      memoryDB.r2_settings = {
        account_id: row.account_id || '',
        access_key_id: row.access_key_id || '',
        secret_access_key: row.secret_access_key || '',
        bucket_name: row.bucket_name || 'devsphere-media',
        endpoint: row.endpoint || '',
        public_url: row.public_url || '',
        is_active: Number(row.is_active) === 1 ? 1 : 0
      };
    }

    // 2. Sync SMTP Settings
    const [smtpRows]: any = await pool.query('SELECT * FROM smtp_settings LIMIT 1');
    if (smtpRows && smtpRows.length > 0) {
      const row = smtpRows[0];
      memoryDB.smtp_settings = {
        host: row.host || '',
        port: Number(row.port) || 587,
        username: row.username || '',
        password: row.password || '',
        encryption: (row.encryption as 'tls' | 'ssl' | 'none') || 'tls',
        from_email: row.from_email || 'no-reply@devsphere.com',
        from_name: row.from_name || 'DevSphere Social',
        is_active: Number(row.is_active) === 1 ? 1 : 0
      };
    }

    // 3. Sync System Settings
    const [sysRows]: any = await pool.query('SELECT setting_key, setting_value FROM system_settings');
    if (sysRows && sysRows.length > 0) {
      for (const row of sysRows) {
        if (row.setting_key) {
          (memoryDB.system_settings as any)[row.setting_key] = row.setting_value || '';
        }
      }
    }
    console.log('[DevSphere DB] Synchronized R2, SMTP, and System settings from MySQL.');
  } catch (err: any) {
    console.warn('[DevSphere DB] Notice on MySQL settings sync:', err.message);
  }
}

async function ensureSocialTablesAndSync(pool: Pool): Promise<void> {
  try {
    // 1. Create tables if not exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        email VARCHAR(191) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('USER', 'ADMIN', 'SUPER_ADMIN') NOT NULL DEFAULT 'USER',
        status ENUM('ACTIVE', 'SUSPENDED', 'BANNED', 'DEACTIVATED') NOT NULL DEFAULT 'ACTIVE',
        is_email_verified TINYINT(1) NOT NULL DEFAULT 0,
        must_change_password TINYINT(1) NOT NULL DEFAULT 0,
        last_login_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY idx_users_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT UNSIGNED NOT NULL,
        username VARCHAR(60) NOT NULL,
        full_name VARCHAR(120) NOT NULL,
        avatar_url VARCHAR(500) NULL,
        cover_url VARCHAR(500) NULL,
        bio TEXT NULL,
        location VARCHAR(150) NULL,
        website VARCHAR(255) NULL,
        work VARCHAR(150) NULL,
        education VARCHAR(150) NULL,
        gender VARCHAR(30) NULL,
        followers_count INT UNSIGNED NOT NULL DEFAULT 0,
        following_count INT UNSIGNED NOT NULL DEFAULT 0,
        friends_count INT UNSIGNED NOT NULL DEFAULT 0,
        posts_count INT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY idx_user_profiles_user_id (user_id),
        UNIQUE KEY idx_user_profiles_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS friend_requests (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        sender_id INT UNSIGNED NOT NULL,
        receiver_id INT UNSIGNED NOT NULL,
        status ENUM('PENDING', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY idx_friend_req_pair (sender_id, receiver_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS friendships (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT UNSIGNED NOT NULL,
        friend_id INT UNSIGNED NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY idx_friendship_pair (user_id, friend_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS blocked_users (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT UNSIGNED NOT NULL,
        blocked_user_id INT UNSIGNED NOT NULL,
        reason VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY idx_blocked_pair (user_id, blocked_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        type ENUM('DIRECT', 'GROUP') NOT NULL DEFAULT 'DIRECT',
        title VARCHAR(150) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversation_members (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        conversation_id INT UNSIGNED NOT NULL,
        user_id INT UNSIGNED NOT NULL,
        joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_read_message_id INT UNSIGNED NULL,
        last_read_at DATETIME NULL,
        is_muted TINYINT(1) NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        UNIQUE KEY idx_conv_member_pair (conversation_id, user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        conversation_id INT UNSIGNED NOT NULL,
        sender_id INT UNSIGNED NOT NULL,
        message_type ENUM('TEXT', 'IMAGE', 'FILE', 'CODE') NOT NULL DEFAULT 'TEXT',
        content TEXT NULL,
        code_language VARCHAR(50) NULL,
        code_title VARCHAR(150) NULL,
        parent_id INT UNSIGNED NULL,
        is_edited TINYINT(1) NOT NULL DEFAULT 0,
        is_deleted TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS message_attachments (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        message_id INT UNSIGNED NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INT UNSIGNED NOT NULL DEFAULT 0,
        storage_key VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS message_reads (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        message_id INT UNSIGNED NOT NULL,
        user_id INT UNSIGNED NOT NULL,
        read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY idx_msg_reads_pair (message_id, user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS calls (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        caller_id INT UNSIGNED NOT NULL,
        receiver_id INT UNSIGNED NOT NULL,
        call_type ENUM('VOICE', 'VIDEO') NOT NULL DEFAULT 'VOICE',
        status ENUM('RINGING', 'ACCEPTED', 'REJECTED', 'MISSED', 'ENDED') NOT NULL DEFAULT 'RINGING',
        started_at DATETIME NULL,
        ended_at DATETIME NULL,
        duration_seconds INT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS call_participants (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        call_id INT UNSIGNED NOT NULL,
        user_id INT UNSIGNED NOT NULL,
        role ENUM('CALLER', 'RECEIVER', 'PARTICIPANT') NOT NULL DEFAULT 'PARTICIPANT',
        status ENUM('RINGING', 'ACCEPTED', 'REJECTED', 'LEFT') NOT NULL DEFAULT 'RINGING',
        joined_at DATETIME NULL,
        left_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY idx_call_participant_pair (call_id, user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT UNSIGNED NOT NULL,
        actor_id INT UNSIGNED NULL,
        entity_type ENUM('POST', 'COMMENT', 'REACTION', 'FOLLOW', 'PAGE', 'ADMIN', 'FRIEND') NOT NULL,
        entity_id INT UNSIGNED NULL,
        message VARCHAR(255) NOT NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Sync from MySQL or seed initial records if empty
    // Ensure users and user_profiles are seeded in MySQL
    try {
      const [uRows]: any = await pool.query('SELECT COUNT(*) as c FROM users');
      if (uRows && uRows[0]?.c === 0 && memoryDB.users) {
        for (const u of memoryDB.users) {
          await pool.query(
            `INSERT IGNORE INTO users (id, email, password_hash, role, status, is_email_verified, must_change_password, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              u.id,
              u.email,
              u.password_hash,
              u.role || 'USER',
              u.status || 'ACTIVE',
              u.is_email_verified ? 1 : 0,
              u.must_change_password ? 1 : 0,
              new Date(u.created_at || Date.now()),
              new Date(u.updated_at || Date.now())
            ]
          );
        }
      }

      const [pRows]: any = await pool.query('SELECT COUNT(*) as c FROM user_profiles');
      if (pRows && pRows[0]?.c === 0 && memoryDB.user_profiles) {
        for (const p of memoryDB.user_profiles) {
          await pool.query(
            `INSERT IGNORE INTO user_profiles (id, user_id, username, full_name, avatar_url, cover_url, bio, location, website, work, education, gender, followers_count, following_count, friends_count, posts_count, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              p.id,
              p.user_id,
              p.username,
              p.full_name,
              p.avatar_url || null,
              p.cover_url || null,
              p.bio || null,
              p.location || null,
              p.website || null,
              p.work || null,
              p.education || null,
              p.gender || null,
              p.followers_count || 0,
              p.following_count || 0,
              p.friends_count || 0,
              p.posts_count || 0,
              new Date(p.created_at || Date.now()),
              new Date(p.updated_at || Date.now())
            ]
          );
        }
      }
    } catch (seedErr: any) {
      console.warn('[DevSphere DB] Notice on seeding users/profiles to MySQL:', seedErr.message);
    }

    const [friendshipRows]: any = await pool.query('SELECT * FROM friendships');
    if (friendshipRows && friendshipRows.length > 0) {
      memoryDB.friendships = friendshipRows.map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        friend_id: r.friend_id,
        created_at: new Date(r.created_at).toISOString()
      }));
    } else if (memoryDB.friendships && memoryDB.friendships.length > 0) {
      for (const f of memoryDB.friendships) {
        await pool.query(
          'INSERT IGNORE INTO friendships (id, user_id, friend_id, created_at) VALUES (?, ?, ?, ?)',
          [f.id, f.user_id, f.friend_id, f.created_at]
        );
      }
    }

    const [reqRows]: any = await pool.query('SELECT * FROM friend_requests');
    if (reqRows && reqRows.length > 0) {
      memoryDB.friend_requests = reqRows.map((r: any) => ({
        id: r.id,
        sender_id: r.sender_id,
        receiver_id: r.receiver_id,
        status: r.status,
        created_at: new Date(r.created_at).toISOString(),
        updated_at: new Date(r.updated_at).toISOString()
      }));
    } else if (memoryDB.friend_requests && memoryDB.friend_requests.length > 0) {
      for (const r of memoryDB.friend_requests) {
        await pool.query(
          'INSERT IGNORE INTO friend_requests (id, sender_id, receiver_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [r.id, r.sender_id, r.receiver_id, r.status, r.created_at, r.updated_at]
        );
      }
    }

    const [convRows]: any = await pool.query('SELECT * FROM conversations');
    if (convRows && convRows.length > 0) {
      memoryDB.conversations = convRows.map((r: any) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        created_at: new Date(r.created_at).toISOString(),
        updated_at: new Date(r.updated_at).toISOString()
      }));
    }

    const [msgRows]: any = await pool.query('SELECT * FROM messages');
    if (msgRows && msgRows.length > 0) {
      memoryDB.messages = msgRows.map((r: any) => ({
        id: r.id,
        conversation_id: r.conversation_id,
        sender_id: r.sender_id,
        message_type: r.message_type,
        content: r.content,
        code_language: r.code_language,
        code_title: r.code_title,
        parent_id: r.parent_id,
        is_edited: r.is_edited ? 1 : 0,
        is_deleted: r.is_deleted ? 1 : 0,
        created_at: new Date(r.created_at).toISOString(),
        updated_at: new Date(r.updated_at).toISOString()
      }));
    }

    const [callRows]: any = await pool.query('SELECT * FROM calls');
    if (callRows && callRows.length > 0) {
      memoryDB.calls = callRows.map((r: any) => ({
        id: r.id,
        caller_id: r.caller_id,
        receiver_id: r.receiver_id,
        call_type: r.call_type,
        status: r.status,
        started_at: r.started_at ? new Date(r.started_at).toISOString() : null,
        ended_at: r.ended_at ? new Date(r.ended_at).toISOString() : null,
        duration_seconds: r.duration_seconds || 0,
        created_at: new Date(r.created_at).toISOString()
      }));
    }

    console.log('[DevSphere DB] Ensured MySQL tables for friend_requests, friendships, blocked_users, conversations, conversation_members, messages, message_reads, calls, call_participants, notifications.');
  } catch (err: any) {
    console.warn('[DevSphere DB] Notice on MySQL social tables sync:', err.message);
  }
}

export async function persistR2SettingsToMySQL(settings: any): Promise<void> {
  if (!mysqlPool || !isUsingMySQL) return;
  try {
    await mysqlPool.query(
      `INSERT INTO r2_settings (id, account_id, access_key_id, secret_access_key, bucket_name, endpoint, public_url, is_active)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         account_id = VALUES(account_id),
         access_key_id = VALUES(access_key_id),
         secret_access_key = VALUES(secret_access_key),
         bucket_name = VALUES(bucket_name),
         endpoint = VALUES(endpoint),
         public_url = VALUES(public_url),
         is_active = VALUES(is_active)`,
      [
        settings.account_id || '',
        settings.access_key_id || '',
        settings.secret_access_key || '',
        settings.bucket_name || 'devsphere-media',
        settings.endpoint || '',
        settings.public_url || '',
        settings.is_active ? 1 : 0
      ]
    );
  } catch (err: any) {
    console.error('[DevSphere DB] Failed persisting R2 settings to MySQL:', err.message);
  }
}

export async function persistSmtpSettingsToMySQL(settings: any): Promise<void> {
  if (!mysqlPool || !isUsingMySQL) return;
  try {
    await mysqlPool.query(
      `INSERT INTO smtp_settings (id, host, port, username, password, encryption, from_email, from_name, is_active)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         host = VALUES(host),
         port = VALUES(port),
         username = VALUES(username),
         password = VALUES(password),
         encryption = VALUES(encryption),
         from_email = VALUES(from_email),
         from_name = VALUES(from_name),
         is_active = VALUES(is_active)`,
      [
        settings.host || '',
        Number(settings.port) || 587,
        settings.username || '',
        settings.password || '',
        settings.encryption || 'tls',
        settings.from_email || 'no-reply@devsphere.com',
        settings.from_name || 'DevSphere Social',
        settings.is_active ? 1 : 0
      ]
    );
  } catch (err: any) {
    console.error('[DevSphere DB] Failed persisting SMTP settings to MySQL:', err.message);
  }
}

export async function persistSystemSettingsToMySQL(key: string, value: string): Promise<void> {
  if (!mysqlPool || !isUsingMySQL) return;
  try {
    await mysqlPool.query(
      `INSERT INTO system_settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [key, value]
    );
  } catch (err: any) {
    console.error('[DevSphere DB] Failed persisting system setting to MySQL:', err.message);
  }
}

export function getDB() {
  if (!memoryDB) {
    loadMemoryDB();
  }
  return memoryDB;
}

export function isMySQL(): boolean {
  return isUsingMySQL;
}

export function getMySQLPool(): Pool | null {
  return mysqlPool;
}

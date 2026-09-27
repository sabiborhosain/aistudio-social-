import { Router } from 'express';
import {
  register,
  login,
  getMe,
  changePassword,
  requestForgotPasswordOtp,
  resetPasswordWithOtp,
  requestEmailOtp,
  verifyEmailOtp,
  logout,
  getSessions
} from '../controllers/authController.ts';
import {
  getFeed,
  getPostById,
  getSavedPosts,
  createPost,
  reactToPost,
  toggleSavePost,
  deletePost,
  sharePost
} from '../controllers/postController.ts';
import {
  getComments,
  addComment,
  reactToComment,
  deleteComment
} from '../controllers/commentController.ts';
import {
  getStories,
  createStory,
  viewStory,
  deleteStory
} from '../controllers/storyController.ts';
import {
  getReels,
  getVideos,
  createVideo,
  reactToVideo,
  recordVideoView
} from '../controllers/videoController.ts';
import {
  getPages,
  getPageBySlug,
  createPage,
  toggleFollowPage
} from '../controllers/pageController.ts';
import {
  getUserProfile,
  searchUsers,
  toggleFollow,
  updateProfile,
  updateSettings,
  updatePrivacy
} from '../controllers/userController.ts';
import {
  createReport,
  getNotifications,
  markNotificationAsRead
} from '../controllers/reportController.ts';
import {
  getAdminStats,
  getAdminUsers,
  updateUserStatus,
  getAdminReports,
  resolveAdminReport,
  getAdminLogs,
  getR2Config,
  updateR2Config,
  testR2Endpoint,
  getSmtpConfig,
  updateSmtpConfig,
  testSmtpEndpoint,
  getGeneralSettings,
  updateGeneralSettings
} from '../controllers/adminController.ts';
import { uploadMedia } from '../controllers/mediaController.ts';
import {
  getFriends,
  getIncomingRequests,
  getSentRequests,
  getMutualFriends,
  getFriendshipStatus,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  unfriend,
  blockUser,
  unblockUser,
  getBlockedUsers
} from '../controllers/friendController.ts';
import {
  getConversations,
  getOrCreateDirectConversation,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markConversationAsRead
} from '../controllers/chatController.ts';
import {
  getCallHistory,
  initiateCall,
  updateCallStatus,
  getWebRTCSettings,
  updateWebRTCSettings
} from '../controllers/callController.ts';
import {
  getGroups,
  getGroup,
  createGroup,
  joinGroup,
  leaveGroup,
  getGroupMembers,
  getGroupJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  updateMemberRole,
  removeMember,
  getGroupPosts
} from '../controllers/groupController.ts';
import {
  getVideoAudioTracks,
  getAdminVideoAudioTracks,
  createVideoAudioTrack,
  updateVideoAudioTrack,
  deleteVideoAudioTrack
} from '../controllers/audioTrackController.ts';
import { requireAuth, optionalAuth, requireAdmin, requireSuperAdmin } from '../middleware/auth.ts';
import { upload } from '../middleware/upload.ts';

const router = Router();

// ===================== HEALTH CHECK =====================
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ===================== AUTHENTICATION =====================
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', requireAuth, getMe);
router.post('/auth/password/change', requireAuth, changePassword);
router.post('/auth/password/forgot', requestForgotPasswordOtp);
router.post('/auth/password/reset', resetPasswordWithOtp);
router.post('/auth/email/request-otp', requireAuth, requestEmailOtp);
router.post('/auth/email/verify-otp', requireAuth, verifyEmailOtp);
router.post('/auth/logout', logout);
router.get('/auth/sessions', requireAuth, getSessions);

// ===================== POSTS & CODE SNIPPETS =====================
router.get('/posts', optionalAuth, getFeed);
router.get('/posts/saved', requireAuth, getSavedPosts);
router.post('/posts', requireAuth, createPost);
router.get('/posts/:id', optionalAuth, getPostById);
router.delete('/posts/:id', requireAuth, deletePost);
router.post('/posts/:id/react', requireAuth, reactToPost);
router.post('/posts/:id/save', requireAuth, toggleSavePost);
router.post('/posts/:id/share', sharePost);

// ===================== COMMENTS =====================
router.get('/posts/:postId/comments', optionalAuth, getComments);
router.post('/posts/:postId/comments', requireAuth, addComment);
router.post('/comments/:id/react', requireAuth, reactToComment);
router.delete('/comments/:id', requireAuth, deleteComment);

// ===================== STORIES (24H EPHEMERAL) =====================
router.get('/stories', optionalAuth, getStories);
router.post('/stories', requireAuth, createStory);
router.post('/stories/:id/view', optionalAuth, viewStory);
router.delete('/stories/:id', requireAuth, deleteStory);

// ===================== VIDEOS & REELS =====================
router.get('/videos/reels', optionalAuth, getReels);
router.get('/videos/catalog', optionalAuth, getVideos);
router.get('/videos', optionalAuth, getVideos);
router.post('/videos', requireAuth, createVideo);
router.post('/videos/:id/react', requireAuth, reactToVideo);
router.post('/videos/:id/view', recordVideoView);

// ===================== PAGES =====================
router.get('/pages', optionalAuth, getPages);
router.post('/pages', requireAuth, createPage);
router.get('/pages/:slug', optionalAuth, getPageBySlug);
router.post('/pages/:id/follow', requireAuth, toggleFollowPage);

// ===================== USERS & PROFILES =====================
router.get('/users/search', searchUsers);
router.get('/users/me/profile', requireAuth, getUserProfile);
router.get('/users/profile/:username', optionalAuth, getUserProfile);
router.get('/users/:username/profile', optionalAuth, getUserProfile);
router.get('/users/by-id/:id', optionalAuth, getUserProfile);
router.get('/users/id/:id', optionalAuth, getUserProfile);
router.get('/users/:username', optionalAuth, getUserProfile);
router.get('/profile/me', requireAuth, getUserProfile);
router.get('/profile/:username', optionalAuth, getUserProfile);
router.get('/profile', optionalAuth, getUserProfile);
router.get('/u/:username', optionalAuth, getUserProfile);
router.post('/users/:id/follow', requireAuth, toggleFollow);
router.put('/users/profile', requireAuth, updateProfile);
router.put('/users/settings', requireAuth, updateSettings);
router.put('/users/privacy', requireAuth, updatePrivacy);

// ===================== NOTIFICATIONS & REPORTS =====================
router.get('/notifications', requireAuth, getNotifications);
router.put('/notifications/:id/read', requireAuth, markNotificationAsRead);
router.post('/reports', requireAuth, createReport);

// ===================== MEDIA UPLOADS =====================
router.post('/media/upload', requireAuth, upload.single('file'), uploadMedia);

// ===================== ADMIN PANEL =====================
router.get('/admin/stats', requireAuth, requireAdmin, getAdminStats);
router.get('/admin/users', requireAuth, requireAdmin, getAdminUsers);
router.put('/admin/users/:id/status', requireAuth, requireAdmin, updateUserStatus);
router.get('/admin/reports', requireAuth, requireAdmin, getAdminReports);
router.put('/admin/reports/:id', requireAuth, requireAdmin, resolveAdminReport);
router.get('/admin/logs', requireAuth, requireAdmin, getAdminLogs);

// ===================== FRIEND SYSTEM =====================
router.get('/friends', optionalAuth, getFriends);
router.get('/friends/list', optionalAuth, getFriends);
router.get('/friends/:targetUserId/list', optionalAuth, getFriends);
router.get('/friends/requests', requireAuth, getIncomingRequests);
router.get('/friends/requests/incoming', requireAuth, getIncomingRequests);
router.get('/friends/sent', requireAuth, getSentRequests);
router.get('/friends/requests/sent', requireAuth, getSentRequests);
router.get('/friends/blocked', requireAuth, getBlockedUsers);
router.get('/friends/mutual/:targetUserId', requireAuth, getMutualFriends);
router.get('/friends/status/:targetUserId', optionalAuth, getFriendshipStatus);
router.post('/friends/request/:targetUserId', requireAuth, sendFriendRequest);
router.post('/friends/requests/:requestId/accept', requireAuth, acceptFriendRequest);
router.post('/friends/request/:requestId/accept', requireAuth, acceptFriendRequest);
router.post('/friends/accept/:requestId', requireAuth, acceptFriendRequest);
router.post('/friends/requests/:requestId/reject', requireAuth, rejectFriendRequest);
router.post('/friends/request/:requestId/reject', requireAuth, rejectFriendRequest);
router.post('/friends/reject/:requestId', requireAuth, rejectFriendRequest);
router.post('/friends/requests/:requestId/cancel', requireAuth, cancelFriendRequest);
router.post('/friends/request/:targetUserId/cancel', requireAuth, cancelFriendRequest);
router.delete('/friends/requests/:requestId/cancel', requireAuth, cancelFriendRequest);
router.delete('/friends/request/:requestId', requireAuth, cancelFriendRequest);
router.delete('/friends/request/:targetUserId/cancel', requireAuth, cancelFriendRequest);
router.delete('/friends/:targetUserId', requireAuth, unfriend);
router.post('/friends/:targetUserId/unfriend', requireAuth, unfriend);
router.post('/friends/:targetUserId/block', requireAuth, blockUser);
router.post('/users/:targetUserId/block', requireAuth, blockUser);
router.post('/friends/:targetUserId/unblock', requireAuth, unblockUser);
router.post('/users/:targetUserId/unblock', requireAuth, unblockUser);
router.delete('/users/:targetUserId/unblock', requireAuth, unblockUser);
router.get('/users/blocked/list', requireAuth, getBlockedUsers);

// ===================== PRIVATE MESSAGING =====================
router.get('/chat/conversations', requireAuth, getConversations);
router.get('/conversations', requireAuth, getConversations);
router.post('/chat/conversations', requireAuth, getOrCreateDirectConversation);
router.post('/conversations', requireAuth, getOrCreateDirectConversation);
router.post('/chat/conversations/direct/:targetUserId', requireAuth, getOrCreateDirectConversation);
router.get('/chat/conversations/:id/messages', requireAuth, getMessages);
router.get('/conversations/:id/messages', requireAuth, getMessages);
router.post('/chat/conversations/:id/messages', requireAuth, sendMessage);
router.post('/conversations/:id/messages', requireAuth, sendMessage);
router.put('/chat/messages/:id', requireAuth, editMessage);
router.delete('/chat/messages/:id', requireAuth, deleteMessage);
router.post('/chat/conversations/:id/read', requireAuth, markConversationAsRead);
router.post('/conversations/:id/read', requireAuth, markConversationAsRead);

// ===================== CALLING & WEBRTC =====================
router.get('/calls/history', requireAuth, getCallHistory);
router.post('/calls', requireAuth, initiateCall);
router.put('/calls/:id', requireAuth, updateCallStatus);
router.post('/calls/:id/status', requireAuth, updateCallStatus);
router.get('/calls/ice-servers', getWebRTCSettings);
router.put('/admin/webrtc-settings', requireAuth, requireSuperAdmin, updateWebRTCSettings);

// ===================== GROUP SYSTEM =====================
router.get('/groups', optionalAuth, getGroups);
router.post('/groups', requireAuth, createGroup);
router.get('/groups/:slugOrId', optionalAuth, getGroup);
router.post('/groups/:id/join', requireAuth, joinGroup);
router.post('/groups/:id/leave', requireAuth, leaveGroup);
router.get('/groups/:id/members', optionalAuth, getGroupMembers);
router.get('/groups/:id/requests', requireAuth, getGroupJoinRequests);
router.post('/groups/:id/requests/:requestId/approve', requireAuth, approveJoinRequest);
router.post('/groups/:id/requests/:requestId/reject', requireAuth, rejectJoinRequest);
router.put('/groups/:id/members/:userId/role', requireAuth, updateMemberRole);
router.delete('/groups/:id/members/:userId', requireAuth, removeMember);
router.get('/groups/:id/posts', optionalAuth, getGroupPosts);

// ===================== MULTI-LANGUAGE AUDIO TRACKS =====================
router.get('/videos/:videoId/audio-tracks', getVideoAudioTracks);
router.get('/admin/videos/:videoId/audio-tracks', requireAuth, requireAdmin, getAdminVideoAudioTracks);
router.post('/admin/videos/:videoId/audio-tracks', requireAuth, requireAdmin, createVideoAudioTrack);
router.put('/admin/videos/:videoId/audio-tracks/:trackId', requireAuth, requireAdmin, updateVideoAudioTrack);
router.delete('/admin/videos/:videoId/audio-tracks/:trackId', requireAuth, requireAdmin, deleteVideoAudioTrack);

// ===================== ADMIN SETTINGS: GENERAL, CLOUDFLARE R2 & SMTP =====================
router.get('/admin/settings/general', requireAuth, requireAdmin, getGeneralSettings);
router.put('/admin/settings/general', requireAuth, requireAdmin, updateGeneralSettings);

router.get('/admin/settings/r2', requireAuth, requireAdmin, getR2Config);
router.get('/admin/r2', requireAuth, requireAdmin, getR2Config);
router.put('/admin/settings/r2', requireAuth, requireAdmin, updateR2Config);
router.put('/admin/r2', requireAuth, requireAdmin, updateR2Config);
router.post('/admin/settings/r2/test', requireAuth, requireAdmin, testR2Endpoint);
router.post('/admin/r2/test', requireAuth, requireAdmin, testR2Endpoint);

router.get('/admin/settings/smtp', requireAuth, requireAdmin, getSmtpConfig);
router.get('/admin/smtp', requireAuth, requireAdmin, getSmtpConfig);
router.put('/admin/settings/smtp', requireAuth, requireAdmin, updateSmtpConfig);
router.put('/admin/smtp', requireAuth, requireAdmin, updateSmtpConfig);
router.post('/admin/settings/smtp/test', requireAuth, requireAdmin, testSmtpEndpoint);
router.post('/admin/smtp/test', requireAuth, requireAdmin, testSmtpEndpoint);

export default router;

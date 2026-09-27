-- DevSphere Social Media Platform Database Dump
-- Compatible with phpMyAdmin, MySQL 8.0+ and MariaDB 10.4+
-- Server OS: Linux / cPanel / CyberPanel / VPS
-- Charset: utf8mb4 / Collation: utf8mb4_unicode_ci

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------
-- Table structure for table `users`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('USER', 'ADMIN', 'SUPER_ADMIN') NOT NULL DEFAULT 'USER',
  `status` ENUM('ACTIVE', 'SUSPENDED', 'BANNED', 'DEACTIVATED') NOT NULL DEFAULT 'ACTIVE',
  `is_email_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 0,
  `last_login_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email`),
  KEY `idx_users_role_status` (`role`, `status`),
  KEY `idx_users_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `user_profiles`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_profiles` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `username` VARCHAR(60) NOT NULL,
  `full_name` VARCHAR(120) NOT NULL,
  `avatar_url` VARCHAR(500) NULL,
  `cover_url` VARCHAR(500) NULL,
  `bio` TEXT NULL,
  `location` VARCHAR(150) NULL,
  `website` VARCHAR(255) NULL,
  `work` VARCHAR(150) NULL,
  `education` VARCHAR(150) NULL,
  `gender` VARCHAR(30) NULL,
  `followers_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `following_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `friends_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `posts_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_profiles_user_id` (`user_id`),
  UNIQUE KEY `idx_user_profiles_username` (`username`),
  KEY `idx_user_profiles_full_name` (`full_name`),
  CONSTRAINT `fk_user_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `email_verifications`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `email_verifications` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `otp_code` VARCHAR(10) NOT NULL,
  `token` VARCHAR(100) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `is_used` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_email_verifications_user` (`user_id`),
  KEY `idx_email_verifications_lookup` (`user_id`, `otp_code`, `is_used`),
  CONSTRAINT `fk_email_verifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `password_reset_otps`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `password_reset_otps` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(191) NOT NULL,
  `otp_code` VARCHAR(10) NOT NULL,
  `attempts` INT UNSIGNED NOT NULL DEFAULT 0,
  `expires_at` DATETIME NOT NULL,
  `is_used` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pw_reset_email_otp` (`email`, `otp_code`, `is_used`),
  KEY `idx_pw_reset_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `sessions`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `token` VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  `device_type` VARCHAR(50) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_active_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_sessions_token` (`token`),
  KEY `idx_sessions_user_active` (`user_id`, `is_active`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `user_settings`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_settings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `theme` VARCHAR(20) NOT NULL DEFAULT 'light',
  `email_notifications` TINYINT(1) NOT NULL DEFAULT 1,
  `sound_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `code_theme` VARCHAR(30) NOT NULL DEFAULT 'vivid-dark',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_settings_user` (`user_id`),
  CONSTRAINT `fk_user_settings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `privacy_settings`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `privacy_settings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `who_can_see_posts` ENUM('PUBLIC', 'FRIENDS', 'ONLY_ME') NOT NULL DEFAULT 'PUBLIC',
  `who_can_send_requests` ENUM('EVERYONE', 'FRIENDS_OF_FRIENDS', 'NOBODY') NOT NULL DEFAULT 'EVERYONE',
  `who_can_see_friends` ENUM('PUBLIC', 'FRIENDS', 'ONLY_ME') NOT NULL DEFAULT 'PUBLIC',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_privacy_settings_user` (`user_id`),
  CONSTRAINT `fk_privacy_settings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `followers`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `followers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `follower_id` INT UNSIGNED NOT NULL,
  `following_id` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_follower_following` (`follower_id`, `following_id`),
  KEY `idx_following_id` (`following_id`),
  CONSTRAINT `fk_followers_follower` FOREIGN KEY (`follower_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_followers_following` FOREIGN KEY (`following_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `friends`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `friends` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `friend_id` INT UNSIGNED NOT NULL,
  `status` ENUM('ACCEPTED') NOT NULL DEFAULT 'ACCEPTED',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_friends_pair` (`user_id`, `friend_id`),
  KEY `idx_friends_friend_id` (`friend_id`),
  CONSTRAINT `fk_friends_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_friends_friend` FOREIGN KEY (`friend_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `friend_requests`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `friend_requests` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sender_id` INT UNSIGNED NOT NULL,
  `receiver_id` INT UNSIGNED NOT NULL,
  `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_friend_req_pair` (`sender_id`, `receiver_id`),
  KEY `idx_friend_req_receiver_status` (`receiver_id`, `status`),
  CONSTRAINT `fk_friend_req_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_friend_req_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `friendships`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `friendships` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `friend_id` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_friendship_pair` (`user_id`, `friend_id`),
  KEY `idx_friendship_user` (`user_id`),
  KEY `idx_friendship_friend` (`friend_id`),
  CONSTRAINT `fk_friendships_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_friendships_friend` FOREIGN KEY (`friend_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `blocked_users`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `blocked_users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `blocked_user_id` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_blocked_pair` (`user_id`, `blocked_user_id`),
  KEY `idx_blocked_target` (`blocked_user_id`),
  CONSTRAINT `fk_blocked_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_blocked_target` FOREIGN KEY (`blocked_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `pages`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pages` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `category` VARCHAR(60) NOT NULL DEFAULT 'Technology',
  `avatar_url` VARCHAR(500) NULL,
  `cover_url` VARCHAR(500) NULL,
  `website` VARCHAR(255) NULL,
  `phone` VARCHAR(50) NULL,
  `email` VARCHAR(191) NULL,
  `location` VARCHAR(150) NULL,
  `followers_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_pages_slug` (`slug`),
  KEY `idx_pages_user` (`user_id`),
  KEY `idx_pages_category` (`category`),
  CONSTRAINT `fk_pages_owner` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `page_members`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `page_members` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `page_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `role` ENUM('OWNER', 'ADMIN', 'EDITOR', 'MODERATOR') NOT NULL DEFAULT 'ADMIN',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_page_member_pair` (`page_id`, `user_id`),
  KEY `idx_page_member_user` (`user_id`),
  CONSTRAINT `fk_page_members_page` FOREIGN KEY (`page_id`) REFERENCES `pages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_page_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `page_followers`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `page_followers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `page_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_page_followers_pair` (`page_id`, `user_id`),
  KEY `idx_page_followers_user` (`user_id`),
  CONSTRAINT `fk_page_followers_page` FOREIGN KEY (`page_id`) REFERENCES `pages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_page_followers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `groups`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `groups` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `category` VARCHAR(60) NOT NULL DEFAULT 'General',
  `privacy` ENUM('PUBLIC', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC',
  `avatar_url` VARCHAR(500) NULL,
  `cover_url` VARCHAR(500) NULL,
  `rules` TEXT NULL,
  `owner_id` INT UNSIGNED NOT NULL,
  `members_count` INT UNSIGNED NOT NULL DEFAULT 1,
  `posts_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_groups_slug` (`slug`),
  KEY `idx_groups_owner` (`owner_id`),
  KEY `idx_groups_category` (`category`),
  CONSTRAINT `fk_groups_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `group_members`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `group_members` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `group_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `role` ENUM('OWNER', 'ADMIN', 'MODERATOR', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
  `is_muted` TINYINT(1) NOT NULL DEFAULT 0,
  `joined_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_group_member_pair` (`group_id`, `user_id`),
  KEY `idx_group_member_user` (`user_id`),
  CONSTRAINT `fk_group_members_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_group_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `group_join_requests`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `group_join_requests` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `group_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_group_request_pair` (`group_id`, `user_id`),
  KEY `idx_group_request_group_status` (`group_id`, `status`),
  CONSTRAINT `fk_group_requests_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_group_requests_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `group_bans`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `group_bans` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `group_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `banned_by` INT UNSIGNED NOT NULL,
  `reason` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_group_ban_pair` (`group_id`, `user_id`),
  KEY `idx_group_bans_user` (`user_id`),
  CONSTRAINT `fk_group_bans_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_group_bans_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_group_bans_admin` FOREIGN KEY (`banned_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `posts`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `posts` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `page_id` INT UNSIGNED NULL,
  `group_id` INT UNSIGNED NULL,
  `post_type` ENUM('NORMAL', 'CODE', 'MEDIA', 'MIXED') NOT NULL DEFAULT 'NORMAL',
  `privacy` ENUM('PUBLIC', 'FRIENDS', 'ONLY_ME') NOT NULL DEFAULT 'PUBLIC',
  `content` LONGTEXT NULL,
  `location_name` VARCHAR(150) NULL,
  `feeling_emoji` VARCHAR(20) NULL,
  `feeling_text` VARCHAR(60) NULL,
  `reactions_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `comments_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `shares_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `views_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_pinned` TINYINT(1) NOT NULL DEFAULT 0,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_posts_user_feed` (`user_id`, `is_deleted`, `created_at`),
  KEY `idx_posts_page` (`page_id`),
  KEY `idx_posts_group` (`group_id`),
  KEY `idx_posts_created_at` (`created_at`),
  KEY `idx_posts_privacy` (`privacy`),
  CONSTRAINT `fk_posts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_posts_page` FOREIGN KEY (`page_id`) REFERENCES `pages` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_posts_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `post_blocks`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `post_blocks` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `post_id` INT UNSIGNED NOT NULL,
  `block_order` INT UNSIGNED NOT NULL DEFAULT 0,
  `block_type` ENUM('TEXT', 'IMAGE', 'VIDEO', 'CODE', 'LINK') NOT NULL,
  `content` LONGTEXT NOT NULL,
  `meta_json` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_post_blocks_order` (`post_id`, `block_order`),
  CONSTRAINT `fk_post_blocks_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `post_media`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `post_media` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `post_id` INT UNSIGNED NOT NULL,
  `media_url` VARCHAR(500) NOT NULL,
  `media_type` ENUM('IMAGE', 'VIDEO') NOT NULL,
  `thumbnail_url` VARCHAR(500) NULL,
  `storage_type` ENUM('LOCAL', 'R2') NOT NULL DEFAULT 'LOCAL',
  `file_size` BIGINT UNSIGNED NULL,
  `width` INT UNSIGNED NULL,
  `height` INT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_post_media_post` (`post_id`),
  CONSTRAINT `fk_post_media_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `post_reactions`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `post_reactions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `post_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `reaction_type` ENUM('LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY', 'CODE') NOT NULL DEFAULT 'LIKE',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_post_user_reaction` (`post_id`, `user_id`),
  KEY `idx_post_reactions_user` (`user_id`),
  CONSTRAINT `fk_post_reactions_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_post_reactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `saved_posts`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `saved_posts` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `post_id` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_saved_posts_pair` (`user_id`, `post_id`),
  KEY `idx_saved_posts_post` (`post_id`),
  CONSTRAINT `fk_saved_posts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_saved_posts_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `comments`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `comments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `post_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `parent_id` INT UNSIGNED NULL,
  `content` TEXT NOT NULL,
  `code_snippet` LONGTEXT NULL,
  `code_language` VARCHAR(50) NULL,
  `image_url` VARCHAR(500) NULL,
  `likes_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_comments_post` (`post_id`, `parent_id`, `created_at`),
  KEY `idx_comments_user` (`user_id`),
  CONSTRAINT `fk_comments_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comments_parent` FOREIGN KEY (`parent_id`) REFERENCES `comments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `comment_reactions`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `comment_reactions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `comment_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `reaction_type` ENUM('LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY', 'CODE') NOT NULL DEFAULT 'LIKE',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_comment_user_reaction` (`comment_id`, `user_id`),
  KEY `idx_comment_reactions_user` (`user_id`),
  CONSTRAINT `fk_comment_reactions_comment` FOREIGN KEY (`comment_id`) REFERENCES `comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comment_reactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `stories`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `stories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `media_url` VARCHAR(500) NULL,
  `media_type` ENUM('IMAGE', 'VIDEO', 'TEXT') NOT NULL DEFAULT 'IMAGE',
  `text_content` TEXT NULL,
  `background_color` VARCHAR(30) NULL DEFAULT '#1e293b',
  `views_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `expires_at` DATETIME NOT NULL,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stories_user_active` (`user_id`, `is_deleted`, `expires_at`),
  KEY `idx_stories_expires` (`expires_at`),
  CONSTRAINT `fk_stories_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `story_views`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `story_views` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `story_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `viewed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_story_user_view` (`story_id`, `user_id`),
  KEY `idx_story_views_user` (`user_id`),
  CONSTRAINT `fk_story_views_story` FOREIGN KEY (`story_id`) REFERENCES `stories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_story_views_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `story_reactions`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `story_reactions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `story_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `reaction_type` VARCHAR(20) NOT NULL DEFAULT '❤️',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_story_reactions_story` (`story_id`),
  CONSTRAINT `fk_story_reactions_story` FOREIGN KEY (`story_id`) REFERENCES `stories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_story_reactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `videos`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `videos` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `video_url` VARCHAR(500) NOT NULL,
  `thumbnail_url` VARCHAR(500) NULL,
  `duration` INT UNSIGNED NOT NULL DEFAULT 0,
  `views_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `likes_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `comments_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `storage_type` ENUM('LOCAL', 'R2') NOT NULL DEFAULT 'LOCAL',
  `is_short` TINYINT(1) NOT NULL DEFAULT 0,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_videos_feed` (`is_short`, `is_deleted`, `created_at`),
  KEY `idx_videos_user` (`user_id`),
  CONSTRAINT `fk_videos_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `video_reactions`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `video_reactions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `video_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `reaction_type` VARCHAR(20) NOT NULL DEFAULT 'LIKE',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_video_user_reaction` (`video_id`, `user_id`),
  KEY `idx_video_reactions_user` (`user_id`),
  CONSTRAINT `fk_video_reactions_video` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_video_reactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `video_views`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `video_views` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `video_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NULL,
  `ip_address` VARCHAR(45) NULL,
  `viewed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_video_views_video` (`video_id`),
  CONSTRAINT `fk_video_views_video` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `video_audio_tracks`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `video_audio_tracks` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `video_id` INT UNSIGNED NOT NULL,
  `language_name` VARCHAR(50) NOT NULL,
  `language_code` VARCHAR(10) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `storage_key` VARCHAR(255) NOT NULL,
  `audio_url` VARCHAR(500) NOT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_video_audio_lang` (`video_id`, `language_code`),
  KEY `idx_video_audio_video` (`video_id`),
  KEY `idx_video_audio_admin` (`created_by`),
  CONSTRAINT `fk_audio_tracks_video` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_audio_tracks_admin` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `conversations`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `conversations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `type` ENUM('DIRECT', 'GROUP') NOT NULL DEFAULT 'DIRECT',
  `title` VARCHAR(150) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_conversations_updated` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `conversation_members`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `conversation_members` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `conversation_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `joined_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_read_message_id` INT UNSIGNED NULL,
  `last_read_at` DATETIME NULL,
  `is_muted` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_conv_member_pair` (`conversation_id`, `user_id`),
  KEY `idx_conv_member_user` (`user_id`),
  CONSTRAINT `fk_conv_members_conv` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_conv_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `messages`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `messages` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `conversation_id` INT UNSIGNED NOT NULL,
  `sender_id` INT UNSIGNED NOT NULL,
  `message_type` ENUM('TEXT', 'IMAGE', 'FILE', 'CODE') NOT NULL DEFAULT 'TEXT',
  `content` TEXT NULL,
  `code_language` VARCHAR(50) NULL,
  `code_title` VARCHAR(150) NULL,
  `parent_id` INT UNSIGNED NULL,
  `is_edited` TINYINT(1) NOT NULL DEFAULT 0,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_messages_conv_created` (`conversation_id`, `created_at`),
  KEY `idx_messages_sender` (`sender_id`),
  KEY `idx_messages_parent` (`parent_id`),
  CONSTRAINT `fk_messages_conv` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_messages_parent` FOREIGN KEY (`parent_id`) REFERENCES `messages` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `message_attachments`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `message_attachments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `message_id` INT UNSIGNED NOT NULL,
  `file_url` VARCHAR(500) NOT NULL,
  `file_type` VARCHAR(50) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_size` INT UNSIGNED NOT NULL DEFAULT 0,
  `storage_key` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_msg_att_message` (`message_id`),
  CONSTRAINT `fk_msg_att_msg` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `message_reads`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `message_reads` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `message_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `read_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_msg_reads_pair` (`message_id`, `user_id`),
  KEY `idx_msg_reads_user` (`user_id`),
  CONSTRAINT `fk_msg_reads_msg` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_msg_reads_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `calls`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `calls` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `caller_id` INT UNSIGNED NOT NULL,
  `receiver_id` INT UNSIGNED NOT NULL,
  `call_type` ENUM('VOICE', 'VIDEO') NOT NULL DEFAULT 'VOICE',
  `status` ENUM('RINGING', 'ACCEPTED', 'REJECTED', 'MISSED', 'ENDED') NOT NULL DEFAULT 'RINGING',
  `started_at` DATETIME NULL,
  `ended_at` DATETIME NULL,
  `duration_seconds` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_calls_caller` (`caller_id`),
  KEY `idx_calls_receiver` (`receiver_id`),
  KEY `idx_calls_status_date` (`status`, `created_at`),
  CONSTRAINT `fk_calls_caller` FOREIGN KEY (`caller_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_calls_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `call_participants`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `call_participants` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `call_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `role` ENUM('CALLER', 'RECEIVER', 'PARTICIPANT') NOT NULL DEFAULT 'PARTICIPANT',
  `status` ENUM('RINGING', 'ACCEPTED', 'REJECTED', 'LEFT') NOT NULL DEFAULT 'RINGING',
  `joined_at` DATETIME NULL,
  `left_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_call_participant_pair` (`call_id`, `user_id`),
  KEY `idx_call_participant_call` (`call_id`),
  KEY `idx_call_participant_user` (`user_id`),
  CONSTRAINT `fk_call_part_call` FOREIGN KEY (`call_id`) REFERENCES `calls` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_call_part_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `webrtc_settings`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `webrtc_settings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `stun_server` VARCHAR(255) NOT NULL DEFAULT 'stun:stun.l.google.com:19302',
  `turn_server` VARCHAR(255) NULL,
  `turn_username` VARCHAR(150) NULL,
  `turn_credential` VARCHAR(255) NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `notifications`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `actor_id` INT UNSIGNED NULL,
  `entity_type` ENUM('POST', 'COMMENT', 'REACTION', 'FOLLOW', 'PAGE', 'ADMIN', 'FRIEND') NOT NULL,
  `entity_id` INT UNSIGNED NULL,
  `message` VARCHAR(255) NOT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_read` (`user_id`, `is_read`, `created_at`),
  KEY `idx_notifications_actor` (`actor_id`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notifications_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `reports`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reports` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reporter_id` INT UNSIGNED NOT NULL,
  `reported_type` ENUM('USER', 'POST', 'COMMENT', 'VIDEO', 'SHORT_VIDEO', 'PAGE') NOT NULL,
  `reported_id` INT UNSIGNED NOT NULL,
  `reason` ENUM('SPAM', 'HARASSMENT', 'FALSE_INFO', 'VIOLENCE', 'COPYRIGHT', 'INAPPROPRIATE', 'OTHER') NOT NULL,
  `details` TEXT NULL,
  `status` ENUM('PENDING', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'PENDING',
  `moderator_id` INT UNSIGNED NULL,
  `moderator_notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reports_status` (`status`, `created_at`),
  KEY `idx_reports_target` (`reported_type`, `reported_id`),
  KEY `idx_reports_reporter` (`reporter_id`),
  CONSTRAINT `fk_reports_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reports_moderator` FOREIGN KEY (`moderator_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `admin_logs`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin_logs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id` INT UNSIGNED NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `target_type` VARCHAR(50) NULL,
  `target_id` INT UNSIGNED NULL,
  `ip_address` VARCHAR(45) NULL,
  `details` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin_logs_admin` (`admin_id`),
  KEY `idx_admin_logs_created` (`created_at`),
  CONSTRAINT `fk_admin_logs_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `login_logs`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `login_logs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NULL,
  `email` VARCHAR(191) NOT NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  `status` ENUM('SUCCESS', 'FAILED') NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_login_logs_email` (`email`, `created_at`),
  KEY `idx_login_logs_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `system_settings`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` LONGTEXT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_sys_settings_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `r2_settings`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `r2_settings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `account_id` VARCHAR(150) NULL,
  `access_key_id` VARCHAR(150) NULL,
  `secret_access_key` VARCHAR(500) NULL COMMENT 'Encrypted AES-256-GCM string',
  `bucket_name` VARCHAR(150) NULL DEFAULT 'devsphere-media',
  `endpoint` VARCHAR(255) NULL,
  `public_url` VARCHAR(255) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 0,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `smtp_settings`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `smtp_settings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `host` VARCHAR(150) NULL,
  `port` INT UNSIGNED NOT NULL DEFAULT 587,
  `username` VARCHAR(150) NULL,
  `password` VARCHAR(500) NULL COMMENT 'Encrypted AES-256-GCM string',
  `encryption` ENUM('tls', 'ssl', 'none') NOT NULL DEFAULT 'tls',
  `from_email` VARCHAR(191) NOT NULL DEFAULT 'no-reply@devsphere.com',
  `from_name` VARCHAR(100) NOT NULL DEFAULT 'DevSphere Social',
  `is_active` TINYINT(1) NOT NULL DEFAULT 0,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- SEED DATA (Default Admin & System Initial State)
-- --------------------------------------------------------

-- 1. Insert Default Administrator
-- Email: sabiborhosain@gmail.com
-- Initial password: 100200300 (Bcrypt hashed with 10 rounds)
-- Must change password warning enabled: must_change_password = 1
INSERT INTO `users` (`id`, `email`, `password_hash`, `role`, `status`, `is_email_verified`, `must_change_password`, `created_at`) VALUES
(1, 'sabiborhosain@gmail.com', '$2b$10$Ca1REzcAD361CHe99dIY7e8uLQ8DJX6RVcDLvbC18pGios4bAm8Yq', 'SUPER_ADMIN', 'ACTIVE', 1, 1, NOW()),
(2, 'alex.coder@devsphere.io', '$2b$10$Ca1REzcAD361CHe99dIY7e8uLQ8DJX6RVcDLvbC18pGios4bAm8Yq', 'USER', 'ACTIVE', 1, 0, NOW()),
(3, 'sarah.engineer@devsphere.io', '$2b$10$Ca1REzcAD361CHe99dIY7e8uLQ8DJX6RVcDLvbC18pGios4bAm8Yq', 'USER', 'ACTIVE', 1, 0, NOW());

-- 2. Insert User Profiles
INSERT INTO `user_profiles` (`id`, `user_id`, `username`, `full_name`, `avatar_url`, `cover_url`, `bio`, `location`, `website`, `work`, `education`, `followers_count`, `following_count`, `posts_count`, `created_at`) VALUES
(1, 1, 'sabiborhosain', 'Sabibor Hosain', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80', 'Platform Founder & Lead Architect at DevSphere. Passionate about high-throughput distributed systems, React, and MySQL.', 'San Francisco, CA', 'https://devsphere.social', 'Chief Technology Officer', 'Computer Science M.S.', 1420, 18, 5, NOW()),
(2, 2, 'alex_dev', 'Alex Vance', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80', 'Full-stack TypeScript developer & Rust enthusiast. Writing clean code and building scalable cloud microservices.', 'Austin, TX', 'https://alexvance.codes', 'Senior Software Engineer', 'B.S. Software Engineering', 890, 142, 8, NOW()),
(3, 3, 'sarah_tech', 'Sarah Connor', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80', 'DevOps & Cloud Architect. Kubernetes, Docker, Cloudflare R2, and Terraform advocate.', 'Seattle, WA', 'https://cloudsarah.io', 'Principal Cloud Architect', 'M.Sc. Information Security', 1120, 95, 12, NOW());

-- 3. Initial User Settings
INSERT INTO `user_settings` (`user_id`, `theme`, `email_notifications`, `sound_enabled`, `code_theme`) VALUES
(1, 'light', 1, 1, 'vivid-dark'),
(2, 'light', 1, 1, 'vivid-dark'),
(3, 'light', 1, 1, 'vivid-dark');

-- 4. Initial Privacy Settings
INSERT INTO `privacy_settings` (`user_id`, `who_can_see_posts`, `who_can_send_requests`, `who_can_see_friends`) VALUES
(1, 'PUBLIC', 'EVERYONE', 'PUBLIC'),
(2, 'PUBLIC', 'EVERYONE', 'PUBLIC'),
(3, 'PUBLIC', 'EVERYONE', 'PUBLIC');

-- 5. Seed Pages
INSERT INTO `pages` (`id`, `user_id`, `name`, `slug`, `description`, `category`, `avatar_url`, `cover_url`, `website`, `location`, `followers_count`, `is_verified`, `created_at`) VALUES
(1, 1, 'TypeScript Architects', 'typescript-architects', 'The official community for TypeScript design patterns, strict mode practices, and advanced type gymnastics.', 'Technology', 'https://images.unsplash.com/photo-1516116211227-bbc3e617d59b?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80', 'https://typescriptlang.org', 'Global / Remote', 5420, 1, NOW()),
(2, 2, 'Cloud & DevOps Masters', 'cloud-devops-masters', 'Deep dives into AWS, Cloudflare R2, Docker, CI/CD pipelines, and high availability hosting.', 'Community', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80', 'https://devopsmasters.io', 'Austin, TX', 3810, 1, NOW());

-- 6. Initial Posts with Mixed Blocks & Code Blocks
INSERT INTO `posts` (`id`, `user_id`, `page_id`, `post_type`, `privacy`, `content`, `location_name`, `feeling_emoji`, `feeling_text`, `reactions_count`, `comments_count`, `created_at`) VALUES
(1, 1, NULL, 'MIXED', 'PUBLIC', 'Welcome to DevSphere! We are thrilled to launch this complete, production-ready developer social platform. Here is how our block-based post architecture elegantly separates code execution, formatting, and responsive viewing:', 'DevSphere HQ, Silicon Valley', '🚀', 'excited', 42, 6, NOW() - INTERVAL 2 HOUR),
(2, 2, NULL, 'CODE', 'PUBLIC', 'Check out this clean TypeScript utility for verifying RSA-signed JWT payloads with fallback token rotation. What do you think about this pattern?', 'Austin Tech District', '💡', 'thoughtful', 19, 3, NOW() - INTERVAL 1 HOUR);

-- 7. Post Blocks (Special Coding Post System)
INSERT INTO `post_blocks` (`id`, `post_id`, `block_order`, `block_type`, `content`, `meta_json`) VALUES
(1, 1, 0, 'TEXT', 'DevSphere empowers developers and engineers to share rich multimedia thoughts, interactive code snippets with syntax highlighting, and architecture deep dives.', NULL),
(2, 1, 1, 'CODE', '/**\n * Enterprise Resilient Database Connection Pool\n * Supports seamless MySQL connection with automatic failover fallback\n */\nimport mysql from \"mysql2/promise\";\n\nexport async function createConnectionPool() {\n  return mysql.createPool({\n    host: process.env.DB_HOST || \"localhost\",\n    user: process.env.DB_USER || \"root\",\n    password: process.env.DB_PASSWORD || \"\",\n    database: process.env.DB_NAME || \"devsphere_db\",\n    waitForConnections: true,\n    connectionLimit: 20,\n    queueLimit: 0\n  });\n}', JSON_OBJECT('language', 'typescript', 'title', 'db-pool.ts')),
(3, 1, 2, 'TEXT', 'Every code block supports one-click copying, line numbering, and syntax highlighting for 20+ languages including TypeScript, Python, Go, and SQL.', NULL),
(4, 2, 0, 'TEXT', 'Here is the token validation function with strict payload parsing:', NULL),
(5, 2, 1, 'CODE', 'import jwt from \"jsonwebtoken\";\n\ninterface TokenPayload {\n  userId: number;\n  email: string;\n  role: \"USER\" | \"ADMIN\" | \"SUPER_ADMIN\";\n}\n\nexport function verifyUserToken(token: string): TokenPayload | null {\n  try {\n    return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;\n  } catch (err) {\n    return null;\n  }\n}', JSON_OBJECT('language', 'typescript', 'title', 'verifyToken.ts'));

-- 8. Post Reactions
INSERT INTO `post_reactions` (`post_id`, `user_id`, `reaction_type`) VALUES
(1, 2, 'CODE'),
(1, 3, 'LOVE'),
(2, 1, 'LIKE');

-- 9. Post Comments with Rich Code Blocks
INSERT INTO `comments` (`id`, `post_id`, `user_id`, `parent_id`, `content`, `code_snippet`, `code_language`, `likes_count`, `created_at`) VALUES
(1, 1, 2, NULL, 'The block-based post architecture is super clean! Here is an example of calling it from our React frontend hook:', 'const { data, loading } = useFeed({\n  cursor: 0,\n  limit: 10\n});', 'typescript', 4, NOW() - INTERVAL 90 MINUTE),
(2, 1, 3, NULL, 'Great job team! Cloudflare R2 integration makes storing high-resolution photos and video reels fast and affordable.', NULL, NULL, 2, NOW() - INTERVAL 45 MINUTE);

-- 10. Stories (Expiring in 24 hours)
INSERT INTO `stories` (`id`, `user_id`, `media_url`, `media_type`, `text_content`, `background_color`, `views_count`, `expires_at`, `created_at`) VALUES
(1, 1, 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80', 'IMAGE', 'Shipping DevSphere v1.0.0 today! 🎉', '#0f172a', 142, NOW() + INTERVAL 22 HOUR, NOW() - INTERVAL 2 HOUR),
(2, 2, NULL, 'TEXT', 'Migrating our distributed cache to Redis v7 tomorrow morning at 04:00 UTC.', '#1e3a8a', 88, NOW() + INTERVAL 20 HOUR, NOW() - INTERVAL 4 HOUR);

-- 11. Short Videos (Reels) & Videos
INSERT INTO `videos` (`id`, `user_id`, `title`, `description`, `video_url`, `thumbnail_url`, `duration`, `views_count`, `likes_count`, `is_short`, `created_at`) VALUES
(1, 1, '5 TypeScript Tips in 60 Seconds', 'Level up your type safety with satisfies operator, const assertions, and branded types!', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80', 58, 2340, 189, 1, NOW() - INTERVAL 6 HOUR),
(2, 2, 'Building Cloudflare R2 Media Pipelines with Node.js', 'Comprehensive guide to generating signed PUT URLs and direct client-side uploads with zero backend bandwidth load.', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80', 720, 1250, 94, 0, NOW() - INTERVAL 12 HOUR);

-- 12. Default System & Service Settings
INSERT INTO `system_settings` (`setting_key`, `setting_value`) VALUES
('site_name', 'DevSphere Social'),
('site_tagline', 'The Social Network for Developers & Engineers'),
('site_description', 'Connect, share code blocks, watch reels, and collaborate with tech minds worldwide.'),
('allow_registration', '1'),
('email_verification_required', '0'),
('max_upload_size_mb', '50');

INSERT INTO `r2_settings` (`id`, `account_id`, `access_key_id`, `secret_access_key`, `bucket_name`, `endpoint`, `public_url`, `is_active`) VALUES
(1, '', '', '', 'devsphere-media', '', '', 0);

INSERT INTO `smtp_settings` (`id`, `host`, `port`, `username`, `password`, `encryption`, `from_email`, `from_name`, `is_active`) VALUES
(1, '', 587, '', '', 'tls', 'no-reply@devsphere.com', 'DevSphere Social', 0);

-- 13. Groups & Group Members
INSERT INTO `groups` (`id`, `name`, `slug`, `description`, `category`, `privacy`, `avatar_url`, `cover_url`, `rules`, `owner_id`, `members_count`, `posts_count`, `created_at`) VALUES
(1, 'System Design & Distributed Architectures', 'system-design-distributed-architectures', 'Engineering discussions on microservices, event-driven pipelines, consensus algorithms, and database sharding.', 'Architecture', 'PUBLIC', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80', '1. Respect all members\n2. Share code and architecture diagrams\n3. No spam or self-promotion', 1, 24, 3, NOW() - INTERVAL 14 DAY),
(2, 'React 19 & Next.js Core Contributors', 'react-19-nextjs-contributors', 'Private research group evaluating React 19 Server Actions, compiler optimizations, and streaming SSR.', 'Frontend', 'PRIVATE', 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80', '1. Active contribution required\n2. Confidential discussion', 2, 8, 1, NOW() - INTERVAL 10 DAY);

INSERT INTO `group_members` (`id`, `group_id`, `user_id`, `role`, `is_muted`, `joined_at`) VALUES
(1, 1, 1, 'OWNER', 0, NOW() - INTERVAL 14 DAY),
(2, 1, 2, 'ADMIN', 0, NOW() - INTERVAL 13 DAY),
(3, 1, 3, 'MEMBER', 0, NOW() - INTERVAL 12 DAY),
(4, 2, 2, 'OWNER', 0, NOW() - INTERVAL 10 DAY),
(5, 2, 1, 'MEMBER', 0, NOW() - INTERVAL 9 DAY);

-- 14. Private Messaging Conversations & Messages
INSERT INTO `conversations` (`id`, `type`, `title`, `created_at`, `updated_at`) VALUES
(1, 'DIRECT', NULL, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 15 MINUTE);

INSERT INTO `conversation_members` (`id`, `conversation_id`, `user_id`, `last_read_message_id`, `last_read_at`, `is_muted`) VALUES
(1, 1, 1, 2, NOW(), 0),
(2, 1, 2, 2, NOW(), 0);

INSERT INTO `messages` (`id`, `conversation_id`, `sender_id`, `message_type`, `content`, `code_language`, `code_title`, `is_edited`, `is_deleted`, `created_at`) VALUES
(1, 1, 2, 'TEXT', 'Hey Sabibor! Have you tested the new WebRTC signaling bridge for DevSphere audio/video calls?', NULL, NULL, 0, 0, NOW() - INTERVAL 60 MINUTE),
(2, 1, 1, 'CODE', '// WebRTC Peer Connection Initializer\nconst peer = new RTCPeerConnection({\n  iceServers: [{ urls: \'stun:stun.l.google.com:19302\' }]\n});', 'typescript', 'peer-config.ts', 0, 0, NOW() - INTERVAL 15 MINUTE);

-- 15. Calling & WebRTC Settings
INSERT INTO `calls` (`id`, `caller_id`, `receiver_id`, `call_type`, `status`, `started_at`, `ended_at`, `duration_seconds`, `created_at`) VALUES
(1, 2, 1, 'VIDEO', 'ENDED', NOW() - INTERVAL 120 MINUTE, NOW() - INTERVAL 115 MINUTE, 300, NOW() - INTERVAL 120 MINUTE);

INSERT INTO `webrtc_settings` (`id`, `stun_server`, `turn_server`, `turn_username`, `turn_credential`) VALUES
(1, 'stun:stun.l.google.com:19302', '', '', '');

-- 16. Multi-Language Video Audio Tracks
INSERT INTO `video_audio_tracks` (`id`, `video_id`, `language_name`, `language_code`, `title`, `storage_key`, `audio_url`, `is_default`, `is_active`, `created_by`, `created_at`) VALUES
(1, 2, 'Bengali', 'bn', 'বাংলা ধারাভাষ্য (Cloudflare R2 গাইড)', 'audio_tracks/video_2_bn.mp3', 'https://actions.google.com/sounds/v1/ambiences/daytime_forest_bonfire.ogg', 0, 1, 1, NOW() - INTERVAL 1 DAY),
(2, 2, 'English', 'en', 'English Narration & Deep-Dive', 'audio_tracks/video_2_en.mp3', 'https://actions.google.com/sounds/v1/science_fiction/alien_hum.ogg', 1, 1, 1, NOW() - INTERVAL 1 DAY),
(3, 2, 'Hindi', 'hi', 'हिन्दी ऑडियो ट्रैक', 'audio_tracks/video_2_hi.mp3', 'https://actions.google.com/sounds/v1/ambiences/outdoor_festival.ogg', 0, 1, 1, NOW() - INTERVAL 1 DAY);

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

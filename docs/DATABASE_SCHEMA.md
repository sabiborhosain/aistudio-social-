# Database Schema Documentation

This document describes the complete relational database architecture for the **DevSphere Social Platform**. The schema is engineered for high performance, data integrity, and direct compatibility with MySQL 8.0+, MariaDB 10.4+, and **phpMyAdmin**.

The complete, importable SQL file is located at:  
`/database/database.sql`

---

## 1. Entity-Relationship Overview

```
 [users] 1 ──── 1 [user_profiles]
   │  │
   │  ├── 1 ──── N [posts] 1 ──── N [post_blocks]
   │  │              │     1 ──── N [post_media]
   │  │              │     1 ──── N [post_reactions]
   │  │              └──── 1 ──── N [comments] 1 ──── N [comment_reactions]
   │  │
   │  ├── 1 ──── N [stories] 1 ──── N [story_views]
   │  ├── 1 ──── N [videos] (including short reels)
   │  ├── 1 ──── N [pages] 1 ──── N [page_members]
   │  │              │     1 ──── N [page_followers]
   │  │
   │  ├── 1 ──── N [followers]
   │  ├── 1 ──── N [friends] & [friend_requests]
   │  ├── 1 ──── N [notifications]
   │  ├── 1 ──── N [reports] (as reporter)
   │  └── 1 ──── N [admin_logs] (as admin)
```

---

## 2. Table Specifications

### 2.1 `users`
Core identity table storing credentials, authorization level, and lifecycle status.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INT UNSIGNED` | `AUTO_INCREMENT, PRIMARY KEY` | Unique internal user ID |
| `email` | `VARCHAR(191)` | `NOT NULL, UNIQUE` | User login email address |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | Bcrypt password hash (10 rounds) |
| `role` | `ENUM` | `DEFAULT 'USER'` | `USER`, `ADMIN`, `SUPER_ADMIN` |
| `status` | `ENUM` | `DEFAULT 'ACTIVE'` | `ACTIVE`, `SUSPENDED`, `BANNED`, `DEACTIVATED` |
| `is_email_verified` | `TINYINT(1)` | `DEFAULT 0` | 1 if email OTP has been verified |
| `must_change_password` | `TINYINT(1)` | `DEFAULT 0` | Flag to trigger mandatory password reset warning |
| `last_login_at` | `DATETIME` | `NULL` | Timestamp of most recent authentication |
| `created_at` | `DATETIME` | `DEFAULT CURRENT_TIMESTAMP` | Account creation timestamp |
| `updated_at` | `DATETIME` | `ON UPDATE CURRENT_TIMESTAMP` | Last profile/status change |

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE KEY idx_users_email (email)`
- `KEY idx_users_role_status (role, status)`
- `KEY idx_users_created_at (created_at)`

---

### 2.2 `user_profiles`
Public demographic and professional metadata attached to each user.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INT UNSIGNED` | `AUTO_INCREMENT, PRIMARY KEY` | Profile ID |
| `user_id` | `INT UNSIGNED` | `NOT NULL, UNIQUE, FK` | Links to `users(id)` ON DELETE CASCADE |
| `username` | `VARCHAR(60)` | `NOT NULL, UNIQUE` | Clean handle (e.g. `@alex_dev`) |
| `full_name` | `VARCHAR(120)` | `NOT NULL` | Display name |
| `avatar_url` | `VARCHAR(500)` | `NULL` | Public CDN URL or R2 key |
| `cover_url` | `VARCHAR(500)` | `NULL` | Header cover image URL |
| `bio` | `TEXT` | `NULL` | User personal / developer bio |
| `location` | `VARCHAR(150)` | `NULL` | Physical city/country |
| `website` | `VARCHAR(255)` | `NULL` | Personal portfolio or blog |
| `work` | `VARCHAR(150)` | `NULL` | Job title or current company |
| `education` | `VARCHAR(150)` | `NULL` | College or university |
| `gender` | `VARCHAR(30)` | `NULL` | Gender identity |
| `followers_count` | `INT UNSIGNED` | `DEFAULT 0` | Cached follower counter |
| `following_count` | `INT UNSIGNED` | `DEFAULT 0` | Cached following counter |
| `friends_count` | `INT UNSIGNED` | `DEFAULT 0` | Cached friend counter |
| `posts_count` | `INT UNSIGNED` | `DEFAULT 0` | Cached post counter |

---

### 2.3 `posts`
Central publication entity supporting standard social updates and multi-block coding posts.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INT UNSIGNED` | `AUTO_INCREMENT, PRIMARY KEY` | Unique post identifier |
| `user_id` | `INT UNSIGNED` | `NOT NULL, FK` | Author reference |
| `page_id` | `INT UNSIGNED` | `NULL, FK` | Optional page association (for page posts) |
| `post_type` | `ENUM` | `DEFAULT 'NORMAL'` | `NORMAL`, `CODE`, `MEDIA`, `MIXED` |
| `privacy` | `ENUM` | `DEFAULT 'PUBLIC'` | `PUBLIC`, `FRIENDS`, `ONLY_ME` |
| `content` | `LONGTEXT` | `NULL` | Primary text content or summary |
| `location_name` | `VARCHAR(150)` | `NULL` | Geotagged place check-in |
| `feeling_emoji` | `VARCHAR(20)` | `NULL` | Emoji icon (e.g. 🚀, 💡, 💻) |
| `feeling_text` | `VARCHAR(60)` | `NULL` | Mood descriptor (e.g. "excited", "coding") |
| `reactions_count` | `INT UNSIGNED` | `DEFAULT 0` | Denormalized reaction counter |
| `comments_count` | `INT UNSIGNED` | `DEFAULT 0` | Denormalized comment counter |
| `shares_count` | `INT UNSIGNED` | `DEFAULT 0` | Denormalized share counter |
| `views_count` | `INT UNSIGNED` | `DEFAULT 0` | Impression count |
| `is_pinned` | `TINYINT(1)` | `DEFAULT 0` | 1 if pinned to profile |
| `is_deleted` | `TINYINT(1)` | `DEFAULT 0` | Soft-delete flag |

---

### 2.4 `post_blocks` (Special Coding Post Architecture)
Enables mixed ordered content blocks within a single post in arbitrary order.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INT UNSIGNED` | `AUTO_INCREMENT, PRIMARY KEY` | Unique block ID |
| `post_id` | `INT UNSIGNED` | `NOT NULL, FK` | References `posts(id)` ON DELETE CASCADE |
| `block_order` | `INT UNSIGNED` | `NOT NULL DEFAULT 0` | Ascending sort sequence (0, 1, 2...) |
| `block_type` | `ENUM` | `NOT NULL` | `TEXT`, `IMAGE`, `VIDEO`, `CODE`, `LINK` |
| `content` | `LONGTEXT` | `NOT NULL` | Markdown/text, media URL, or raw code string |
| `meta_json` | `JSON` | `NULL` | Language (`typescript`, `python`), title, metadata |

---

### 2.5 `comments` & `comment_reactions`
Hierarchical comment threads with code snippet and image attachments.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INT UNSIGNED` | `AUTO_INCREMENT, PRIMARY KEY` | Comment ID |
| `post_id` | `INT UNSIGNED` | `NOT NULL, FK` | Associated post |
| `user_id` | `INT UNSIGNED` | `NOT NULL, FK` | Comment author |
| `parent_id` | `INT UNSIGNED` | `NULL, FK` | Self-referencing FK for nested replies |
| `content` | `TEXT` | `NOT NULL` | Comment body text |
| `code_snippet` | `LONGTEXT` | `NULL` | Optional attached syntax-highlighted code |
| `code_language` | `VARCHAR(50)` | `NULL` | Syntax highlighter language identifier |
| `image_url` | `VARCHAR(500)` | `NULL` | Uploaded image attachment |
| `likes_count` | `INT UNSIGNED` | `DEFAULT 0` | Upvote/reaction count |
| `is_deleted` | `TINYINT(1)` | `DEFAULT 0` | Soft deletion status |

---

### 2.6 `stories` & `story_views`
24-hour ephemeral updates.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INT UNSIGNED` | `AUTO_INCREMENT, PRIMARY KEY` | Story ID |
| `user_id` | `INT UNSIGNED` | `NOT NULL, FK` | Author |
| `media_url` | `VARCHAR(500)` | `NULL` | Image or video asset URL |
| `media_type` | `ENUM` | `DEFAULT 'IMAGE'` | `IMAGE`, `VIDEO`, `TEXT` |
| `text_content` | `TEXT` | `NULL` | Text overlay or text-story body |
| `background_color`| `VARCHAR(30)` | `DEFAULT '#1e293b'` | Canvas backdrop hex code |
| `expires_at` | `DATETIME` | `NOT NULL` | Automated cutoff (typically `NOW() + INTERVAL 24 HOUR`) |

---

### 2.7 `videos`
Dedicated catalog for both regular full-length videos and vertical short-form reels.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INT UNSIGNED` | `AUTO_INCREMENT, PRIMARY KEY` | Video ID |
| `user_id` | `INT UNSIGNED` | `NOT NULL, FK` | Creator |
| `title` | `VARCHAR(200)` | `NOT NULL` | Title header |
| `description` | `TEXT` | `NULL` | Markdown or text notes |
| `video_url` | `VARCHAR(500)` | `NOT NULL` | Cloudflare R2 or direct video stream URL |
| `thumbnail_url` | `VARCHAR(500)` | `NULL` | Video preview poster |
| `duration` | `INT UNSIGNED` | `DEFAULT 0` | Duration in seconds |
| `is_short` | `TINYINT(1)` | `DEFAULT 0` | `1` indicates vertical Short Video / Reel |

---

### 2.8 `pages`, `page_members`, `page_followers`
Multi-role brand, community, and developer publication channels.

---

### 2.9 `reports` & `admin_logs`
Full auditing and community safety system.
Tracks `reported_type` (`USER`, `POST`, `COMMENT`, `VIDEO`, `SHORT_VIDEO`, `PAGE`), `reason` (`SPAM`, `HARASSMENT`, `FALSE_INFO`, `VIOLENCE`, `COPYRIGHT`, `INAPPROPRIATE`, `OTHER`), and moderator resolution notes.

---

### 2.10 `r2_settings`, `smtp_settings` & `system_settings`

#### `r2_settings` Table
Dynamic runtime configuration storage for Cloudflare R2 object storage.
- `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `account_id` VARCHAR(150) NULL
- `access_key_id` VARCHAR(150) NULL
- `secret_access_key` VARCHAR(500) NULL (Encrypted at rest using AES-256-GCM with salt derived from JWT secret)
- `bucket_name` VARCHAR(150) NULL DEFAULT 'devsphere-media'
- `endpoint` VARCHAR(255) NULL
- `public_url` VARCHAR(255) NULL (Custom domain / CDN endpoint)
- `is_active` TINYINT(1) DEFAULT 0
- `updated_at` DATETIME

#### `smtp_settings` Table
Dynamic runtime configuration storage for outbound transactional mail delivery.
- `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `host` VARCHAR(150) NULL
- `port` INT UNSIGNED DEFAULT 587
- `username` VARCHAR(150) NULL
- `password` VARCHAR(500) NULL (Encrypted at rest using AES-256-GCM with salt derived from JWT secret)
- `encryption` ENUM('tls', 'ssl', 'none') DEFAULT 'tls'
- `from_email` VARCHAR(191) DEFAULT 'no-reply@devsphere.com'
- `from_name` VARCHAR(100) DEFAULT 'DevSphere Social'
- `is_active` TINYINT(1) DEFAULT 0
- `updated_at` DATETIME

#### `system_settings` Table
Key-value store for global platform configuration.
- `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `setting_key` VARCHAR(100) UNIQUE NOT NULL
- `setting_value` LONGTEXT NULL
- `updated_at` DATETIME

> **Security & Configuration Boundary Note**:
> - `JWT_SECRET` and `JWT_EXPIRES_IN` stay strictly in backend environment variables.
> - Database credentials (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) stay strictly in backend environment variables.
> - Cloudflare R2 and SMTP settings are managed from Admin Panel with sensitive values encrypted in MySQL.
> - All tables are 100% compliant with phpMyAdmin import (`database/database.sql`).

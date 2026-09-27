# DevSphere Platform - Changelog

## [1.3.0] - 2026-09-26

### Configuration Architecture Refactor: Cloudflare R2 & SMTP Moved to Admin Panel
- **Environment Isolation**: Only JWT credentials (`JWT_SECRET`, `JWT_EXPIRES_IN`) and MySQL database credentials (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) remain required backend environment variables.
- **Admin Panel Configuration**: R2 and SMTP settings moved entirely to Admin Panel (`Settings -> Storage / Cloudflare R2` & `Settings -> Email / SMTP`).
- **Encryption at Rest**: Sensitive R2 Secret Access Key and SMTP Password are encrypted at rest with AES-256-GCM.
- **Zero Exposure**: Secrets are masked in API responses and password fields, never exposed to users.
- **Connection Status**: Indicators for Configured, Not Configured, Connection Successful, and Connection Failed.
- **Admin Warnings**: Clear notification banners when R2 or SMTP is unconfigured.
- **Startup Protection**: Missing R2 or SMTP settings never block website startup or preview mode.

## [1.1.1] - 2026-09-22

### Fixed
- **Resolved `posts.map is not a function` Runtime TypeError**:
  - The `/api/v1/posts` endpoint returns paginated envelopes of shape `{ success: true, data: { posts: [...], pagination: {...} } }`.
  - Updated `src/App.tsx` `fetchFeed` to inspect both paginated object shapes (`res.data.posts`) and direct array responses (`res.data`), ensuring `posts` state is always an array.
  - Added safe `Array.isArray(...)` guards in `src/App.tsx`, `ProfileView.tsx`, `PostCard.tsx`, `CommentSection.tsx`, `StoriesBar.tsx`, `ReelsView.tsx`, and `VideosView.tsx` to prevent any invocation of `.map` on non-array state.
  - Added dedicated `/api/v1/posts/saved` bookmark listing endpoint and registered it before dynamic `:id` routes.
  - Added `/api/v1/videos/catalog` route alias for consistent long-format video catalog retrieval.

## [1.1.0] - 2026-09-22

### Fixed
- **Zero-Config Development Preview Startup**:
  - Made MySQL database, Cloudflare R2 object storage, and SMTP email services completely optional during development and preview mode.
  - Added fast non-blocking connection checks with automatic, seamless fallback to the local persistent JSON/memory relational store (`data/database.json`) when MySQL credentials are missing or when the database host is unreachable.
  - Implemented local development storage for media uploads when Cloudflare R2 credentials are not configured, saving assets into `/uploads/` and serving them statically.
  - Added graceful email dispatch simulation in development mode when SMTP credentials are not configured, printing clear debug notices without crashing or throwing errors.
  - Configured safe development fallback for `JWT_SECRET` (`devsphere_jwt_dev_preview_secret_2026_secure_fallback`) via a centralized configuration module (`backend/config/constants.ts`).
  - Ensured production mode continues to utilize production MySQL 8.0+, Cloudflare R2, and SMTP server settings from environment variables with no architectural changes.
  - Preserved `database/database.sql` for phpMyAdmin database provisioning.

## [1.0.0] - 2026-09-22

### Added
- Complete full-stack social media platform with React, TypeScript, Vite, Tailwind CSS, and Express REST API (`/api/v1/...`).
- Interactive developer feed supporting multi-block posts (markdown text blocks + syntax-highlighted code blocks with line numbers and one-click copy).
- Facebook-style 6 reactions (`LIKE`, `LOVE`, `HAHA`, `WOW`, `SAD`, `ANGRY`), threaded code comments, bookmarks, and post privacy controls.
- Ephemeral Stories (24h lifespan) with progress-bar playback viewer and story creation modal.
- Vertical Reels video feed (9:16) with play/pause, like, comment, and volume controls.
- Long-format video catalog with search and category tags.
- Developer community Pages with follower tracking and page creation.
- Engineer profiles with custom avatar, cover banner, bio, career dossier, and post history.
- Super Administrator dashboard (`sabiborhosain@gmail.com`) with system KPIs, user status management (active/suspend/ban/reset), content moderation queue, Cloudflare R2 connection test diagnostics, SMTP email testing, and audit logs.
- phpMyAdmin-compatible MySQL 8.0+ schema (`database/database.sql`) with 26 tables, foreign keys, indexes, and initial seed data.

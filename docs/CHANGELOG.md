# Changelog

All notable changes to the **DevSphere Social Platform** will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.0] - 2026-09-26

### Configuration Architecture Refactor: Cloudflare R2 & SMTP Moved to Admin Panel

#### Highlights & Architectural Changes
- **Environment Variable Isolation**:
  - Only **JWT credentials** (`JWT_SECRET`, `JWT_EXPIRES_IN`) and **MySQL database credentials** (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) remain required backend environment variables.
  - Removed all `R2_*` and `SMTP_*` requirements from environment variables and startup prompts.
  - Startup without R2 or SMTP credentials works immediately without blocking Preview or throwing errors.
- **Admin Panel Configuration for Storage & Mail**:
  - Cloudflare R2 settings moved entirely to **Admin Panel -> Settings -> Storage / Cloudflare R2** (Account ID, Access Key ID, Secret Access Key, Bucket Name, Endpoint, Public URL). Includes **Test R2 Connection** and **Save Settings**.
  - SMTP mail server settings moved entirely to **Admin Panel -> Settings -> Email / SMTP** (Host, Port, Username, Password, Encryption, From Email, From Name). Includes **Send Test Email** and **Save Settings**.
  - Restructured Admin Panel settings into an intuitive 4-part architecture:
    - `Settings -> General`
    - `Settings -> Storage / Cloudflare R2`
    - `Settings -> Email / SMTP`
    - `Settings -> Security`
- **Security & Encryption at Rest**:
  - Implemented `backend/services/crypto.ts` providing AES-256-GCM authenticated encryption for sensitive credentials.
  - Cloudflare R2 `secret_access_key` and SMTP `password` are encrypted before storing in the database.
  - Secrets are masked (`••••••••••••••••xxxx`) in API responses and password fields, ensuring zero exposure to users or unauthorized frontend clients.
  - Restricted settings management to `ADMIN` and `SUPER_ADMIN` roles.
- **Connection Status & Diagnostic Feedback**:
  - Real-time connection status badges: `Configured`, `Not Configured`, `Connection Successful`, and `Connection Failed`.
  - Prominent warning banners in the Admin Panel whenever Cloudflare R2 or SMTP is unconfigured, with 1-click navigation to configure them.
- **Database Schema & Persistence**:
  - Updated `r2_settings`, `smtp_settings`, and `system_settings` in `database/database.sql` to support encrypted credentials with extended field lengths.
  - Added two-way MySQL synchronization when MySQL is connected, while preserving zero-dependency local persistent file storage in Preview.

---

## [1.0.0] - 2026-09-22

### Initial Release - Full-Stack Production Baseline

#### Features Added
- **Authentication & Security Engine**:
  - Full registration, login, logout, token refresh, and active session tracking.
  - Email verification and forgot-password OTP pipeline with automated expiration.
  - Password hashing via bcrypt (10 rounds).
  - Role-Based Access Control (RBAC): `USER`, `ADMIN`, `SUPER_ADMIN`.
  - Default initial Super Administrator: `sabiborhosain@gmail.com` with mandatory first-login password rotation warning.
- **Social Media & Feed Engine**:
  - Facebook-style interactive feed with cursor-based pagination.
  - Multi-reaction engine (`LIKE`, `LOVE`, `HAHA`, `WOW`, `SAD`, `ANGRY`, `CODE`).
  - Saved posts, share counter, and privacy controls (`PUBLIC`, `FRIENDS`, `ONLY_ME`).
  - Check-in location tagging and mood/feeling indicators with emoji support.
- **Special Coding Post System**:
  - Block-based post composer supporting arbitrary mixed blocks: `TEXT`, `IMAGE`, `VIDEO`, `CODE`, `LINK`.
  - Multi-language syntax-highlighted code blocks (JavaScript, TypeScript, Python, PHP, Java, Kotlin, C++, C#, Go, Rust, SQL, Bash, JSON, JSX, TSX).
  - One-click Copy Code with visual feedback.
  - Responsive mobile code view with horizontal scrolling and line formatting.
- **Rich Comment System**:
  - Nested comments and direct replies.
  - Support for code snippets inside comments with language tagging and one-click copy.
  - Comment reaction and report triggers.
- **24-Hour Story System**:
  - Ephemeral media (image, video, text background) with 24-hour expiration.
  - Story viewer with progress bar, view tracking, and quick reactions.
- **Reels & Video Center**:
  - Vertical short-video feed with touch/wheel navigation, like, comment, and share.
  - Long-form video catalog with video player, thumbnail generation, view counter, and metadata.
- **Pages System**:
  - User-creatable organization, technology, and creator pages.
  - Page profiles, covers, category tagging, follower management, and page post feeds.
- **Reporting & Moderation Pipeline**:
  - Community reporting for users, posts, comments, videos, and pages.
  - Categorized reasons (`SPAM`, `HARASSMENT`, `FALSE_INFO`, `VIOLENCE`, `COPYRIGHT`, `INAPPROPRIATE`, `OTHER`).
  - Admin audit trails and action resolution (dismiss, delete, suspend user).
- **Admin Control Center**:
  - Comprehensive KPI dashboard (active users, total posts, reels, reports, system health).
  - User management: suspend, unsuspend, ban, unban, deactivate, trigger reset, force logout.
  - Content moderation interface with bulk search and delete.
  - Cloudflare R2 storage settings with interactive "Test Connection".
  - SMTP email settings with "Send Test Email".
  - Full administrator action audit logs.
- **Cloudflare R2 Media Integration**:
  - S3-compatible media upload pipeline with automatic fallback to local `/uploads/` directory when unconfigured.
- **Database & Architecture**:
  - Pure MySQL 8+ / MariaDB 10.4+ schema with utf8mb4 collation, foreign key constraints, and performance indexes.
  - phpMyAdmin compatible direct SQL export: `/database/database.sql`.
  - Dual-mode database layer supporting direct MySQL connection pools and resilient zero-config local storage for container sandbox development.

#### Database Changes
- Initial schema created with 25+ relational tables in `/database/database.sql`.
- Pre-seeded super admin user, verified tech community pages, sample block-based posts, stories, and reels.

#### API Changes
- Established versioned REST API under `/api/v1/` for auth, users, posts, comments, stories, videos, pages, notifications, reports, and admin management.

#### Documentation Created
- `README.md`
- `docs/PROJECT_OVERVIEW.md`
- `docs/NATIVE_APP_API_GUIDE.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/DEPLOYMENT_GUIDE.md`
- `docs/SECURITY_GUIDE.md`
- `docs/AI_DEVELOPER_INSTRUCTIONS.md`
- `docs/CHANGELOG.md`

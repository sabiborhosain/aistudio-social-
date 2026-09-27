# Project Overview: DevSphere Social Platform

**DevSphere** is a complete, production-ready, full-stack social media platform engineered specifically for software developers, engineers, and tech creators. It pairs familiar social interaction dynamics (feeds, stories, reels, reactions, comments, pages, and follows) with an advanced **Special Coding Post System** that supports arbitrary mixed blocks of text, multimedia, and syntax-highlighted code with one-click copying.

---

## 1. Complete Technology Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **Bundler & Dev Server**: Vite 8
- **Styling**: Tailwind CSS (mobile-first responsive design, modern dark/light system)
- **Icons**: Lucide React
- **Animations**: Motion (`motion/react`)
- **State Management**: Reactive React Context (`AuthContext`, `ToastContext`, `ModalContext`)

### Backend
- **Runtime**: Node.js 22 LTS
- **Framework**: Express.js 4.21
- **Language**: TypeScript (compiled via esbuild into single `dist/server.cjs` bundle)
- **Authentication**: JWT (JSON Web Tokens) with cryptographically secure salts & bcrypt password hashing (10 rounds)
- **File Uploads**: Multer middleware with mime-type checking and file-size constraints
- **Storage Driver**: AWS SDK v3 S3 Client (natively mapped to Cloudflare R2 object storage)

### Database & Storage
- **Primary Database**: MySQL 8.0+ / MariaDB 10.4+ (Database credentials configured strictly via environment variables: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`)
- **Database Administration**: Direct compatibility with phpMyAdmin (via `/database/database.sql`)
- **Media Storage**: Cloudflare R2 configured and managed directly in **Admin Panel -> Settings -> Storage / Cloudflare R2** with zero-egress fees for high-res images and video feeds. Secret access keys are encrypted at rest with AES-256-GCM. Unconfigured preview mode falls back smoothly to local resilient disk storage (`/uploads/`).
- **Email / SMTP**: Configured directly in **Admin Panel -> Settings -> Email / SMTP**. Passwords encrypted at rest with AES-256-GCM.

---

## 2. Configuration Boundary & Security Model

DevSphere strictly partitions application configuration between environment variables and Admin Panel database settings:

| Configuration Area | Location | Reason & Policy |
| :--- | :--- | :--- |
| **JWT Secrets** (`JWT_SECRET`, `JWT_EXPIRES_IN`) | **Environment Variables** | Critical security token signing key. Never exposed to frontend or Admin Panel. |
| **MySQL Credentials** (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) | **Environment Variables** | Infrastructure database connection pool. Never stored or edited in Admin Panel. |
| **Cloudflare R2 Storage** | **Admin Panel** (`Settings -> Storage`) | Configurable by `ADMIN` / `SUPER_ADMIN`. Secret access keys encrypted at rest with AES-256-GCM. Not required at startup. |
| **Email / SMTP Server** | **Admin Panel** (`Settings -> Email`) | Configurable by `ADMIN` / `SUPER_ADMIN`. Password encrypted at rest with AES-256-GCM. Not required at startup. |

---

## 3. Overall Architecture

```
                    ┌────────────────────────────────────────────────────────┐
                    │                    Client Layer                        │
                    │   React 19 Web SPA  /  Native Mobile Apps (iOS/Android) │
                    └───────────────────────────┬────────────────────────────┘
                                                │ HTTPS / REST JSON
                                                ▼
                    ┌────────────────────────────────────────────────────────┐
                    │               Express.js REST API Layer                │
                    │               (/api/v1/auth, /api/v1/posts, ...)       │
                    └───────┬───────────────────┬────────────────────┬───────┘
                            │                   │                    │
                            ▼                   ▼                    ▼
             ┌──────────────────────┐ ┌───────────────────┐ ┌────────────────┐
             │ MySQL Database       │ │ Cloudflare R2     │ │ SMTP Mail      │
             │ (Users, Posts, ...)  │ │ Object Storage    │ │ Server         │
             │ via mysql2/fallback  │ │ (Media/Videos)    │ │ (OTP/Notifs)   │
             └──────────────────────┘ └───────────────────┘ └────────────────┘
```

The system is strictly decoupled. The React frontend interacts with the backend solely through standardized RESTful endpoints under `/api/v1/`. This ensures that native iOS and Android applications can be built against the exact same API contract without any changes to the backend.

---

## 3. Directory & Folder Structure

```
/
├── database/
│   └── database.sql               # Production MySQL dump compatible with phpMyAdmin
├── docs/
│   ├── AI_DEVELOPER_INSTRUCTIONS.md # Operating rules for AI/Developers
│   ├── CHANGELOG.md               # Version history and upgrade tracking
│   ├── DATABASE_SCHEMA.md         # Table-by-table schema documentation
│   ├── DEPLOYMENT_GUIDE.md        # Step-by-step VPS / CyberPanel deployment
│   ├── NATIVE_APP_API_GUIDE.md    # Complete mobile app REST API reference
│   ├── PROJECT_OVERVIEW.md        # Architecture and system documentation
│   └── SECURITY_GUIDE.md          # Security standards, RBAC, and rate limits
├── backend/
│   ├── config/                    # Environment variables & constants
│   ├── controllers/               # Request handlers (auth, post, story, video, etc.)
│   ├── db/                        # MySQL pool & resilient storage engine
│   ├── middleware/                # JWT auth, RBAC authorization, multer uploads
│   ├── routes/                    # Versioned Express routes (/api/v1/...)
│   └── services/                  # Business logic (email, R2 storage, token manager)
├── src/
│   ├── components/                # Modular UI components
│   │   ├── admin/                 # Admin panel, user management, R2/SMTP settings
│   │   ├── auth/                  # Login, Register, Forgot Password, OTP dialogs
│   │   ├── composer/              # Rich block-based post & code composer
│   │   ├── feed/                  # Social feed, post card, code card, reactions
│   │   ├── layout/                # Navbar, bottom mobile bar, sidebar widgets
│   │   ├── pages/                 # Tech & community page views & managers
│   │   ├── profile/               # User profiles, covers, avatars, tabbed media
│   │   ├── reels/                 # Short video vertical swipe viewer
│   │   ├── stories/               # 24-hour story carousel and full-screen viewer
│   │   └── videos/                # Long-form video catalog & media player
│   ├── context/                   # Global auth state & notifications
│   ├── lib/                       # API clients, code highlighters, helpers
│   ├── types/                     # Shared TypeScript interfaces
│   ├── App.tsx                    # Top-level view router
│   ├── index.css                  # Tailwind CSS imports & custom scrollbars
│   └── main.tsx                   # React root entrypoint
├── server.ts                      # Express API server & Vite dev/prod middleware
├── package.json                   # Dependencies, scripts, and build tasks
├── vite.config.ts                 # Vite bundler configuration
└── .env.example                   # Environment configuration template
```

---

## 4. Key Subsystems Explained

### 4.1 Authentication & Role-Based Access Control (RBAC)
- **Roles**: `USER`, `ADMIN`, `SUPER_ADMIN`.
- **Default Super Admin**: Pre-seeded with email `sabiborhosain@gmail.com` and password `100200300` (stored as a bcrypt hash). On first login, a warning reminds the admin to update this password.
- **Passwords**: Never stored as plain text. Salted and hashed with bcrypt (10 rounds).
- **Session Security**: Stateless JWTs signed with `JWT_SECRET`. Each login creates a trackable record in `sessions` and logs IP/user-agent in `login_logs`.
- **Password Reset via OTP**: 6-digit numeric OTP sent via SMTP email, expiring in 15 minutes, with attempt counting to prevent brute forcing.

### 4.2 Special Coding Post & Block Editor System
- Posts are not restricted to plain text. Authors can mix and match arbitrary ordered content blocks:
  - `TEXT`: Markdown or standard text commentary.
  - `IMAGE`: Single or grid-layout photographs.
  - `VIDEO`: Embedded MP4/WebM video players.
  - `CODE`: Multi-language code snippets with syntax highlighting, line numbers, and a 1-click **Copy Code** button.
  - `LINK`: Rich visual preview cards for external technical articles or repositories.
- Code blocks are stored strictly as text content—never executed on the server.

### 4.3 Rich Comment System
Comments support nested replies, image attachments, and integrated syntax-highlighted code snippets with copy buttons.

### 4.4 24-Hour Story System
Stories support image, video, and styled text slides with customizable background colors. Expired stories are automatically filtered out from active feeds.

### 4.5 Short Videos (Reels) & Video Section
- **Reels**: Vertical 9:16 aspect ratio video feed with touch and wheel swipe navigation, like/comment overlays, and creator follow shortcuts.
- **Videos**: Dedicated 16:9 catalog for technical webinars, tutorials, and long-form tech presentations.

### 4.6 User Pages System
Users can launch dedicated Pages (Business, Creator, Technology, Community). Each page has an avatar, cover banner, verified badge status, post feed, and member roles (`OWNER`, `ADMIN`, `EDITOR`, `MODERATOR`).

### 4.7 Cloudflare R2 Media Integration
- Administrators configure Account ID, Access Key ID, Secret Access Key, Bucket Name, and Public CDN URL directly in **Admin Settings -> Cloudflare R2**.
- A built-in "Test Connection" button validates credentials via the AWS S3 client without uploading test clutter.
- If R2 is not configured, the platform automatically saves uploads to `/uploads/` on local disk, ensuring zero friction in local development.

### 4.8 Admin Control Center
Full administrative suite:
- **KPI Dashboard**: Real-time counts of users, posts, comments, stories, videos, and pending reports.
- **User Management**: View, search, suspend, ban, deactivate, delete users, force logout, and trigger password reset.
- **Content Moderation**: Review reported posts, comments, videos, and pages; dismiss reports or remove offending content with moderator notes.
- **System Settings**: Live configuration of SMTP mailer and Cloudflare R2 storage.

---

## 5. How Another Developer Should Continue Development

1. **Keep APIs Versioned**: Always add new endpoints under `/api/v1/`.
2. **Synchronize Documentation**:
   - Update `docs/CHANGELOG.md` for any code change.
   - Update `docs/DATABASE_SCHEMA.md` and `database/database.sql` if tables change.
   - Update `docs/NATIVE_APP_API_GUIDE.md` if endpoints or payloads change.
3. **Database Rules**: Ensure all SQL statements remain standard MySQL 8+ syntax compatible with phpMyAdmin import.
4. **Follow Zero-Trust Security**: Never trust frontend parameters; validate all permissions, roles, and input types on the backend.

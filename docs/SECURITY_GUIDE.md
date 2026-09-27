# Security & Hardening Guide

Security in **DevSphere** follows defense-in-depth principles. The application never relies solely on client-side state or frontend assumptions. Every incoming request to protected API routes is strictly validated, authenticated, and authorized on the backend.

---

## 1. Password Security & Storage

- **Hashing Algorithm**: `bcryptjs` with salt work factor of 10 rounds.
- **Plaintext Passwords**: Never persisted to disk, never logged to stdout/files, and never serialized in API responses or JWT tokens.
- **Default Admin Account**:
  - Email: `sabiborhosain@gmail.com`
  - Initial password hash precomputed in `/database/database.sql`.
  - The database records `must_change_password = 1`. The web UI and mobile API prompt a mandatory password change warning on first authentication.

---

## 2. Authentication & Session Management

- **Stateless Tokens**: JWTs signed with HMAC-SHA256 (`JWT_SECRET`).
- **Token Expiry**: Default duration is 7 days.
- **Active Session Audit**: Each successful authentication logs IP address, user-agent, and device type into the `sessions` table.
- **Revocation**: Calling `/api/v1/auth/logout` flags the session record as `is_active = 0`, allowing instant revocation across all client instances.

---

## 3. SQL Injection Defense

- **Parameterized Queries**: All database queries executed against MySQL use prepared statements via `mysql2/promise` with placeholder parameters (`?`).
- **ORM / Query Builder**: Raw string concatenation into SQL clauses is strictly forbidden across all services and controllers.

---

## 4. Role-Based Access Control (RBAC)

DevSphere implements 3 authorization tiers:
1. `USER`: Normal social access (create posts, reels, stories, pages, comments, reactions, follow, friend requests).
2. `ADMIN`: Content moderation (review and dismiss reports, hide/delete violating posts/comments/videos/pages).
3. `SUPER_ADMIN`: Full administrative control, user suspension/bans, SMTP configuration, Cloudflare R2 credential management, and viewing sensitive audit logs.

Backend middleware (`requireAuth`, `requireAdmin`, `requireSuperAdmin`) enforces role checks at the route definition layer.

---

## 5. OTP Generation & Rate Limiting

- **OTP Format**: 6-digit cryptographically random numeric string (`crypto.randomInt(100000, 999999)`).
- **Expiration Window**: 15 minutes from generation.
- **Attempt Tracking**: The `password_reset_otps` table tracks `attempts`. After 5 consecutive invalid entries, the OTP is permanently invalidated.
- **Rate Limiting**: Multiple OTP requests for the same email address are throttled to a minimum interval of 60 seconds.

---

## 6. Media Upload & File Sanitization

- **Multer Constraints**:
  - Max image size: 15 MB
  - Max video size: 100 MB
- **MIME Whitelist**:
  - Images: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
  - Videos: `video/mp4`, `video/webm`, `video/quicktime`
- **File Renaming**: Uploaded files are stripped of client-supplied names and assigned cryptographically secure UUID v4 filenames with validated extensions (`uuidv4() + ext`).
- **Zero Local Execution**: Upload directories are configured to never execute `.php`, `.sh`, or binary files.

---

## 7. Cloudflare R2 & SMTP Zero-Exposure Policy & Encryption at Rest

- **Encryption at Rest (AES-256-GCM)**: Sensitive administrative credentials—including the Cloudflare R2 Secret Access Key and SMTP Password—are encrypted at rest in MySQL using authenticated AES-256-GCM before writing to `r2_settings` or `smtp_settings`.
- **Zero Frontend Exposure**: Secret access keys and SMTP passwords are never transmitted in plain text across frontend APIs. When requested by authorized administrators, secrets are masked (e.g. `••••••••••••••••xxxx`).
- **All R2 Operations Server-Side**: All S3 commands (PutObjectCommand, HeadBucketCommand) execute strictly within backend Node.js processes.
- **Environment Isolation**:
  - `JWT_SECRET` and `JWT_EXPIRES_IN` stay strictly in backend environment variables.
  - MySQL database credentials (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) stay strictly in backend environment variables and are never stored or displayed in the Admin Panel.
  - Cloudflare R2 and SMTP settings are dynamically configured in the Admin Panel without requiring server restarts or environment variable prompts.

---

## 8. Audit Logging

Every critical administrative action is recorded in `admin_logs`:
- Admin user ID
- Action taken (e.g. `USER_SUSPENDED`, `POST_REMOVED`, `R2_CONFIG_UPDATED`)
- Target entity type and ID
- IP address & timestamp
- Reason / moderation notes

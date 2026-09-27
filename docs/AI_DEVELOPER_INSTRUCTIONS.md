# AI & Developer Instructions

Welcome to the **DevSphere Social Platform** codebase. If you are a future AI agent, autonomous assistant, or human software engineer working on this repository, you **MUST** strictly adhere to the instructions and operational guidelines below.

---

## 1. Mandatory Pre-Flight Checklist

Before modifying, refactoring, or adding any files in this project:

1. **Read `PROJECT_OVERVIEW.md`**: Understand the system architecture, directory layouts, and data flows.
2. **Read `DATABASE_SCHEMA.md`**: Learn the entity-relationship model, constraints, table structures, and indexing patterns.
3. **Read `NATIVE_APP_API_GUIDE.md`**: Understand the public REST contract used by both the React web client and future native mobile apps (iOS & Android).
4. **Read `CHANGELOG.md`**: Review recent changes, version history, migrations, and active work.
5. **Understand Existing Architecture**: Do not make assumptions or inject foreign architectural patterns that conflict with the established Express + TypeScript + MySQL/R2 model.
6. **Do NOT Unnecessarily Rewrite Working Modules**: Preserve existing functional logic. Modify surgically, extend modularly, and keep existing APIs intact.
7. **Maintain Backward API Compatibility**: The `/api/v1/` endpoints serve existing web clients and mobile applications. Never alter endpoint signatures, rename payload properties, or strip required fields without deprecation cycles and documentation.
8. **Update Relevant Documentation**: Whenever you modify or add a feature, update the corresponding documentation files immediately.
9. **Update `CHANGELOG.md`**: Log every meaningful change with date, version, additions, fixes, and affected files.
10. **Synchronize Database Changes**: If you alter any table, column, index, or default value, you **MUST** update both `/database/database.sql` and `/docs/DATABASE_SCHEMA.md`. Ensure phpMyAdmin compatibility is preserved.
11. **Synchronize API Changes**: If you alter or add any REST route, request payload, or response structure, update `/docs/NATIVE_APP_API_GUIDE.md`.
12. **Zero Credentials in Source Code**: Never hardcode database passwords, Cloudflare R2 secret access keys, JWT secrets, or SMTP passwords in source code. Always use environment variables or encrypted database configuration settings.

---

## 2. Code Quality & Conventions

- **Language**: TypeScript throughout both frontend and backend.
- **Backend Architecture**: Layered architecture:
  - `controllers/`: HTTP route handlers, request validation, response formatting.
  - `services/`: Core business logic, transactional operations, third-party integrations (R2, SMTP).
  - `middleware/`: Authentication (`auth.ts`), role authorization (`rbac.ts`), file upload (`upload.ts`), rate limiting, error handling.
  - `db/`: Database connection pool, SQL query abstraction, resilient fallback adapter.
- **Frontend Architecture**:
  - `components/`: Modular, reusable components (Feed, Composer, BlockEditor, CodeBlock, Stories, Reels, Admin, Profile, Navigation).
  - `services/`: Typed API client wrappers calling `/api/v1/...`.
  - `context/`: Authentication context, toast notifications, modal managers.
  - `types/`: Universal TypeScript definitions.
- **Styling**: Tailwind CSS with mobile-first responsive breakpoints (`sm:`, `md:`, `lg:`, `xl:`).

---

## 3. Database Integrity & MySQL / phpMyAdmin Compatibility

- All tables use `utf8mb4` with `utf8mb4_unicode_ci` collation.
- All timestamps use UTC.
- Foreign keys must declare explicit `ON DELETE CASCADE` or `ON DELETE SET NULL` constraints.
- Sensitive credentials (e.g. passwords) must never be returned in queries or serialized in JSON responses. Use projection or explicit property deletion.

---

## 4. Media & Cloudflare R2 Integration

- Media uploads should never block server I/O permanently.
- The platform supports direct streaming or buffer processing to Cloudflare R2 buckets, with fallback to local secure storage (`/uploads/`) if R2 credentials are not yet configured in Admin Settings.
- Pre-signed URLs or CDN public URLs are used for high-bandwidth video and photo delivery.

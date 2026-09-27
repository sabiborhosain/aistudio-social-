# DevSphere — Full-Stack Social Media Platform for Developers

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange.svg)](https://www.mysql.com/)
[![Cloudflare R2](https://img.shields.io/badge/Cloudflare-R2_Storage-f38020.svg)](https://www.cloudflare.com/developer-platform/r2/)

**DevSphere** is a complete, production-ready, full-stack social media platform engineered specifically for software engineers, developers, and tech organizations. Built with an **API-first architecture**, it powers both modern web browsers and future native iOS and Android applications through a unified `/api/v1/` REST API.

---

## 🌟 Key Features

- **Block-Based Special Coding Post System**:
  - Mixed content blocks in any order: `TEXT`, `IMAGE`, `VIDEO`, `CODE`, and `LINK`.
  - Multi-language syntax highlighting with one-click **Copy Code** functionality.
  - Formatted line numbers and responsive mobile code viewer.
- **Interactive Social Experience**:
  - Facebook-style news feed with cursor pagination.
  - Multi-reactions (`LIKE`, `LOVE`, `HAHA`, `WOW`, `SAD`, `ANGRY`, `CODE`).
  - Hierarchical comments with support for code snippets and images.
  - 24-hour ephemeral Stories with view tracking.
  - Vertical Short Videos (Reels) with swipe navigation.
  - Long-form video catalog with video player and analytics.
  - User Pages (Technology, Creator, Business, Community).
- **Security & User Management**:
  - JWT stateless authentication with bcrypt password hashing (10 rounds).
  - Email verification and Forgot-Password OTP flow.
  - Active session tracking and device logging.
  - Granular privacy settings (`PUBLIC`, `FRIENDS`, `ONLY_ME`).
- **Media Engine**:
  - Direct integration with **Cloudflare R2** (S3-compatible, zero-egress fees).
  - Built-in "Test Connection" tool in Admin Panel.
  - Automatic zero-config local storage fallback (`/uploads/`) during development.
- **Admin Control Center**:
  - Comprehensive KPI analytics dashboard.
  - User management (suspend, ban, deactivate, force logout, trigger password reset).
  - Content moderation queue with report audit logs.
  - Live SMTP mailer and Cloudflare R2 credential management.
- **Full Database Schema for phpMyAdmin**:
  - Self-contained, production-tested `/database/database.sql` importable directly into MySQL 8+ / MariaDB via phpMyAdmin.

---

## 🔑 Default Administrator Credentials

Upon importing `/database/database.sql`, the system is pre-seeded with a Super Admin account:

- **Email**: `sabiborhosain@gmail.com`
- **Password**: `100200300`
- **Role**: `SUPER_ADMIN`

> ⚠️ **CRITICAL SECURITY WARNING**: The initial password `100200300` must be changed immediately upon your first login via **Profile Settings -> Password**.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS, Lucide Icons, Motion |
| **Backend** | Node.js 22 LTS, Express.js 4.21, TypeScript, Multer, JWT, Bcrypt |
| **Database** | MySQL 8.0+ / MariaDB 10.4+ (phpMyAdmin compatible) |
| **Storage** | Cloudflare R2 Object Storage (AWS S3 Client) |
| **Mail** | SMTP with TLS/SSL encryption |

---

## 🚀 Quick Start & Development

### 1. Requirements
- Node.js 20+ or 22+
- npm 10+
- MySQL 8.0+ (or use the built-in development fallback engine)

### 2. Installation
```bash
git clone <repository-url> devsphere
cd devsphere
npm install
```

### 3. Environment Setup
```bash
cp .env.example .env
```
Edit `.env` with your MySQL and port configuration.

### 4. Database Setup (MySQL / phpMyAdmin)
1. Open **phpMyAdmin**.
2. Create database `devsphere_db` with collation `utf8mb4_unicode_ci`.
3. Click **Import** and select `database/database.sql`.
4. Click **Go**.

### 5. Start Development Server
```bash
npm run dev
```
The server will boot on `http://localhost:3000`.

---

## 📦 Production Build

```bash
npm run build
npm start
```
This compiles the frontend into `dist/` and bundles `server.ts` into a self-contained CommonJS binary at `dist/server.cjs`.

---

## 📚 Complete Documentation Index

- [Project Overview & Architecture](docs/PROJECT_OVERVIEW.md)
- [Native Mobile App API Guide (iOS & Android)](docs/NATIVE_APP_API_GUIDE.md)
- [Database Schema & ERD Documentation](docs/DATABASE_SCHEMA.md)
- [Production Deployment Guide (VPS / CyberPanel)](docs/DEPLOYMENT_GUIDE.md)
- [Security & Hardening Standards](docs/SECURITY_GUIDE.md)
- [AI & Developer Instructions](docs/AI_DEVELOPER_INSTRUCTIONS.md)
- [Changelog](docs/CHANGELOG.md)

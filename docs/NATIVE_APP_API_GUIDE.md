# Native Mobile Application API Integration Guide

**Version**: `1.0.0`  
**Base URL**: `https://your-domain.com/api/v1`  
**Protocol**: HTTPS  
**Format**: `application/json` (or `multipart/form-data` for binary uploads)

This document is the authoritative REST API specification for engineering native **iOS (Swift/SwiftUI)** and **Android (Kotlin/Jetpack Compose)** mobile applications connected to the DevSphere platform.

---

## 1. Universal Standards & Headers

### Request Headers
```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <ACCESS_TOKEN>
X-Client-Platform: android | ios | web
X-App-Version: 1.0.0
```

### Standard Response Envelope
All API endpoints return a standardized JSON structure:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

### Standard Error Envelope
```json
{
  "success": false,
  "message": "Detailed error message describing what went wrong",
  "code": "VALIDATION_FAILED | UNAUTHORIZED | NOT_FOUND | FORBIDDEN | RATE_LIMITED",
  "errors": {
    "field": "Specific validation constraint failure"
  }
}
```

---

## 2. Authentication & Identity Endpoints

### 2.1 Register New Account
- **Endpoint**: `/api/v1/auth/register`
- **Method**: `POST`
- **Auth**: None
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "username": "janedev",
    "fullName": "Jane Developer"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "message": "Registration successful. Please verify your email.",
    "data": {
      "user": {
        "id": 4,
        "email": "user@example.com",
        "role": "USER",
        "status": "ACTIVE",
        "isEmailVerified": false
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```

### 2.2 Login with Email & Password
- **Endpoint**: `/api/v1/auth/login`
- **Method**: `POST`
- **Auth**: None
- **Body**:
  ```json
  {
    "email": "sabiborhosain@gmail.com",
    "password": "SuperSecurePassword!"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": 1,
        "email": "sabiborhosain@gmail.com",
        "role": "SUPER_ADMIN",
        "status": "ACTIVE",
        "mustChangePassword": false,
        "profile": {
          "username": "sabiborhosain",
          "fullName": "Sabibor Hosain",
          "avatarUrl": "https://..."
        }
      }
    }
  }
  ```

### 2.3 Send Email Verification OTP
- **Endpoint**: `/api/v1/auth/verify-email/request`
- **Method**: `POST`
- **Auth**: Bearer Token
- **Body**: `{}`
- **Response**: `200 OK` (`"OTP sent to registered email address"`)

### 2.4 Confirm Email Verification OTP
- **Endpoint**: `/api/v1/auth/verify-email/confirm`
- **Method**: `POST`
- **Auth**: Bearer Token
- **Body**:
  ```json
  {
    "otp": "492810"
  }
  ```
- **Response**: `200 OK`

### 2.5 Forgot Password - Request OTP
- **Endpoint**: `/api/v1/auth/forgot-password/request`
- **Method**: `POST`
- **Auth**: None
- **Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "If the account exists, an OTP code has been dispatched."
  }
  ```

### 2.6 Forgot Password - Verify OTP & Set New Password
- **Endpoint**: `/api/v1/auth/forgot-password/reset`
- **Method**: `POST`
- **Auth**: None
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "otp": "830192",
    "newPassword": "NewStrongPassword456!"
  }
  ```
- **Response**: `200 OK`

### 2.7 Get Current Authenticated Profile
- **Endpoint**: `/api/v1/auth/me`
- **Method**: `GET`
- **Auth**: Bearer Token
- **Response**: `200 OK` (Full user and profile object)

### 2.8 Logout & Terminate Session
- **Endpoint**: `/api/v1/auth/logout`
- **Method**: `POST`
- **Auth**: Bearer Token

---

## 3. Profiles & Social Relationships

### 3.1 Get Profile by Username
- **Endpoint**: `/api/v1/users/:username`
- **Method**: `GET`
- **Auth**: Optional (enables `isFollowing`, `friendshipStatus`)

### 3.2 Update Profile Metadata
- **Endpoint**: `/api/v1/users/profile`
- **Method**: `PUT`
- **Auth**: Bearer Token
- **Body**:
  ```json
  {
    "fullName": "Sabibor Hosain",
    "bio": "Lead Architect at DevSphere. Loving TypeScript & distributed MySQL.",
    "location": "San Francisco, CA",
    "website": "https://devsphere.social",
    "work": "CTO",
    "education": "M.S. Computer Science"
  }
  ```

### 3.3 Follow / Unfollow User
- **Endpoint**: `/api/v1/users/:id/follow`
- **Method**: `POST`
- **Auth**: Bearer Token
- **Response**: `200 OK` (`{"following": true}`)

### 3.4 Send Friend Request
- **Endpoint**: `/api/v1/users/:id/friend-request`
- **Method**: `POST`
- **Auth**: Bearer Token

---

## 4. News Feed & Posts API

### 4.1 Get Main News Feed (Paginated)
- **Endpoint**: `/api/v1/posts/feed`
- **Method**: `GET`
- **Auth**: Bearer Token (optional for public feeds)
- **Query Params**:
  - `page`: Integer (default `1`)
  - `limit`: Integer (default `10`)
  - `feedType`: `all` | `following` | `code`
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "posts": [
        {
          "id": 1,
          "content": "Welcome to DevSphere!",
          "postType": "MIXED",
          "privacy": "PUBLIC",
          "locationName": "Silicon Valley",
          "feelingEmoji": "🚀",
          "feelingText": "excited",
          "reactionsCount": 42,
          "commentsCount": 6,
          "userReaction": "CODE",
          "isSaved": false,
          "author": {
            "id": 1,
            "username": "sabiborhosain",
            "fullName": "Sabibor Hosain",
            "avatarUrl": "https://..."
          },
          "blocks": [
            {
              "id": 1,
              "order": 0,
              "type": "TEXT",
              "content": "DevSphere empowers developers to share interactive code..."
            },
            {
              "id": 2,
              "order": 1,
              "type": "CODE",
              "content": "import mysql from 'mysql2/promise'...",
              "meta": {
                "language": "typescript",
                "title": "db-pool.ts"
              }
            }
          ],
          "createdAt": "2026-09-22T06:11:18.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "hasMore": true,
        "total": 24
      }
    }
  }
  ```

### 4.2 Create New Block-Based Post
- **Endpoint**: `/api/v1/posts`
- **Method**: `POST`
- **Auth**: Bearer Token
- **Body**:
  ```json
  {
    "content": "Check out this quick tip!",
    "postType": "MIXED",
    "privacy": "PUBLIC",
    "locationName": "San Francisco",
    "feelingEmoji": "💡",
    "feelingText": "creative",
    "blocks": [
      {
        "type": "TEXT",
        "content": "Here is an example in Python:"
      },
      {
        "type": "CODE",
        "content": "def fib(n):\n    return n if n <= 1 else fib(n-1) + fib(n-2)",
        "meta": {
          "language": "python",
          "title": "fib.py"
        }
      }
    ]
  }
  ```

### 4.3 React to Post
- **Endpoint**: `/api/v1/posts/:id/react`
- **Method**: `POST`
- **Auth**: Bearer Token
- **Body**:
  ```json
  {
    "reactionType": "LIKE" | "LOVE" | "HAHA" | "WOW" | "SAD" | "ANGRY" | "CODE"
  }
  ```

### 4.4 Save / Unsave Post
- **Endpoint**: `/api/v1/posts/:id/save`
- **Method**: `POST`
- **Auth**: Bearer Token

---

## 5. Comment System

### 5.1 Get Comments for Post
- **Endpoint**: `/api/v1/posts/:postId/comments`
- **Method**: `GET`
- **Query Params**: `page=1&limit=20`

### 5.2 Add Comment with Optional Code Block
- **Endpoint**: `/api/v1/posts/:postId/comments`
- **Method**: `POST`
- **Auth**: Bearer Token
- **Body**:
  ```json
  {
    "content": "You can also optimize it with memoization:",
    "codeSnippet": "@functools.lru_cache(None)\ndef fib(n):\n    ...",
    "codeLanguage": "python",
    "parentId": null
  }
  ```

---

## 6. Stories API (24-Hour Ephemeral)

### 6.1 Get Active Stories Feed
- **Endpoint**: `/api/v1/stories`
- **Method**: `GET`
- **Auth**: Bearer Token

### 6.2 Post Story
- **Endpoint**: `/api/v1/stories`
- **Method**: `POST`
- **Auth**: Bearer Token
- **Body**:
  ```json
  {
    "mediaUrl": "https://...",
    "mediaType": "IMAGE" | "VIDEO" | "TEXT",
    "textContent": "Coding late into the night 🌙",
    "backgroundColor": "#0f172a"
  }
  ```

### 6.3 Record Story View
- **Endpoint**: `/api/v1/stories/:id/view`
- **Method**: `POST`
- **Auth**: Bearer Token

---

## 7. Short Videos (Reels) & Video Library

### 7.1 Get Reels Feed
- **Endpoint**: `/api/v1/videos/reels`
- **Method**: `GET`
- **Query Params**: `page=1&limit=10`
- **Response**: Returns vertical format video list optimized for native swipe-paging controllers (`UIPageViewController` on iOS or `Pager` on Android).

### 7.2 Upload New Video / Reel
- **Endpoint**: `/api/v1/videos`
- **Method**: `POST`
- **Auth**: Bearer Token
- **Body**:
  ```json
  {
    "title": "Clean Architecture in Flutter",
    "description": "Explaining entity, usecase, and repository boundaries in 60s.",
    "videoUrl": "https://...",
    "thumbnailUrl": "https://...",
    "duration": 58,
    "isShort": true
  }
  ```

---

## 8. Media Upload & Cloudflare R2 Pipeline

Native mobile apps can upload files directly via the multi-part upload endpoint:

### Direct Multi-Part Upload
- **Endpoint**: `/api/v1/media/upload`
- **Method**: `POST`
- **Auth**: Bearer Token
- **Headers**: `Content-Type: multipart/form-data`
- **Form Fields**:
  - `file`: Binary file stream (JPEG, PNG, WebP, MP4, MOV)
  - `folder`: `avatars` | `posts` | `stories` | `videos`
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "data": {
      "url": "https://pub-your-id.r2.dev/posts/uuid-v4.webp",
      "storageType": "R2",
      "fileSize": 1048576,
      "mimeType": "image/webp"
    }
  }
  ```

---

## 9. Reports & Community Safety

### Submit Community Report
- **Endpoint**: `/api/v1/reports`
- **Method**: `POST`
- **Auth**: Bearer Token
- **Body**:
  ```json
  {
    "reportedType": "USER" | "POST" | "COMMENT" | "VIDEO" | "PAGE",
    "reportedId": 12,
    "reason": "SPAM" | "HARASSMENT" | "FALSE_INFO" | "VIOLENCE" | "COPYRIGHT" | "INAPPROPRIATE" | "OTHER",
    "details": "User is posting unauthorized copyright material."
  }
  ```

---

## 10. Admin Configuration APIs (ADMIN / SUPER_ADMIN)

Mobile app administrators can query and manage system settings:

### Cloudflare R2 Settings
- **GET /api/v1/admin/settings/r2**: Returns current R2 configuration with `secret_access_key` masked.
- **PUT /api/v1/admin/settings/r2**: Updates R2 credentials. Plaintext `secret_access_key` is encrypted at rest using AES-256-GCM.
- **POST /api/v1/admin/settings/r2/test**: Validates connection to the Cloudflare R2 bucket.

### SMTP Email Settings
- **GET /api/v1/admin/settings/smtp**: Returns current SMTP settings with `password` masked.
- **PUT /api/v1/admin/settings/smtp**: Updates SMTP configuration. Plaintext `password` is encrypted at rest using AES-256-GCM.
- **POST /api/v1/admin/settings/smtp/test**: Sends a diagnostic verification email to `{ "testEmail": "admin@example.com" }`.

### General Platform Settings
- **GET /api/v1/admin/settings/general**: Returns platform title, description, registration toggles, and upload limits.
- **PUT /api/v1/admin/settings/general**: Updates general platform metadata.


# Production Deployment Guide (VPS / CyberPanel / cPanel / Ubuntu)

This guide walks you through deploying **DevSphere Social Platform** on an Ubuntu/Debian VPS, CyberPanel, cPanel, or any standard Linux hosting environment.

---

## 1. Prerequisites
- **Operating System**: Ubuntu 22.04 LTS or 24.04 LTS (or CloudLinux / AlmaLinux)
- **Node.js**: v20 LTS or v22 LTS (`node -v`)
- **Package Manager**: npm v10+
- **Database**: MySQL 8.0+ or MariaDB 10.4+ with phpMyAdmin access
- **Process Manager**: PM2 (`npm install -g pm2`)
- **Web Server**: Nginx or OpenLiteSpeed for SSL termination and reverse proxying

---

## 2. Step-by-Step Deployment Walkthrough

### Step 1: Upload Project Files
Upload the project zip or clone the repository to your server directory (e.g., `/var/www/devsphere`).

```bash
mkdir -p /var/www/devsphere
cd /var/www/devsphere
# If using git:
# git clone <your-repo-url> .
```

### Step 2: Extract Files
If you uploaded a `.zip` archive:
```bash
unzip devsphere-release.zip -d /var/www/devsphere/
cd /var/www/devsphere
```

### Step 3: Create MySQL Database
Log into MySQL CLI or your hosting control panel (CyberPanel / cPanel):
```sql
CREATE DATABASE devsphere_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'devsphere_user'@'localhost' IDENTIFIED BY 'YourStrongPasswordHere!';
GRANT ALL PRIVILEGES ON devsphere_db.* TO 'devsphere_user'@'localhost';
FLUSH PRIVILEGES;
```

### Step 4: Open phpMyAdmin
Navigate to your phpMyAdmin URL (e.g., `https://your-server-ip:8090/phpmyadmin` or `https://cpanel.yourdomain.com/phpmyadmin`).

### Step 5: Import Database Schema
1. Select `devsphere_db` from the left sidebar in phpMyAdmin.
2. Click the **Import** tab.
3. Click **Choose File** and select `/database/database.sql` from your project folder.
4. Click **Go** / **Import**. All tables, constraints, indexes, and seed data will be created cleanly.

### Step 6: Configure Environment Variables
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

### Step 7: Enter Database & App Credentials
Open `.env` in an editor (`nano .env`):
```env
PORT=3000
NODE_ENV=production
APP_URL=https://yourdomain.com

# 1. JWT Authentication (Required backend environment variables)
JWT_SECRET=super_strong_random_jwt_secret_key_at_least_32_chars!
JWT_EXPIRES_IN=7d

# 2. MySQL Database Credentials (Required backend environment variables)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=devsphere_db
DB_USER=devsphere_user
DB_PASSWORD=YourStrongPasswordHere!
```

> **Configuration Notice**:
> Only JWT and MySQL database credentials remain as environment variables.
> **Cloudflare R2** and **SMTP Email** are configured directly and securely via the Admin Control Center (Steps 15 and 16 below). Their credentials are authenticated and encrypted at rest with AES-256-GCM in MySQL. Missing R2 or SMTP credentials never block startup.

### Step 8: Configure Domain DNS
Point an `A` record for your domain (e.g., `yourdomain.com`) to your VPS server's public IP address.

### Step 9: Install Node.js Dependencies
```bash
npm install --production=false
```

### Step 10: Build Production Files
Compile the React frontend into static assets (`dist/`) and bundle the backend TypeScript server into a self-contained CommonJS binary (`dist/server.cjs`):
```bash
npm run build
```
Verify that `dist/` contains `index.html`, assets, and `dist/server.cjs`.

### Step 11: Start Backend Service with PM2
Launch the production server via PM2:
```bash
pm2 start dist/server.cjs --name "devsphere" -i max
pm2 save
pm2 startup
```

### Step 12: Configure Nginx Reverse Proxy
Create `/etc/nginx/sites-available/devsphere`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Enable the site and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/devsphere /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 13: Configure HTTPS (Let's Encrypt SSL)
Obtain a free SSL certificate with Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Step 14: Log In Using the Default Administrator Account
Open `https://yourdomain.com` in your browser.
Click **Log In** and enter the credentials:
- **Email**: `sabiborhosain@gmail.com`
- **Password**: `100200300`

> ⚠️ **CRITICAL SECURITY NOTICE**: Immediately change the default admin password upon first login via **Profile Settings -> Password**.

### Step 15: Configure SMTP Email Settings
1. Navigate to **Admin Panel** (`/admin`) -> **Settings** -> **Email / SMTP**.
2. Fill in your SMTP host, port, username, password, and sender address.
3. Click the **"Send Test Email"** button to confirm deliverability.

### Step 16: Configure Cloudflare R2 Media Storage
1. In the **Admin Panel**, navigate to **Settings** -> **Cloudflare R2**.
2. Enter your Cloudflare Account ID, Access Key ID, Secret Access Key, Bucket Name, and Public CDN URL.
3. Click **"Test Connection"** to verify R2 connectivity.
4. Toggle **Active Storage** to ON and click **Save Settings**.
All new photos, reels, and video uploads will now stream directly to Cloudflare R2 with zero server disk bloat.

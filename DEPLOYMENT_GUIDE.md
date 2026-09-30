# 🚀 FIREX Attendance — 24/7 Cloud Deployment Guide

This guide explains how to host the **FIREX Attendance** application in the cloud so it runs **24/7 independently**, even when your personal laptop is completely switched OFF or disconnected.

---

## 🏗️ Architecture Overview

```
[ Labour Employee Mobile Phones ]          [ Management / Engineer PC / Laptop ]
                 \                                      /
                  \                                    /
             (HTTPS / Internet)                   (HTTPS / Internet)
                    \                                /
                     ▼                              ▼
          ┌────────────────────────────────────────────────────────┐
          │               24/7 Cloud Hosted Server                 │
          │         (Render / Railway / Fly.io / VPS)              │
          │                                                        │
          │  • React SPA PWA Frontend (Vite)                       │
          │  • Express REST API Backend (Node.js)                  │
          │  • Timezone Engine (Asia/Bahrain UTC+3)                │
          │  • Offline Queue Idempotent Sync                       │
          │  • Auto Daily Backups & Audit Trail Engine             │
          └────────────────────────────────────────────────────────┘
                                     │
                                     ▼
                      ┌────────────────────────────┐
                      │ 24/7 Cloud Storage/Database│
                      │ (Persistent Volume/Postgres│
                      └────────────────────────────┘
```

---

## 🌟 Option 1: 1-Click Cloud Deployment on Render.com (Recommended & Free/Low-Cost)

1. Push this project repository to **GitHub** (or GitLab).
2. Go to **[https://render.com](https://render.com)** and create a free account.
3. Click **"New +"** → **"Web Service"**.
4. Connect your GitHub repository: `firex-attendance`.
5. Configure the service settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node server/index.js`
   - **Auto-Deploy:** `Yes`
6. Add Environment Variables under the **"Environment"** tab:
   - `NODE_ENV` = `production`
   - `PORT` = `5050` (or leave default port assigned by Render)
   - `JWT_SECRET` = `(generate any 32-character random string)`
   - `TIMEZONE` = `Asia/Bahrain`
7. Click **"Create Web Service"**.
8. Render will provide a permanent public URL, for example:
   👉 `https://firex-attendance.onrender.com`
9. **Done!** Employees can bookmark or install this URL on their phones, and administrators can open it from any laptop anywhere in the world. Your personal laptop does NOT need to be on.

---

## 🚂 Option 2: 1-Click Deployment on Railway.app

1. Go to **[https://railway.app](https://railway.app)**.
2. Click **"New Project"** → **"Deploy from GitHub repo"**.
3. Select `firex-attendance`.
4. Railway will automatically detect the `Dockerfile` or `package.json` and build the app.
5. In Project Settings, click **"Generate Domain"** to get your public HTTPS domain.
6. Under **Variables**, add:
   - `JWT_SECRET` = `your-secure-key`
   - `TIMEZONE` = `Asia/Bahrain`
7. Your app is live 24/7 with automatic health checks and restarts!

---

## 🐳 Option 3: Self-Hosted Cloud VPS via Docker / Docker Compose

If you have a Linux Cloud VPS (DigitalOcean, AWS EC2, Linode, Hetzner, etc.):

1. Clone or copy the project files to `/opt/firex-attendance`.
2. Run Docker Compose:
   ```bash
   docker-compose up -d --build
   ```
3. (Optional) Point your custom domain (e.g. `attendance.firex.com`) to your VPS IP via Nginx Reverse Proxy with free SSL:
   ```nginx
   server {
       server_name attendance.firex.com;

       location / {
           proxy_pass http://127.0.0.1:5050;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
4. Issue SSL certificate:
   ```bash
   certbot --nginx -d attendance.firex.com
   ```

---

## 🧪 Acceptance Test Proof: 24/7 Operational Validation

To verify the system operates 24/7 independently:

1. Deploy the app to Render / Railway / Cloud VPS.
2. Log in on a mobile phone at `https://your-cloud-domain.com`.
3. Press **CHECK IN** (or punch out).
4. Turn your laptop completely **OFF**.
5. The employee's phone still records attendance directly to the cloud.
6. If the employee loses internet, the phone safely queues the record and synchronizes automatically upon reconnecting.
7. Open the admin dashboard from any other device or phone to view live attendance records and download Excel/PDF reports.

# SmartUp Online ERP — Comprehensive Implementation & VPS Deployment Plan

---

## Executive Summary

SmartUp operates two distinct divisions:
1. **SmartUp Offline (Existing)**: 
   - **Frontend**: Next.js 16 (`smartuplearning.net`) clustered across 4 PM2 worker instances (`:3001`, `:3005`, `:3006`, `:3007`).
   - **Backend**: Dedicated Frappe Cloud site (`https://smartup.m.frappe.cloud`).
   - **Scope**: Physical centers across Kochi (Kadavanthara, Edappally, Vennala, Fortkochi, etc.).
2. **SmartUp Online (New Initiative)**:
   - **Domain**: `smartuplearning.online` (DNS owned and configured).
   - **Backend**: Brand new, dedicated Frappe Cloud / self-hosted Frappe site (separate Frappe account/bench).
   - **Target Architecture**: An independent, isolated ERP deployment tailored to online batches, remote instructors, digital student groups, online fee structures, and virtual session tracking without contaminating offline production data.

This document details the architectural blueprint, repository strategy, Frappe online provisioning, step-by-step VPS hosting setup (Nginx, PM2, SSL, DNS), and phased rollout plan.

---

## 1. Architectural Topology & Current Server State

Based on our analysis of [Server Configuration - Clustered.md](file:///c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/docs/Server%20Configuration%20-%20Clustered.md) and [Server Configuration.md](file:///c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/docs/Server%20Configuration.md):

```
                                  INTERNET
                                      │
              ┌───────────────────────┴───────────────────────┐
              │                                               │
              ▼                                               ▼
     Cloudflare Proxy                                  Cloudflare Proxy
   smartuplearning.net                              smartuplearning.online
 (Offline ERP: :3001,:3005,:3006,:3007)            (Online ERP: :3002,:3003 or :3010)
              │                                               │
              └───────────────────────┬───────────────────────┘
                                      ▼
                        Nginx Reverse Proxy (Host: 76.13.244.60)
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
    [Offline ERP Cluster]                           [Online ERP Cluster]
   PM2: smartup-erp-1..4                           PM2: smartup-online-1..2
   Path: /var/www/smartup-erp                      Path: /var/www/smartup-online-erp
   Ports: 3001, 3005, 3006, 3007                   Ports: 3010, 3011 (or standalone 3002)
              │                                               │
              ▼                                               ▼
     Frappe Cloud (Offline)                          Frappe Cloud (Online)
   smartup.m.frappe.cloud                          smartup-online.m.frappe.cloud
   (9 Physical Branches)                           (Virtual / Online Batches)
```

### Key Server Resources & Allocation

| Property | Offline ERP (`smartuplearning.net`) | Online ERP (`smartuplearning.online`) |
| :--- | :--- | :--- |
| **Server Host** | `76.13.244.60` (Ubuntu VPS) | Same VPS (`76.13.244.60`) or Separate VPS |
| **Domain** | `smartuplearning.net` | `smartuplearning.online` |
| **Frontend Directory** | `/var/www/smartup-erp` | `/var/www/smartup-online-erp` |
| **Git Repository** | `pydart-hub/smartup-erp-frontend` | `pydart-hub/smartup-online-erp-frontend` (new repo or monorepo) |
| **PM2 Process Names** | `smartup-erp-1` to `smartup-erp-4` | `smartup-online-erp-1`, `smartup-online-erp-2` |
| **App Ports** | 3001, 3005, 3006, 3007 | 3010, 3011 (or 3002, 3003) |
| **Frappe Backend** | `smartup.m.frappe.cloud` (Existing) | New Frappe Site (e.g., `online-smartup.m.frappe.cloud`) |
| **Frappe Auth Keys** | Existing Offline Keys | New Dedicated Online API Keys & Secrets |
| **Payment Gateways** | Branch Razorpay / CoFee accounts | Online Razorpay / CoFee dedicated gateway |

---

## 2. Where to Start the Development

### Phase A: Repository Strategy & Codebase Decoupling
**Decision**: Fork / Separate Repository (`smartup-online-erp-frontend`) vs Monorepo.
- **Recommended**: **Separate Repository Clone** (`smartup-online-erp-frontend`).
- **Rationale**: 
  1. Complete isolation: An update to offline branch rules or physical branch schemas won't accidentally break online operations.
  2. Independent CI/CD: Deployments to `smartuplearning.online` can happen without touching `smartup-erp` cluster processes.
  3. Clean git commit histories and environment secrets.

### Phase B: Backend Provisioning on Frappe Cloud
Before writing frontend code, the new Frappe backend must be initialized:
1. **Create New Frappe Cloud Site**:
   - URL format: `https://<online-slug>.m.frappe.cloud` (e.g. `smartup-online.m.frappe.cloud`).
   - Apps installed: `frappe`, `erpnext`, `education` (plus any custom apps used by SmartUp).
2. **Setup Company & Academic Structure**:
   - Company: "SmartUp Online" (Single entity or split by online programs).
   - Academic Term & Year: `2026-2027` (Online).
   - Programs & Courses: Foundation, Advanced, Plus One, Plus Two Online, GCC batches.
3. **Provision Dedicated Administrator API Credentials**:
   - In Frappe Desk: User `Administrator` (or dedicated system manager `online-admin@smartup.in`).
   - Generate: `API Key` and `API Secret`.
4. **Deploy Custom DocTypes & Scripts**:
   - Port required doctypes if needed (e.g., `SmartUp Salary Record`, `Syllabus Configuration`, `Assessment Plan`, `Work Assignment`).

### Phase C: Frontend Codebase Customization
1. **Initialize Project**:
   ```bash
   git clone https://github.com/pydart-hub/smartup-erp-frontend.git smartup-online-erp-frontend
   cd smartup-online-erp-frontend
   git remote set-url origin https://github.com/pydart-hub/smartup-online-erp-frontend.git
   ```
2. **Environment Configuration (`.env.local`)**:
   ```env
   # Online Frappe Backend URL
   NEXT_PUBLIC_FRAPPE_URL=https://<your-online-frappe-instance>.m.frappe.cloud

   # Display Name
   NEXT_PUBLIC_APP_NAME="SmartUp Online ERP"
   NEXT_PUBLIC_APP_URL=https://smartuplearning.online

   # Server-side API Keys (Online Frappe site)
   FRAPPE_API_KEY=<new_online_frappe_api_key>
   FRAPPE_API_SECRET=<new_online_frappe_api_secret>

   # NextAuth Cookie Secret
   NEXTAUTH_SECRET=<newly_generated_32_byte_secret>

   # Online Razorpay / Payment Gateway credentials
   NEXT_PUBLIC_RAZORPAY_KEY_ID=<online_razorpay_key_id>
   RAZORPAY_KEY_SECRET=<online_razorpay_secret>
   ```
3. **Refactor Constants & Branch Rules**:
   - In `src/lib/utils/constants.ts`:
     - Replace the 9 physical branches with Online Divisions (e.g., `SmartUp Online Kerala`, `SmartUp GCC Online`, `SmartUp Crash Course`).
     - Adjust batch naming rules and academic calendar schedules to match online timings (Zoom/Google Meet/LiveKit).
4. **Proxy Route Validation**:
   - Review `src/app/api/proxy/[...path]/route.ts`: Ensure it routes cleanly to the new `NEXT_PUBLIC_FRAPPE_URL` without legacy hardcoded offline company checks.

---

## 3. VPS Hosting & Deployment Architecture

### Step 1: DNS Setup (Cloudflare)
1. Add an `A` record in Cloudflare DNS for `smartuplearning.online`:
   - **Type**: `A`
   - **Name**: `@` (and `www`)
   - **IPv4 Address**: `76.13.244.60` (or target VPS IP)
   - **Proxy Status**: `Proxied` (Orange Cloud)
2. Cloudflare SSL/TLS encryption mode:
   - Set to **Full** (or Full Strict with Cloudflare Origin CA certificate).

---

### Step 2: Directory & Code Placement on the Server
SSH into the server:
```bash
ssh smartup-portal
```
Create the directory and clone the online repository:
```bash
cd /var/www
git clone https://github.com/pydart-hub/smartup-online-erp-frontend.git smartup-online-erp
cd /var/www/smartup-online-erp
```
Place the `.env.local` configuration:
```bash
nano /var/www/smartup-online-erp/.env.local
chmod 600 /var/www/smartup-online-erp/.env.local
```
Install dependencies and build:
```bash
npm install
npm run build
```

---

### Step 3: PM2 Ecosystem Setup (`ecosystem.config.js`)
To avoid conflicting with Offline ERP (which uses ports 3001, 3005, 3006, 3007) and Portal (port 3000), configure dedicated ports for Online ERP (e.g. **3010** and **3011**).

Create `/var/www/smartup-online-erp/ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: "smartup-online-erp-1",
      script: "npm",
      args: "run start",
      cwd: "/var/www/smartup-online-erp",
      instances: 1,
      exec_mode: "fork",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/root/.pm2/logs/smartup-online-erp-1-error.log",
      out_file: "/root/.pm2/logs/smartup-online-erp-1-out.log",
      env: {
        PORT: 3010,
        NODE_ENV: "production"
      }
    },
    {
      name: "smartup-online-erp-2",
      script: "npm",
      args: "run start",
      cwd: "/var/www/smartup-online-erp",
      instances: 1,
      exec_mode: "fork",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/root/.pm2/logs/smartup-online-erp-2-error.log",
      out_file: "/root/.pm2/logs/smartup-online-erp-2-out.log",
      env: {
        PORT: 3011,
        NODE_ENV: "production"
      }
    }
  ]
};
```

Start the processes:
```bash
cd /var/www/smartup-online-erp
pm2 start ecosystem.config.js
pm2 save
```

---

### Step 4: SSL Certificate for `smartuplearning.online`
Generate the self-signed origin certificate (compatible with Cloudflare Full SSL mode):
```bash
mkdir -p /etc/ssl/smartup-online-erp
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout /etc/ssl/smartup-online-erp/privkey.pem \
    -out /etc/ssl/smartup-online-erp/fullchain.pem \
    -subj '/CN=smartuplearning.online'
chmod 600 /etc/ssl/smartup-online-erp/privkey.pem
```

---

### Step 5: Nginx Upstream & Server Block Configuration

#### 1. Define Nginx Upstream Pool
Create `/etc/nginx/conf.d/upstream-online-erp.conf`:
```nginx
# Upstream load-balancing pool for SmartUp Online ERP
upstream smartup_online_erp_upstream {
    least_conn;
    server 127.0.0.1:3010 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3011 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

#### 2. Configure Virtual Host
Create `/etc/nginx/sites-available/online-erp`:
```nginx
server {
    listen 443 ssl http2;
    server_name smartuplearning.online www.smartuplearning.online;

    ssl_certificate /etc/ssl/smartup-online-erp/fullchain.pem;
    ssl_certificate_key /etc/ssl/smartup-online-erp/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Gzip compression for Next.js assets
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    location / {
        proxy_pass http://smartup_online_erp_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}

server {
    listen 80;
    server_name smartuplearning.online www.smartuplearning.online;
    return 301 https://$host$request_uri;
}
```

Enable the site and reload Nginx:
```bash
ln -sf /etc/nginx/sites-available/online-erp /etc/nginx/sites-enabled/online-erp
nginx -t
systemctl reload nginx
```

---

### Step 6: Automated Safe Deployment Script
Create `/var/www/smartup-online-erp/scripts/deploy.sh`:
```bash
#!/bin/bash
set -e

PROJECT_DIR="/var/www/smartup-online-erp"
BRANCH="main"

echo "=========================================================="
echo "🚀 Starting Deployment for SmartUp Online ERP"
echo "=========================================================="

cd "${PROJECT_DIR}"

echo "📥 Fetching latest changes from git..."
git fetch origin "${BRANCH}"
git reset --hard "origin/${BRANCH}"

echo "📦 Installing npm dependencies..."
npm install

echo "🛠️ Building Next.js production bundle..."
npm run build

echo "🔄 Reloading PM2 instances..."
if pm2 list | grep -q "smartup-online-erp-"; then
    pm2 reload ecosystem.config.js
else
    pm2 start ecosystem.config.js
fi

pm2 save

echo "🌐 Verifying Nginx and reloading..."
nginx -t
systemctl reload nginx

echo "=========================================================="
echo "✅ SmartUp Online ERP Deployed Successfully!"
echo "=========================================================="
```
Make it executable:
```bash
chmod +x /var/www/smartup-online-erp/scripts/deploy.sh
```

---

## 4. Phase-by-Phase Execution Checklist

- [ ] **Phase 1: Environment & Cloud Accounts**
  - [ ] Set up the new Frappe Cloud site and obtain admin API Key & Secret.
  - [ ] Configure DNS for `smartuplearning.online` in Cloudflare pointing to `76.13.244.60`.
  - [ ] Generate SSL certificates on the VPS.
- [ ] **Phase 2: Codebase Preparation**
  - [ ] Create repository `pydart-hub/smartup-online-erp-frontend`.
  - [ ] Clone and adjust branding to "SmartUp Online ERP".
  - [ ] Update constants (`constants.ts`) to remove offline physical branch constraints.
  - [ ] Test build locally with `npx tsc --noEmit` and `npm run build`.
- [ ] **Phase 3: Server Provisioning**
  - [ ] Create directory `/var/www/smartup-online-erp`.
  - [ ] Configure `ecosystem.config.js` with ports 3010 and 3011.
  - [ ] Configure Nginx upstream and virtual host for `smartuplearning.online`.
  - [ ] Run initial PM2 start and verify response (`curl -I http://127.0.0.1:3010`).
- [ ] **Phase 4: Verification & Live Launch**
  - [ ] Test public URL: `https://smartuplearning.online`.
  - [ ] Verify Frappe Cloud API proxy calls (`/api/proxy/resource/...`).
  - [ ] Verify authentication flow and dashboard routing for online roles.

---

## 5. Summary of Deliverables & Reference Files

| Document / Asset | Purpose |
| :--- | :--- |
| [Server Configuration - Clustered.md](file:///c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/docs/Server%20Configuration%20-%20Clustered.md) | Blueprint for PM2 clustering & Nginx load balancing |
| [Server Configuration.md](file:///c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/docs/Server%20Configuration.md) | Blueprint for SSL, Cloudflare proxy, and env configs |
| [deploy.sh](file:///c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/scripts/deploy.sh) | Base deployment shell automation script |

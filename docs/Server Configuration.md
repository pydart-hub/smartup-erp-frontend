# Portal Server — Stage 05: SmartUp ERP Frontend Deployment

---

**Stage:** 05 (addon)  
**Server:** `76.13.244.60` — Portal Server  
**SSH alias:** `ssh smartup-portal` → `root@76.13.244.60`  
**Domain:** `smartuplearning.net` (via Cloudflare proxy)  
**Date Completed:** March 6, 2026  
**Status:** ✅ COMPLETE  
**Depends on:** Stages 01–04 complete ✅  

---

## Overview

The **SmartUp ERP Frontend** (Next.js 16) is deployed alongside the existing SmartUp Portal on the same server. The ERP frontend connects to a **Frappe Cloud ERPNext** backend (`smartup.m.frappe.cloud`) and serves a role-based education institute management system (batches, students, fees, attendance, payroll, etc.).

| Property | Portal (existing) | ERP Frontend |
|----------|-------------------|-------------------|
| **Domain** | `smartuplearning.online` | `smartuplearning.net` |
| **DNS/SSL** | Direct → Let's Encrypt | Cloudflare proxy → self-signed origin cert |
| **App Port** | 3000 | 3001 |
| **PM2 Name** | `smartup-portal` | `smartup-erp` |
| **Install Path** | `/var/www/smartup-portal` | `/var/www/smartup-erp` |
| **Backend** | PostgreSQL + Redis (local) | Frappe Cloud (remote) |
| **Git Repo** | — | `https://github.com/pydart-hub/smartup-erp-frontend.git` |

---

## Stage 05 Checklist

- [x] 5.1 — Point DNS `smartuplearning.net` → `76.13.244.60` (via Cloudflare proxy)
- [x] 5.2 — Clone ERP repo to `/var/www/smartup-erp`
- [x] 5.3 — Configure `.env.local` with production values
- [x] 5.4 — Install dependencies + build production bundle
- [x] 5.5 — Start with PM2 on port 3001
- [x] 5.6 — Configure Nginx reverse proxy with SSL for `smartuplearning.net`
- [x] 5.7 — Self-signed origin certificate (Cloudflare "Full" SSL mode)
- [x] 5.8 — Verify end-to-end (`https://smartuplearning.net` → 200 OK)
- [x] 5.9 — Add Arjun's SSH key to server (`arjun@smartup`) — March 10, 2026

---

## 5.1 — DNS Configuration (Cloudflare)

DNS is managed via **Cloudflare**. The A record points to the portal server with **Cloudflare proxy enabled** (orange cloud):

| Domain | Type | Target | Proxy |
|--------|------|--------|-------|
| `smartuplearning.net` | A | `76.13.244.60` | ✅ Proxied (Cloudflare) |

Cloudflare SSL mode: **Full** (automatic) — Cloudflare handles browser-facing SSL, origin uses self-signed cert.

```bash
# DNS resolves to Cloudflare edge IPs (not directly to origin)
dig smartuplearning.net A +short
# Result: 172.67.137.183, 104.21.70.167 (Cloudflare)
```

---

## 5.2 — Clone Repository

```bash
cd /var/www
git clone https://github.com/pydart-hub/smartup-erp-frontend.git smartup-erp
cd smartup-erp
```

**Install path:** `/var/www/smartup-erp`  
**Branch:** `master`

---

## 5.3 — Environment Configuration

**File:** `/var/www/smartup-erp/.env.local` (chmod 600)

```env
# Frappe Backend URL (ERPNext instance on Frappe Cloud)
NEXT_PUBLIC_FRAPPE_URL=https://smartup.m.frappe.cloud

# App Details
NEXT_PUBLIC_APP_NAME=Smartup ERP

# Server-side only
FRAPPE_API_KEY=03330270e330d49
FRAPPE_API_SECRET=9c2261ae11ac2d2

# Cookie signing secret (generated with: openssl rand -base64 32)
NEXTAUTH_SECRET=cWPg8jeRE9cxWcwH4auZEE0FY9NKrvMcZEULRoRf7Bw=

# Razorpay (test mode — switch to live keys for production)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_SMdtcwacJ9SCvm
RAZORPAY_KEY_SECRET=adYgB3GoIhqQ86GrCky1Ab5s

# Production
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://smartuplearning.net
```

### Environment Variables Reference

| Variable | Scope | Value | Purpose |
|----------|-------|-------|---------|
| `NEXT_PUBLIC_FRAPPE_URL` | Public | `https://smartup.m.frappe.cloud` | Frappe/ERPNext backend instance |
| `NEXT_PUBLIC_APP_NAME` | Public | `Smartup ERP` | Display name |
| `FRAPPE_API_KEY` | Server | `03330270e330d49` | Admin API key for Frappe |
| `FRAPPE_API_SECRET` | Server | `9c2261ae11ac2d2` | Admin API secret for Frappe |
| `NEXTAUTH_SECRET` | Server | (generated) | Cookie signing secret |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Public | `rzp_test_SMdtcwacJ9SCvm` | Razorpay test publishable key |
| `RAZORPAY_KEY_SECRET` | Server | `adYgB3GoIhqQ86GrCky1Ab5s` | Razorpay secret key |
| `NODE_ENV` | Server | `production` | Production mode |
| `NEXT_PUBLIC_APP_URL` | Public | `https://smartuplearning.net` | Public app URL |

---

## 5.4 — Install Dependencies & Build

```bash
cd /var/www/smartup-erp
npm install
npm run build
```

**Build output:** Next.js 16.1.6 production build — static pages (director, branch-manager, hr-manager, instructor, parent dashboards) + dynamic routes + API proxy routes compiled successfully.

**Key dependencies:** Next.js 16.1.6, React 19.2.3, Axios, Zustand, TanStack React Query + React Table, Radix UI, Razorpay SDK, React Hook Form + Zod.

---

## 5.5 — Start with PM2 on Port 3001

```bash
cd /var/www/smartup-erp
PORT=3001 pm2 start npm --name smartup-erp -- start
pm2 save
```

Verify:
```bash
pm2 list
curl -s -o /dev/null -w '%{http_code}' http://localhost:3001
# Result: 307 (redirect to /auth/login — app is working)
```

### PM2 Status After Deploy

| ID | Name | Port | Status | Uptime |
|----|------|------|--------|--------|
| 0 | `smartup-portal` | 3000 | ✅ online | — |
| 1 | `smartup-erp` | 3001 | ✅ online | — |

---

## 5.6 — Nginx Reverse Proxy + SSL for `smartuplearning.net`

### SSL: Self-Signed Origin Certificate

Since `smartuplearning.net` is behind **Cloudflare proxy** (orange cloud), Let's Encrypt HTTP challenges cannot reach the origin server directly. Instead, a **self-signed origin certificate** is used — Cloudflare "Full" SSL mode accepts this.

```bash
# Generate self-signed cert (valid 10 years)
mkdir -p /etc/ssl/smartup-erp
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout /etc/ssl/smartup-erp/privkey.pem \
    -out /etc/ssl/smartup-erp/fullchain.pem \
    -subj '/CN=smartuplearning.net'
chmod 600 /etc/ssl/smartup-erp/privkey.pem
```

**Certificate files:**
- `/etc/ssl/smartup-erp/fullchain.pem` — self-signed cert
- `/etc/ssl/smartup-erp/privkey.pem` — private key (chmod 600)

### Nginx Configuration

**File:** `/etc/nginx/sites-available/erp` (linked to `sites-enabled`)

```nginx
server {
    listen 443 ssl;
    server_name smartuplearning.net;

    ssl_certificate /etc/ssl/smartup-erp/fullchain.pem;
    ssl_certificate_key /etc/ssl/smartup-erp/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
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
    server_name smartuplearning.net;
    return 301 https://$host$request_uri;
}
```

```bash
ln -sf /etc/nginx/sites-available/erp /etc/nginx/sites-enabled/erp
nginx -t && systemctl reload nginx
```

> **SSL flow:** Browser → Cloudflare (valid public SSL) → Origin `76.13.244.60:443` (self-signed cert, accepted by Cloudflare "Full" mode) → Nginx → `127.0.0.1:3001` (Next.js ERP)

> **Note:** If Cloudflare upgrades to "Full (Strict)" mode during the next automatic scan (March 13), you'll need to replace the self-signed cert with a **Cloudflare Origin Certificate** (generated in Cloudflare dashboard → SSL/TLS → Origin Server). The Nginx ssl_certificate/ssl_certificate_key paths stay the same.

---

## 5.7 — End-to-End Verification

```bash
# HTTPS from outside (through Cloudflare)
curl -I https://smartuplearning.net
# Result: 200 OK

# Direct from server (self-signed, skip verify)
curl -sk -o /dev/null -w '%{http_code}' https://localhost:3001
# Result: app responds

# PM2 both apps running
pm2 list
# Expected: smartup-portal (3000) + smartup-erp (3001) both "online"

# Both domains responding
curl -I https://smartuplearning.online  # → portal (Let's Encrypt SSL)
curl -I https://smartuplearning.net     # → ERP (Cloudflare + self-signed origin)
```

✅ All tests pass. ERP frontend live at `https://smartuplearning.net`.

---

## Production Architecture (Updated)

```
                       Internet
                          │
            ┌─────────────┴─────────────┐
            │                           │
            ▼                           ▼
   ┌─────────────────┐        ┌─────────────────┐
   │  Cloudflare CDN │        │  Direct DNS     │
   │  (proxy ON)     │        │  (no proxy)     │
   │  smartuplearning │        │  smartuplearning │
   │  .net           │        │  .online        │
   └────────┬────────┘        └────────┬────────┘
            │ HTTPS (Full mode)        │ HTTPS (Let's Encrypt)
            ▼                          ▼
   ┌──────────────────────────────────────────┐
   │         Nginx (76.13.244.60:443)         │
   │                                          │
   │  smartuplearning.net → self-signed cert  │
   │  smartuplearning.online → LE cert        │
   └──────────┬───────────────┬───────────────┘
              │               │
              ▼               ▼
       ┌──────────┐    ┌──────────┐    ┌──────────────┐
       │ Next.js  │    │ Next.js  │    │ LiveKit      │
       │ ERP      │    │ Portal   │    │ Media Server │
       │ :3001    │    │ :3000    │    │ 76.13.244.54 │
       │ (PM2)    │    │ (PM2)    │    │ :7880        │
       └────┬─────┘    └────┬─────┘    └──────────────┘
            │               │
            ▼               ▼
       Frappe Cloud    PostgreSQL
       (smartup.m       + Redis
       .frappe.cloud)   (local)
```

### SSL Comparison

| Domain | DNS | SSL (Browser ↔ Edge) | SSL (Edge ↔ Origin) | Cert on Origin |
|--------|-----|---------------------|---------------------|---------------|
| `smartuplearning.online` | Direct A record | Let's Encrypt | N/A (direct) | Let's Encrypt (Certbot) |
| `smartuplearning.net` | Cloudflare proxy | Cloudflare Universal | Cloudflare "Full" | Self-signed (10yr) |

---

## SSH Access

### Authorized Keys

| User | Key Type | Comment | Added |
|------|----------|---------|-------|
| pydart (macbook) | ed25519 | `pydart@macbook` | Stage 01 |
| Arjun | ed25519 | `arjun@smartup` | March 10, 2026 |

### Arjun's SSH Config (`~/.ssh/config` on his machine)

```
Host smartup-portal
    HostName 76.13.244.60
    User root
    IdentityFile ~/.ssh/id_ed25519
```

Then connect with:
```bash
ssh smartup-portal
```

---

## Quick Reference Commands

```bash
# SSH to server
ssh smartup-portal

# Deploy ERP frontend update
ssh smartup-portal "cd /var/www/smartup-erp && git pull origin master && npm run build && pm2 restart smartup-erp"

# Deploy portal update (same as before)
ssh smartup-portal "cd /var/www/smartup-portal && git pull origin master && npm run build && pm2 restart smartup-portal"

# Check both apps
pm2 list
pm2 logs smartup-erp --lines 50
pm2 logs smartup-portal --lines 50

# Restart individual apps
pm2 restart smartup-erp
pm2 restart smartup-portal

# Nginx
nginx -t && systemctl reload nginx

# Check SSL cert on origin
openssl x509 -in /etc/ssl/smartup-erp/fullchain.pem -noout -dates
echo | openssl s_client -connect smartuplearning.online:443 2>/dev/null | openssl x509 -noout -dates
```

---

## Pending / Notes

| Item | Priority | Details |
|------|----------|---------|
| Cloudflare "Full (Strict)" upgrade | LOW | If Cloudflare auto-upgrades from "Full" to "Full (Strict)" on March 13, replace self-signed cert with Cloudflare Origin Certificate |
| Razorpay live keys | MEDIUM | Currently using test keys — switch to live for production payments |
| Frappe API key rotation | LOW | Consider rotating `FRAPPE_API_KEY`/`FRAPPE_API_SECRET` periodically |

---

## ✅ Stage 05 Complete

ERP frontend is live at `https://smartuplearning.net` with:
- Next.js 16.1.6 serving role-based dashboards (Director, Branch Manager, HR Manager, Instructor, Parent)
- Frappe Cloud ERPNext backend (`smartup.m.frappe.cloud`)
- API proxy pattern (client → `/api/proxy/*` → server → Frappe REST API)
- Razorpay payment integration (test mode)
- Cloudflare CDN + SSL proxy
- PM2 process management with auto-restart
- Git-based deploy workflow

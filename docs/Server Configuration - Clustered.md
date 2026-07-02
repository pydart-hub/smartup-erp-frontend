# Portal Server — Stage 05: SmartUp ERP Clustered Deployment (4 Instances)

---

**Stage:** 05 (optimized for load)  
**Server:** `76.13.244.60` — Portal Server  
**SSH alias:** `ssh smartup-portal` → `root@76.13.244.60`  
**Domain:** `smartuplearning.net` (via Cloudflare proxy)  
**Status:** ✅ COMPLETE  
**Depends on:** Stage 05 Single-Instance setup + PM2 Clustering Optimizations  

---

## Overview

The **SmartUp ERP Frontend** (Next.js 16) is deployed on the portal server. To support high concurrent traffic (e.g. 700+ concurrent student exams) and utilize all 4 CPU cores, the frontend is clustered into **4 distinct PM2 instances** behind an Nginx upstream load balancer.

| Property | Portal (existing) | ERP Frontend (Clustered) |
|----------|-------------------|-------------------|
| **Domain** | `smartuplearning.online` | `smartuplearning.net` |
| **DNS/SSL** | Direct → Let's Encrypt | Cloudflare proxy → self-signed origin cert |
| **App Ports** | 3000 | 3001, 3005, 3006, 3007 |
| **PM2 Names** | `smartup-portal` | `smartup-erp-1` to `smartup-erp-4` |
| **Install Path** | `/var/www/smartup-portal` | `/var/www/smartup-erp` |
| **Backend** | PostgreSQL + Redis (local) | Frappe Cloud (remote) |
| **Git Repo** | — | `https://github.com/pydart-hub/smartup-erp-frontend.git` |
| **Load Balancing**| Single process | Nginx `least_conn` upstream |

---

## ⚙️ PM2 Cluster Configuration

All 4 instances are configured and managed via [ecosystem.config.js](file:///var/www/smartup-erp/ecosystem.config.js) in the project directory `/var/www/smartup-erp/`:

```javascript
module.exports = {
  apps: [
    {
      name: "smartup-erp-1",
      script: "npm",
      args: "run start",
      cwd: "/var/www/smartup-erp",
      instances: 1,
      exec_mode: "fork",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/root/.pm2/logs/smartup-erp-1-error.log",
      out_file: "/root/.pm2/logs/smartup-erp-1-out.log",
      env: {
        PORT: 3001,
        NODE_ENV: "production"
      }
    },
    {
      name: "smartup-erp-2",
      script: "npm",
      args: "run start",
      cwd: "/var/www/smartup-erp",
      instances: 1,
      exec_mode: "fork",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/root/.pm2/logs/smartup-erp-2-error.log",
      out_file: "/root/.pm2/logs/smartup-erp-2-out.log",
      env: {
        PORT: 3005,
        NODE_ENV: "production"
      }
    },
    {
      name: "smartup-erp-3",
      script: "npm",
      args: "run start",
      cwd: "/var/www/smartup-erp",
      instances: 1,
      exec_mode: "fork",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/root/.pm2/logs/smartup-erp-3-error.log",
      out_file: "/root/.pm2/logs/smartup-erp-3-out.log",
      env: {
        PORT: 3006,
        NODE_ENV: "production"
      }
    },
    {
      name: "smartup-erp-4",
      script: "npm",
      args: "run start",
      cwd: "/var/www/smartup-erp",
      instances: 1,
      exec_mode: "fork",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/root/.pm2/logs/smartup-erp-4-error.log",
      out_file: "/root/.pm2/logs/smartup-erp-4-out.log",
      env: {
        PORT: 3007,
        NODE_ENV: "production"
      }
    }
  ]
};
```

### PM2 Status Reference Table

| ID | Name | Port | Mode | Status | Connection Limit |
|----|------|------|------|--------|------------------|
| 0 | `smartup-portal` | 3000 | fork | ✅ online | — |
| 1 | `smartup-erp-1` | 3001 | fork | ✅ online | max 20 connections|
| 2 | `smartup-erp-2` | 3005 | fork | ✅ online | max 20 connections|
| 3 | `smartup-erp-3` | 3006 | fork | ✅ online | max 20 connections|
| 4 | `smartup-erp-4` | 3007 | fork | ✅ online | max 20 connections|

---

## 🔀 Nginx Upstream Configuration

Nginx acts as the reverse proxy and balances incoming client traffic across all 4 ports using the `least_conn` load balancing scheme.

### Upstream Pool Configuration
**File:** `/etc/nginx/conf.d/upstream-erp.conf` on the server:

```nginx
# Upstream load-balancing pool for SmartUp ERP (4 instances)
upstream smartup_erp_upstream {
    least_conn;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3005 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3006 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3007 max_fails=3 fail_timeout=30s;
    keepalive 64;
}
```

### Site Server Block Configuration
**File:** `/etc/nginx/sites-available/erp` (symlinked to `/etc/nginx/sites-enabled/erp`):

```nginx
server {
    listen 443 ssl;
    server_name smartuplearning.net;

    ssl_certificate /etc/ssl/smartup-erp/fullchain.pem;
    ssl_certificate_key /etc/ssl/smartup-erp/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://smartup_erp_upstream;
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
    server_name smartuplearning.net;
    return 301 https://$host$request_uri;
}
```

---

## 📈 Clustered Production Architecture

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
   │  smartuplearning.net → Upstream Pool     │
   │  smartuplearning.online → LE cert        │
   └────────────────────┬─────────────────────┘
                        │
       ┌────────────────┼────────────────┬────────────────┐
       │ (least_conn)   │ (least_conn)   │ (least_conn)   │ (least_conn)
       ▼                ▼                ▼                ▼
 ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
 │ Next.js   │    │ Next.js   │    │ Next.js   │    │ Next.js   │
 │ erp-1     │    │ erp-2     │    │ erp-3     │    │ erp-4     │
 │ :3001     │    │ :3005     │    │ :3006     │    │ :3007     │
 └─────┬─────┘    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
       │                │                │                │
       └────────────────┼────────────────┼────────────────┘
                        ▼
            ┌──────────────────────┐
            │ PostgreSQL DB        │ (smartup_offline)
            │ max_connections=400  │ (each instance connection_limit=20)
            └──────────────────────┘
```

---

## 🚀 Quick Reference Commands (Clustered Management)

### SSH to Server
```bash
ssh smartup-portal
```

### Complete Safe Deployment Script
To update all 4 instances without causing port conflicts or chunk load errors, run the deployment script on the server:

```bash
# SSH into the server and execute the deploy command
ssh smartup-portal "cd /var/www/smartup-erp && git fetch --all && git reset --hard origin/main && npm install && npx prisma generate && npm run build && pm2 reload ecosystem.config.js && pm2 save && nginx -t && systemctl reload nginx"
```

### Individual Service Verification Checks
Run these commands on the server to verify each cluster node's health:

```bash
# 1. Check PM2 status
pm2 list

# 2. Check that all ports are listening
netstat -tulnp | grep -E '3001|3005|3006|3007'

# 3. Test HTTP response on each node independently
curl -I http://127.0.0.1:3001
curl -I http://127.0.0.1:3005
curl -I http://127.0.0.1:3006
curl -I http://127.0.0.1:3007
# All nodes should return HTTP 307 (Redirect to /auth/login)

# 4. View real-time logs across all nodes
pm2 logs
```

### Restarting / Reloading Clusters
```bash
# Zero-downtime hot-reload of all 4 instances
pm2 reload ecosystem.config.js

# Complete restart of all 4 instances
pm2 restart ecosystem.config.js
```

---

## ✅ System Readiness Checklist

- [x] Clustered ports `3001`, `3005`, `3006`, and `3007` configured in `ecosystem.config.js`
- [x] Nginx configuration updated with `upstream` pool and proxy forwarding
- [x] Connection pooling set to `connection_limit=20` in `.env.local` to protect database
- [x] Git deployment commands updated to reload the PM2 ecosystem instead of a single process

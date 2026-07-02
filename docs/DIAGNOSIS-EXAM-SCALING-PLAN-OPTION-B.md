# Infrastructure Scaling Plan: PM2 Multi-Port + Nginx Upstream
## 4-Instance Clustered Next.js ERP Frontend Deployment (`smartuplearning.net`)

This plan details the implementation steps to scale the Next.js ERP frontend (`smartup-erp`) from a single PM2 process running on port `3001` to 4 separate instances running on ports `3001`, `3005`, `3006`, and `3007`. Traffic will be load balanced by the Nginx reverse proxy using the `least_conn` algorithm.

---

## 🏗️ Architectural Topology

```
                       Internet
                          │
                          ▼
                  ┌───────────────┐
                  │ Cloudflare CDN│ (DNS proxy ON)
                  └───────┬───────┘
                          │ HTTPS (Cloudflare Full Mode)
                          ▼
             ┌─────────────────────────┐
             │ Nginx (76.13.244.60)    │
             │ Upstream Load Balancer  │
             └────────────┬────────────┘
                          │ 
         ┌────────────────┼────────────────┬────────────────┐
         │ (least_conn)   │ (least_conn)   │ (least_conn)   │ (least_conn)
         ▼                ▼                ▼                ▼
   ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
   │ Next.js 1 │    │ Next.js 2 │    │ Next.js 3 │    │ Next.js 4 │
   │ Port 3001 │    │ Port 3005 │    │ Port 3006 │    │ Port 3007 │
   │ (PM2 erp1)│    │ (PM2 erp2)│    │ (PM2 erp3)│    │ (PM2 erp4)│
   └─────┬─────┘    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
         └────────────────┼────────────────┼────────────────┘
                          ▼
                 ┌──────────────────┐
                 │ PostgreSQL DB    │ (smartup_offline)
                 │ max_conn = 400   │ (conn_limit = 20 each)
                 └──────────────────┘
```

---

## 🛠️ Step-by-Step Implementation Steps

### **Step 1: Create PM2 Ecosystem Configuration File**
Instead of using manual terminal commands to start multiple PM2 processes with inline environment variables, we will write a structured `ecosystem.config.js` configuration. This ensures that the processes are version-controlled and start consistently upon system reboot.

Create [ecosystem.config.js](file:///var/www/smartup-erp/ecosystem.config.js) in `/var/www/smartup-erp/` on the server:

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

---

### **Step 2: Add Database Connection Pool Limits**
To prevent our 4 clustered ERP instances (plus the existing 8 portal instances) from saturating the database's connection limit (`max_connections = 400`), we must specify a pool limit parameter in `.env.local`.

Edit `/var/www/smartup-erp/.env.local` on the server and update `STANDALONE_DATABASE_URL` by appending `&connection_limit=20`:
```env
STANDALONE_DATABASE_URL="postgresql://smartup_offline_admin:Smartup@123@localhost:5432/smartup_offline?schema=public&connection_limit=20"
```
*(With 4 instances drawing at most 20 connections each, our maximum DB connection draw for the exam app is capped at 80 connections, leaving plenty of headroom for the main portal and CRM).*

---

### **Step 3: Define Nginx Upstream Configuration**
Create `/etc/nginx/conf.d/upstream-erp.conf` on the server to declare our server pool. We will use the `least_conn` load balancing directive, which assigns connections to the backend instance with the fewest active connections.

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

---

### **Step 4: Modify Nginx Site Virtual Host Configuration**
Edit the virtual host file `/etc/nginx/sites-available/erp` on the server. Change the `proxy_pass` destination from the hardcoded port 3001 to our newly declared upstream block `smartup_erp_upstream`. 

Additionally, we use `$connection_upgrade` (defined globally in `/etc/nginx/conf.d/upstream-portal.conf`) to proxy WebSockets correctly.

```nginx
server {
    listen 127.0.0.1:8443 ssl;
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

### **Step 5: Shell Commands for Server Deployment**

Run the following commands on the server to execute this deployment:

```bash
# 1. SSH into the server (alias configured in Arjun's ssh config)
ssh smartup-portal

# 2. Go to the ERP application directory
cd /var/www/smartup-erp

# 3. Stop and delete the legacy PM2 process
pm2 delete smartup-erp

# 4. Start the 4 new clustered instances using our ecosystem config
pm2 start ecosystem.config.js

# 5. Save the PM2 process list to persist across server reboots
pm2 save

# 6. Test Nginx configuration file syntax
nginx -t

# 7. Reload Nginx to apply the load balancing upstream changes
systemctl reload nginx
```

---

## 📊 Verification Plan

Verify that the cluster is functioning properly using these check commands on the server:

1. **Verify PM2 Process Status:**
   ```bash
   pm2 list
   ```
   *Expected output: `smartup-erp-1`, `smartup-erp-2`, `smartup-erp-3`, and `smartup-erp-4` are all listed as **online**.*

2. **Verify Port Listening:**
   ```bash
   netstat -tulnp | grep -E '3001|3005|3006|3007'
   ```
   *Expected output: Four separate Node processes are listening on ports 3001, 3005, 3006, and 3007 respectively.*

3. **Query Nodes Directly:**
   Verify each local process is responding independently:
   ```bash
   curl -I http://127.0.0.1:3001
   curl -I http://127.0.0.1:3005
   curl -I http://127.0.0.1:3006
   curl -I http://127.0.0.1:3007
   ```
   *Expected output: All nodes return HTTP code 307 (redirect to login screen).*

4. **Live Log Monitoring:**
   ```bash
   pm2 logs
   ```
   Access `https://smartuplearning.net` in a browser and check that incoming requests are dynamically distributed between the 4 running log files.

---

## ↩️ Rollback Plan (In case of emergencies)

If any unexpected routing issue occurs, revert to the original single-instance setup in under 30 seconds using these commands on the server:

1. **Revert Nginx Configuration:**
   Restore the `erp` site configuration to proxy pass directly to port `3001`:
   ```bash
   nano /etc/nginx/sites-available/erp
   # Change proxy_pass back to: proxy_pass http://127.0.0.1:3001;
   systemctl reload nginx
   ```

2. **Revert PM2 Processes:**
   Delete the multi-process list and restart the single legacy app:
   ```bash
   pm2 delete smartup-erp-1 smartup-erp-2 smartup-erp-3 smartup-erp-4
   PORT=3001 pm2 start npm --name "smartup-erp" -- start
   pm2 save
   ```

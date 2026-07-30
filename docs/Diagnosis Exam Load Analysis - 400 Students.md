# Scalability & Load Analysis Report
## 400 Concurrent Student Diagnosis Exams on `smartuplearning.net`

> [!WARNING]
> **CRITICAL FINDING:** Reducing the student count to 400 concurrent students **will still crash the server** in its current configuration. 
> 
> While it reduces CPU load, it still breaches the hard connection limits configured in Nginx (384 maximum concurrent requests) and PostgreSQL (100 maximum connections). The exam site will fail to load for many students, and it will risk taking down the live production portal (`smartuplearning.online`).
>
> You must apply the configuration changes below to run the exam safely even for 400 students.

---

## 🖥️ Server Current State & Hardware Profile
We connected to the server (`76.13.244.60`) via SSH and inspected the active system parameters:
- **CPU Cores:** 4 Cores (Intel/AMD)
- **Total RAM:** 15 GiB (3.6 GiB Used, **11.4 GiB Free/Available**)
- **OS:** Ubuntu 24.04 LTS (Kernel with high file-descriptor limits `ulimit -n = 1,000,000`)
- **PM2 Node Processes:** 
  - `smartup-erp` (Next.js ERP): **1 instance** running in `fork` mode (Port 3001)
  - `smartup-portal` (LMS/LMS instances): **8 instances** running in `fork` mode (Port 3000)
  - `stibe-crm` & `stibe-worker`: **2 instances** (Port 3003)
- **PostgreSQL Database:** Hosts multiple databases on a single instance:
  - `smartup_offline` (Offline diagnosis exam database)
  - `smartup_portal` (Live production LMS database)
  - `stibe_crm` (CRM database)

---

## ⚠️ Bottlenecks at 400 Concurrent Students

### 1. Nginx Worker Connections (Severity: HIGH)
- **The Issue:** The Nginx reverse proxy configuration (`/etc/nginx/nginx.conf`) has `worker_connections` set to **768**. 
- **The Math:** Because Nginx acts as a reverse proxy, each HTTP request consumes **2 connections** (Client ↔ Nginx, and Nginx ↔ Next.js app).
- **The Limit:** The maximum concurrent requests Nginx can route is `768 / 2 = 384`.
- **The Impact:** When 400 students concurrently open the website, it exceeds Nginx's 384 concurrent request limit. The remaining students will see **502 Bad Gateway** or connection dropped errors instantly.

### 2. PostgreSQL Connection Starvation (Severity: CRITICAL)
- **The Issue:** The PostgreSQL global connection limit (`max_connections`) is set to **100**.
- **The Math:** 
  - `smartup-portal` runs 8 PM2 processes. With Prisma's default pool size of ~15, it can consume up to `8 * 15 = 120` connections.
  - `smartup-erp` runs 1 PM2 process (up to 15 connections).
- **The Impact:** Under normal traffic, the server is already close to the 100 connection limit. When 400 students start their exams:
  1. Next.js API routes will try to open new connections to write attempts and answers.
  2. PostgreSQL will refuse connections with `FATAL: sorry, too many clients already`.
  3. This will crash the exam app and **immediately crash the live main portal** (`smartuplearning.online`) for all regular users.

### 3. Node/Next.js CPU Bottleneck (Severity: HIGH)
- **The Issue:** The `smartup-erp` PM2 process is running as a **single fork instance**. Node.js is single-threaded, meaning it can only utilize **1 of the 4 CPU cores**.
- **The Impact:** Every question answer selection triggers a POST request to `/api/public-exam/attempt/[attemptId]/answers` which runs database transactions. When 400 students are clicking answers, the single-thread event loop will saturate to 80-90% CPU, causing request queuing and delays. Answers will hang on "Saving..." or throw network timeouts.

---

## 🛠️ Step-by-Step Fixes for 400 Students

### Step 1: Optimize PostgreSQL configuration
We need to allocate server memory to PostgreSQL and increase its concurrent connections.
1. SSH into the server and edit the postgres config:
   ```bash
   nano /etc/postgresql/18/main/postgresql.conf
   ```
2. Find and update the following settings:
   ```ini
   max_connections = 300             # Increase connection limit to accommodate all instances
   shared_buffers = 4GB              # 25% of server RAM for caching database blocks
   effective_cache_size = 11GB       # ~75% of server RAM
   work_mem = 16MB                   # Allocates RAM for sorting queries per-session
   ```
3. Restart PostgreSQL:
   ```bash
   systemctl restart postgresql
   ```

### Step 2: Optimize Nginx Worker Connections
1. Edit Nginx config:
   ```bash
   nano /etc/nginx/nginx.conf
   ```
2. Find the `events` block and update `worker_connections`:
   ```nginx
   events {
       worker_connections 4096;       # Safe high value to handle thousands of proxy streams
       multi_accept on;
   }
   ```
3. Test and reload Nginx:
   ```bash
   nginx -t && systemctl reload nginx
   ```

### Step 3: Run Next.js ERP in Cluster Mode (Utilize all CPU Cores)
Instead of running a single process, let's scale `smartup-erp` to run on 2 or 3 CPU cores:
1. Delete the current single PM2 instance:
   ```bash
   pm2 delete smartup-erp
   ```
2. Start it in PM2 Cluster Mode (automatically forks instances, sharing the port 3001 load balancer):
   ```bash
   cd /var/www/smartup-erp
   PORT=3001 pm2 start npm --name "smartup-erp" -i 3 -- start
   pm2 save
   ```
3. Check status:
   ```bash
   pm2 list
   ```

### Step 4: Configure connection limits in Next.js `.env.local`
To prevent the 3 ERP instances and 8 Portal instances from grabbing too many database connections:
1. Open `/var/www/smartup-erp/.env.local` on the server.
2. Edit the `STANDALONE_DATABASE_URL` by appending `&connection_limit=15`:
   ```env
   STANDALONE_DATABASE_URL="postgresql://smartup_offline_admin:Smartup@123@localhost:5432/smartup_offline?schema=public&connection_limit=15"
   ```
3. Restart PM2 processes:
   ```bash
   pm2 restart all
   ```

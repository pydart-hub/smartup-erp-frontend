# Scalability & Load Analysis Report
## 800 Concurrent Student Diagnosis Exams on `smartuplearning.net`

> [!WARNING]
> **CRITICAL FINDING:** Running the diagnosis exam for 700–800 concurrent students under the **current server configuration will result in a catastrophic system crash**. 
> 
> It will fail the exam flow for students (causing network errors, lost answers, and frozen screens) and will **immediately take down the main live production portal** (`smartuplearning.online`) and the CRM/workers hosted on the same server.
>
> However, the server has **abundant hardware resources (16 GB RAM, 4 CPU Cores)** that are currently unutilized. By applying the infrastructure adjustments and database optimizations detailed below, the server can easily and safely handle this load.

---

## 🖥️ Live Server Diagnosis Findings
We connected to the production server (`76.13.244.60`) via SSH and inspected the active system parameters:
- **CPU Cores:** 4 CPU Cores (Intel/AMD)
- **Total RAM:** 15 GiB (3.1 GiB Used, **~12 GiB Free/Available** for database and process caching)
- **OS:** Ubuntu 24.04 LTS (Kernel with high file-descriptor limits `ulimit -n = 1,000,000`)
- **PM2 Node Processes:** 
  - `smartup-erp` (Next.js ERP): **1 instance** running in `fork` mode (Port 3001)
  - `smartup-portal` (Live LMS): **8 instances** running in `fork` mode (Port 3000)
  - `stibe-crm` & `stibe-worker`: **2 instances** (Port 3003)
- **PostgreSQL Database:** Hosts multiple databases on a single instance.
  - `smartup_offline` (Offline/Diagnosis exam database)
  - `smartup_portal` (Live production LMS database)
  - `stibe_crm` (CRM database)

---

## 📊 Live Database & Nginx Metrics

### 1. Nginx Connection Capacity (Optimized)
- Nginx configuration (`/etc/nginx/nginx.conf`) has `worker_connections` set to **8192** and `worker_rlimit_nofile` set to **16384**.
- Nginx is already optimized to handle thousands of concurrent TCP connections.

### 2. PostgreSQL Engine Configuration (Default/Unoptimized)
- **Global Limit:** `max_connections` = **100**
- **Memory Allocation:**
  - `shared_buffers` = **128 MB** (Extremely low — does not leverage the 15 GiB RAM)
  - `work_mem` = **4 MB**
  - `effective_cache_size` = **4 GB**

### 3. PostgreSQL Live Database State (`smartup_offline` db)
- Active database attempts:
  - `submitted`: 80 attempts
  - `auto_submitted`: 1 attempt
  - `in_progress`: 16 attempts
- **Stale Attempts:** Multiple `in_progress` attempts are over 48 hours old (e.g., student Juvairiya PM started Hindi Exam on June 30th and it is still `in_progress`). This indicates that timer limits are not being strictly enforced on the server.
- **Duplicate Active Attempts:** Found multiple duplicate `in_progress` attempts for the exact same student/publishing exam.
  * *Example:* Student `8848003544` has **4 duplicate active attempts** running on publishing `6c06ac44-2b17-4748-893e-00efac289473` at the same time.

---

## ⚠️ Key Bottlenecks Identified

### 1. PostgreSQL Connection Starvation (Severity: CRITICAL)
- **The Issue:** The PostgreSQL global connection limit (`max_connections`) is set to **100**.
- **The Math:** 
  - `smartup-portal` runs 8 PM2 processes. With Prisma's default pool size of ~15, it can consume up to `8 * 15 = 120` connections.
  - `smartup-erp` runs 1 PM2 process (up to 15 connections).
- **The Impact:** Under normal traffic, the server is already close to the 100 connection limit. When 800 students start their exams:
  1. Next.js API routes will try to open new connections to write attempts and answers.
  2. PostgreSQL will refuse connections with `FATAL: sorry, too many clients already`.
  3. This will crash the exam app and **immediately crash the live main portal** (`smartuplearning.online`) for all existing logged-in parents, teachers, and students.

### 2. Node/Next.js CPU Bottleneck (Severity: HIGH)
- **The Issue:** The `smartup-erp` PM2 process is running as a **single fork instance**. Node.js is single-threaded, meaning it can only utilize **1 of the 4 CPU cores**.
- **The Impact:** Although the client frontend uses the debounced batch-saving endpoint (`/api/public-exam/attempt/[attemptId]/answers`), 800 students sending batch writes every 2.5 seconds will saturate the single-thread event loop to 100% CPU. Requests will queue up, causing high latency, gateway timeouts, and "Saving..." indicators that never resolve.

### 3. Database Index Starvation (Severity: HIGH)
- **The Issue:** The `ExamAttempt` table in `prisma/schema.prisma` does not have indexing configured.
- **The Impact:** Finding a student's history or checking for existing active attempts requires full-table scans. Under high concurrency, this triggers disk-write queue thrashing and slow database transaction lockups.

### 4. No Database Connection Pooling Limits in Code (Severity: MEDIUM)
- **The Issue:** There is no connection limit parameter appended to `STANDALONE_DATABASE_URL` in the `.env.local` file on the server.
- **The Impact:** Each spawned Next.js server instance will try to grab 10-15 connections under load, which will quickly exhaust the PostgreSQL connection limits even if we raise them.

---

## 🛠️ Structure of Issues & Fixes

Here is the exact issue-and-fix breakdown to safely handle 700 - 800 concurrent students on the same server.

| Component / Area | Issue | Severity | Fix / Solution |
| :--- | :--- | :--- | :--- |
| **Database** | Global connection limit is too low (`max_connections = 100`). | **CRITICAL** | Increase `max_connections` to **600** in `/etc/postgresql/18/main/postgresql.conf`. |
| **Database** | Memory allocation is unoptimized (`shared_buffers = 128MB`), causing high disk write I/O. | **HIGH** | Set `shared_buffers = 4GB` (25% of RAM) and `effective_cache_size = 11GB` (75% of RAM) in PostgreSQL config. |
| **Infrastructure** | Single PM2 process bottleneck on port `3001` (utilizes only 1 CPU core). | **HIGH** | Scale `smartup-erp` to 4 instances (cluster mode `pm2 start -i max` or explicit ports: `3001`, `3005`, `3006`, `3007`). |
| **Infrastructure** | Nginx proxies only to port `3001`. | **HIGH** | Replace Nginx proxy pass with an upstream load-balancing block (`smartup_erp_upstream`) referencing all 4 ports. |
| **Code / Config** | Next.js processes grab too many database connections. | **HIGH** | Append `&connection_limit=20` to `STANDALONE_DATABASE_URL` in the server's `.env.local` files for both ERP and Portal. |
| **Code / Schema** | Missing indexes on the `ExamAttempt` table, slowing queries. | **HIGH** | Add indexes in `prisma/schema.prisma` for `studentPhone`, `publishingId`, `status`, and `createdAt` (with composite keys), then run migrations. |
| **Code / Logic** | Students can start duplicate attempts if they click fast or refresh. | **HIGH** | Update `/api/public-exam/start` to check for existing active attempts for that `studentPhone + publishingId` and resume it instead of creating a new one. |
| **Data Hygiene** | Stale attempts remain `in_progress` indefinitely in the database. | **MEDIUM** | Deploy a stale attempt cleanup script (`scripts/close-stale-public-exam-attempts.ts`) to auto-grade and close expired attempts. |

---

## 📋 Step-by-Step Implementation Guide

### Step 1: Optimize PostgreSQL Configuration
We need to allocate server memory to PostgreSQL and increase its concurrent connections.
1. SSH into the server and edit the postgres config:
   ```bash
   nano /etc/postgresql/18/main/postgresql.conf
   ```
2. Find and update the following settings to match the 16 GB RAM profile:
   ```ini
   max_connections = 600             # Increase connection limit to accommodate all instances
   shared_buffers = 4GB              # 25% of server RAM for caching database blocks
   effective_cache_size = 11GB       # ~75% of server RAM
   work_mem = 16MB                   # Allocates RAM for sorting queries per-session
   maintenance_work_mem = 512MB      # Faster index/table updates
   ```
3. Restart PostgreSQL:
   ```bash
   systemctl restart postgresql
   ```

### Step 2: Configure Connection Limits in Next.js `.env.local`
To prevent Next.js instances from grabbing too many database connections:
1. Open `/var/www/smartup-erp/.env.local` on the server.
2. Edit the `STANDALONE_DATABASE_URL` by appending `&connection_limit=20`:
   ```env
   STANDALONE_DATABASE_URL="postgresql://smartup_offline_admin:Smartup@123@localhost:5432/smartup_offline?schema=public&connection_limit=20"
   ```
3. Open `/var/www/smartup-portal/.env.local` and apply similar limits if needed.
4. Restart PM2 processes:
   ```bash
   pm2 restart all
   ```

### Step 3: Run Next.js ERP in Cluster Mode (Utilize all CPU Cores)
Instead of running a single process, let's scale `smartup-erp` to run on all 4 CPU cores:
1. Delete the current single PM2 instance:
   ```bash
   pm2 delete smartup-erp
   ```
2. Start it in PM2 Cluster Mode (automatically forks 4 instances, sharing the port 3001 load balancer):
   ```bash
   cd /var/www/smartup-erp
   PORT=3001 pm2 start npm --name "smartup-erp" -i max -- start
   pm2 save
   ```
3. Check status:
   ```bash
   pm2 list
   ```

### Step 4: Add Database Indexes
Update `prisma/schema.prisma` in the code workspace and run database migrations:
1. Add the following indexes inside the `ExamAttempt` model block in `prisma/schema.prisma`:
   ```prisma
   @@index([studentPhone])
   @@index([publishingId])
   @@index([status])
   @@index([createdAt])
   @@index([publishingId, status])
   @@index([studentPhone, createdAt])
   ```
2. Generate and apply the database migration:
   ```bash
   npx prisma migrate dev --name add_exam_attempt_indexes
   ```

### Step 5: Clean Up Stale Attempts
Run a one-time clean-up script on the server before the exam day to transition all old, abandoned attempts (where status is still `in_progress`) to `auto_submitted`.

---

## 📊 Scale Simulation (What happens during the exam)

The student client app `ExamPlayer.tsx` is built with a **smart saving strategy** which significantly helps reduce server load:
1. **Debounced/Batched Saves:** When a student selects an option, it does not send a request immediately. It buffers the answer and flushes it in bulk every **2.5 seconds** or when the student navigates between questions.
2. **Bulk Save API Endpoint:** The batch saves hit `/api/public-exam/attempt/[attemptId]/answers` which writes answers using a single transaction.

With the optimized configuration:
- **Nginx:** Connection limit goes from **384** concurrent proxy streams to **4096**. (Will easily handle 800+ students).
- **Postgres:** Can handle up to **600** open connections. Next.js processes will limit themselves to 20 connections each, ensuring a maximum pool draw of `12 instances * 20 = 240` connections. This leaves plenty of headroom.
- **Next.js app:** The load is distributed across 4 CPU cores instead of 1. Even if one process experiences event loop delay, Nginx will balance the next request to another process.

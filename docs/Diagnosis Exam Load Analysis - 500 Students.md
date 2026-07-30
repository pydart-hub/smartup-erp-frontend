# Scalability & Load Analysis Report
## 500 Concurrent Student Diagnosis Exams on `smartuplearning.net`

> [!WARNING]
> **CRITICAL VERDICT:** Running the diagnosis exam for 500 concurrent students under the **current server configuration will likely result in a system crash or extreme degradation**.
> 
> While the server has plenty of hardware resources (16 GB RAM, 4 CPU Cores), the application is currently bottlenecked by running a **single PM2 process** (using only 1 CPU core) and the database is bottlenecked by a **complete lack of indexes** on the `ExamAttempt` table.
> 
> A synchronized burst of 500 students logging in and starting the exam at the same time will overload the single-threaded Node.js event loop and saturate PostgreSQL with full-table scans. This will cause the exam site to freeze (returning 502/504 gateway errors) and **risk taking down the live production portal** (`smartuplearning.online`) hosted on the same server.
> 
> Fortunately, since the server has unutilized resources, you can easily make the server 500-student-ready by applying the infrastructure adjustments, database indexing, and PM2 clustering detailed below.

---

## 🖥️ Live Server Current State & Hardware Profile
We connected to the production server (`76.13.244.60`) via SSH and inspected the active system parameters:
- **CPU Cores:** 4 CPU Cores (Intel/AMD)
- **Total RAM:** 15 GiB (3.1 GiB Used, **~12 GiB Free/Available** for database and process caching)
- **OS:** Ubuntu 24.04 LTS (Kernel with high file-descriptor limits `ulimit -n = 1,000,000`)
- **PM2 Node Processes:** 
  - `smartup-erp` (Next.js ERP serving `/exam-site`): **1 instance** running in `fork` mode (Port 3001)
  - `smartup-portal` (Live LMS): **8 instances** running in `fork` mode (Port 3000)
  - `stibe-crm` & `stibe-worker`: **2 instances** (Port 3003)
- **PostgreSQL Database:** Hosts multiple databases on a single instance:
  - `smartup_offline` (Offline/Diagnosis exam database)
  - `smartup_portal` (Live production LMS database)
  - `stibe_crm` (CRM database)

---

## 📊 Live Database & Nginx Metrics

### 1. Nginx Connection Capacity (Optimized ✅)
- Nginx configuration (`/etc/nginx/nginx.conf`) has `worker_connections 8192` and `worker_rlimit_nofile 16384`.
- Nginx is already optimized to handle thousands of concurrent TCP connections.

### 2. PostgreSQL Configuration (Default/Unoptimized ⚠️)
- **Global Limit:** `max_connections` = **400** (Current live setting is decent, but can be saturated if no connection pool limits are set in application configurations).
- **Memory Allocation:**
  - `shared_buffers` = **4GB** (Already optimized to 25% of RAM ✅)
  - `work_mem` = **16MB** (Already optimized ✅)
  - `effective_cache_size` = **2GB** (Low — does not leverage the 15 GiB RAM. Should be set to ~11GB)

### 3. PostgreSQL Indexes (Critical Bottleneck ❌)
- We queried the indexes on the `ExamAttempt` table in `smartup_offline` database.
- **Only 1 index exists:** The primary key index on `id` (`ExamAttempt_pkey`).
- **No indexes exist** for `studentPhone`, `publishingId`, `status`, or `createdAt`. Lookups on these fields require full-table scans.

---

## ⚠️ Does 500 Concurrent Students Affect the Server & Exam Flow?

Yes. If 500 students attend the exam simultaneously, it will have a severe impact on both the server infrastructure and the exam flow for students.

### 1. Impact on the Server
* **CPU Core Starvation:** Node.js is single-threaded. Because `smartup-erp` runs as a single PM2 process on port 3001, all 500 concurrent requests (login, load exam, autosave, submit) are queued on **1 CPU core**. That core will immediately hit 100% utilization, while the other 3 CPU cores remain idle.
* **Cascading Crash of Production Portal:** Because the live database instance is shared, when 500 students make concurrent database queries that trigger full table scans (due to missing indexes), PostgreSQL CPU utilization will hit 100%. This will lock up the database server, causing the main production portal (`smartuplearning.online` used by parents, teachers, and admins) to experience extreme slowdowns or return database connection timeout errors.

### 2. Impact on the Exam Flow
* **Cloudflare 504 Gateway Timeouts / Nginx 502 Bad Gateway:** When 500 students hit the login page and click "Start Exam" in the same 2-3 minute window, the single-threaded Node.js server won't be able to process the requests fast enough. The connection queue will overflow, and students will see browser errors.
* **Saving Errors and Frozen Screens:** Although the client frontend utilizes a **debounced batch autosave** (writing answers in bulk every 2.5 seconds to `/api/public-exam/attempt/[attemptId]/answers` using a transaction), under 100% CPU load, these network requests will time out. Students will see the "Saving..." indicator freeze or turn into "Error", causing high anxiety and potential loss of unsaved progress if they reload.
* **Duplicate Attempt Creation:** When students experience lag, they will naturally double-click the "Start Exam" button or refresh the page. Even though the API checks for existing attempts, concurrent requests running transactions without database indexes will suffer from race conditions and create duplicate `in_progress` attempts for the same student.

---

## 🛠️ Structure of Issues & Fixes

Below is the complete structured audit showing the bottlenecks, their severity, the impact on 500 concurrent students, and the required fixes.

| Component / Area | Issue | Severity | Impact on 500 Students | Fix / Solution |
| :--- | :--- | :--- | :--- | :--- |
| **Infrastructure** | Single PM2 process bottleneck on port `3001` (only utilizing 1 of 4 CPU cores). | **CRITICAL** | Event loop freezes; students get 502/504 gateway errors when logging in or starting the exam. | Scale `smartup-erp` to 4 instances using PM2 cluster mode or explicit ports. |
| **Database** | Missing indexes on the `ExamAttempt` table in PostgreSQL. | **CRITICAL** | Every lookup of student attempts triggers a full-table scan, locking up PostgreSQL and slowing down the whole system. | Add database indexes in `prisma/schema.prisma` for `studentPhone`, `publishingId`, `status`, and `createdAt`. |
| **Code / Config** | No database connection pool limits configured in Next.js. | **HIGH** | Multiple Next.js instances can request too many connections, exhausting the 400 global connections limit. | Append `&connection_limit=20` to `STANDALONE_DATABASE_URL` in the `.env.local` file for both ERP and Portal on the server. |
| **Database** | Memory allocation underutilized (`effective_cache_size = 2GB`). | **MEDIUM** | High disk read/write overhead because database caching is constrained. | Increase `effective_cache_size` to **11GB** (75% of server RAM) in PostgreSQL configuration. |
| **Data Hygiene** | Stale attempts remain `in_progress` indefinitely in the database. | **MEDIUM** | Pollutes database queries and slows down lookup speeds during student login checks. | Deploy and run a stale attempt cleanup script to auto-submit and close expired attempts. |

---

## 📋 Step-by-Step Implementation Guide

To make the server fully ready for the 500-student exam, follow these steps:

### Step 1: Add Database Indexes
We need to define indexes in the Prisma schema to speed up attempt queries and prevent full table scans.
1. Open the local `prisma/schema.prisma` file and add the following indexes inside the `model ExamAttempt` block:
   ```prisma
   model ExamAttempt {
     // ... existing fields ...

     @@index([studentPhone])
     @@index([publishingId])
     @@index([status])
     @@index([createdAt])
     @@index([publishingId, status])
     @@index([studentPhone, createdAt])
   }
   ```
2. Generate and apply the migration on the server:
   ```bash
   npx prisma migrate dev --name add_exam_attempt_indexes
   ```

### Step 2: Run Next.js ERP in Cluster Mode (Utilize all 4 CPU Cores)
We will configure PM2 to balance incoming traffic across all CPU cores.
1. SSH into the server and delete the current single-instance ERP process:
   ```bash
   pm2 delete smartup-erp
   ```
2. Start it in PM2 Cluster Mode using the maximum available cores:
   ```bash
   cd /var/www/smartup-erp
   PORT=3001 pm2 start npm --name "smartup-erp" -i max -- start
   pm2 save
   ```
3. Run `pm2 list` to verify that 4 processes named `smartup-erp` are running online.

### Step 3: Configure Connection Limits in `.env.local`
To prevent the clustered Next.js instances from exhausting PostgreSQL's connections:
1. Open `/var/www/smartup-erp/.env.local` on the server.
2. Edit `STANDALONE_DATABASE_URL` to append the pool size:
   ```env
   STANDALONE_DATABASE_URL="postgresql://smartup_offline_admin:Smartup@123@localhost:5432/smartup_offline?schema=public&connection_limit=20"
   ```
3. Restart the PM2 processes to apply the limit:
   ```bash
   pm2 restart all
   ```

### Step 4: Optimize PostgreSQL Memory Settings
1. Open the PostgreSQL config file on the server:
   ```bash
   nano /etc/postgresql/18/main/postgresql.conf
   ```
2. Update the `effective_cache_size` to optimize memory lookup:
   ```ini
   effective_cache_size = 11GB
   ```
3. Restart PostgreSQL:
   ```bash
   systemctl restart postgresql
   ```

### Step 5: Clean Up Stale Attempts
Create and run a script on the server before the exam day to find and close old, abandoned `in_progress` attempts, setting their status to `auto_submitted`.

# Scalability & Load Analysis Report
## 800 Concurrent Student Diagnosis Exams on `smartuplearning.net`

> [!WARNING]
> **CRITICAL FINDING:** Running the diagnosis exam for 700–800 concurrent students in the **current server configuration will result in a catastrophic system crash**. It will not only fail the exam flow for students but will also take down the main live production portal (`smartuplearning.online`) and other business apps (`stibe-crm`) hosted on the same server.
>
> However, the server has **plenty of hardware resources (16 GB RAM, 4 CPU Cores)** that are currently unutilized. By applying the configurations detailed below, the server can easily and safely handle this load.

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

## ⚠️ Key Bottlenecks Identified

### 1. Nginx Worker Connection Starvation (Severity: CRITICAL)
- **The Issue:** The Nginx reverse proxy configuration (`/etc/nginx/nginx.conf`) has `worker_connections` set to **768**. 
- **The Math:** Because Nginx operates as a reverse proxy, each HTTP request consumes **2 connections** (Client ↔ Nginx, and Nginx ↔ Next.js app).
- **The Limit:** The maximum concurrent requests Nginx can route is `768 / 2 = 384`.
- **The Impact:** When 800 students concurrently open the website, at least half will receive **502 Bad Gateway** or connection dropped errors instantly. They will not even be able to load the login/landing screen.

### 2. PostgreSQL Connection Starvation (Severity: CRITICAL)
- **The Issue:** The PostgreSQL global connection limit (`max_connections`) is set to **100**.
- **The Math:** 
  - `smartup-portal` runs 8 PM2 processes. With Prisma's default pool size of ~15, it can consume up to `8 * 15 = 120` connections.
  - `smartup-erp` runs 1 PM2 process (up to 15 connections).
  - Background workers and other apps consume another 10–15 connections.
- **The Impact:** Under normal traffic, the server is already close to the 100 connection limit. When 800 students start their exams:
  1. Next.js API routes will try to open new connections to write attempts and answers.
  2. PostgreSQL will refuse connections with `FATAL: sorry, too many clients already`.
  3. This will crash the exam app and **immediately crash the live main portal** (`smartuplearning.online`) for all existing logged-in parents, teachers, and students.

### 3. Node/Next.js CPU Bottleneck (Severity: HIGH)
- **The Issue:** The `smartup-erp` PM2 process is running as a **single fork instance**. Node.js is single-threaded, meaning it can only utilize **1 of the 4 CPU cores**.
- **The Impact:** Every question answer selection triggers a POST request to `/api/public-exam/attempt/[attemptId]/answers` which runs database transactions. When 800 students are clicking answers, the single-thread event loop will saturate to 100% CPU, causing severe request queuing and delays. Answers will hang on "Saving..." or throw network timeouts.

### 4. PostgreSQL Memory Underutilization (Severity: MEDIUM)
- **The Issue:** PostgreSQL settings are unoptimized for the server's 16 GB RAM:
  - `shared_buffers` = **128 MB** (Default — too low for database caching).
  - `work_mem` = **4 MB** (Default — slows down complex queries/sorts).
- **The Impact:** High disk write I/O. When 800 attempts write answers concurrently, Postgres will thrash the disk write queue instead of caching in RAM, causing responses to lag.

---

## 🛠️ Step-by-Step Fixes (Action Plan)

### Step 1: Optimize PostgreSQL configuration
We need to allocate server memory to PostgreSQL and increase its concurrent connections.
1. SSH into the server and edit the postgres config:
   ```bash
   nano /etc/postgresql/18/main/postgresql.conf
   ```
   *(Verify your postgres configuration path using `psql -c "show config_file;"` if needed)*
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

### Step 2: Optimize Nginx Worker Connections
1. Edit Nginx config:
   ```bash
   nano /etc/nginx/nginx.conf
   ```
2. Find the `events` block and update `worker_connections`:
   ```nginx
   events {
       worker_connections 8192;       # Safe high value to handle thousands of proxy streams
       multi_accept on;
   }
   ```
3. Test and reload Nginx:
   ```bash
   nginx -t && systemctl reload nginx
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
   *(You should see 4 active instances of `smartup-erp` balanced across all cores)*

### Step 4: Configure connection limits in Next.js `.env.local`
To prevent the 4 ERP instances and 8 Portal instances from grabbing too many database connections and exceeding the new PostgreSQL `max_connections` limit:
1. Open `/var/www/smartup-erp/.env.local` on the server.
2. Edit the `STANDALONE_DATABASE_URL` by appending `&connection_limit=20`:
   ```env
   STANDALONE_DATABASE_URL="postgresql://smartup_offline_admin:Smartup@123@localhost:5432/smartup_offline?schema=public&connection_limit=20"
   ```
3. Do the same for the main portal `.env.local` if needed, then restart PM2 processes:
   ```bash
   pm2 restart all
   ```

---

## 📊 Scale Simulation (What happens during the exam)

The student client app `ExamPlayer.tsx` is built with a **smart saving strategy** which significantly helps reduce server load:
1. **Debounced/Batched Saves:** When a student selects an option, it does not send a request immediately. It buffers the answer and flushes it in bulk every **2.5 seconds** or when the student navigates between questions.
2. **Bulk Save API Endpoint:** The batch saves hit `/api/public-exam/attempt/[attemptId]/answers` which writes answers using a single transaction.

With the optimized configuration:
- **Nginx:** Connection limit goes from **384** concurrent proxy streams to **4096**. (Will easily handle 800+ students).
- **Postgres:** Can handle up to **600** open connections. Next.js processes will limit themselves to 20 connections each, ensuring a maximum pool draw of `12 instances * 20 = 240` connections. This leaves plenty of headroom.
- **Next.js app:** The load is distributed across 4 CPU cores instead of 1. Even if one process experiences event loop delay, Nginx will balance the next request to another process.

---

## 📋 Recommended Testing Checklist (Run 2 days before the exam)
- [ ] **Verify Connection Limits:** Ensure you can load the landing page and start/submit a mock attempt after applying the changes.
- [ ] **Check Postgres Live Logs:** Run `ssh smartup-portal "tail -f /var/log/postgresql/postgresql-18-main.log"` while doing a test run to check for any slow queries or connection warnings.
- [ ] **Optional Load Test:** Run a light load test using a tool like ApacheBench (`ab`) or `autocannon` to simulate 200 concurrent users logging in:
  ```bash
  npx autocannon -c 100 -d 10 https://smartuplearning.net/api/public-exam/active?classLevel=9
  ```
  Check the response latency and ensure no 502/500 errors are returned.

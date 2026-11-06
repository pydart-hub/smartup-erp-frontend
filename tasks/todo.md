# Task: Push to Git & Deploy to Clustered Server

## Status: IN PROGRESS

### 1. Plan & Objectives
- [x] Study Server Configuration docs (`Server Configuration.md` & `Server Configuration - Clustered.md`).
- [x] Verify local codebase with TypeScript type check (`npx tsc --noEmit`).
- [ ] Verify local Next.js production build (`npm run build`).
- [ ] Review pending git changes and commit clean changes to branch `main`.
- [ ] Push commits to remote git repository (`origin main`).
- [ ] Connect to server (`76.13.244.60` / `smartup-portal`) and trigger clustered deployment script (`/var/www/smartup-erp/scripts/deploy.sh`).
- [ ] Verify server health: PM2 cluster status (4 instances: 3001, 3005, 3006, 3007), Nginx status, and live response from `https://smartuplearning.net`.

### 2. Execution Log
- **Documentation Reviewed**: Clustered 4-instance PM2 architecture (ports 3001, 3005, 3006, 3007) load-balanced via Nginx `least_conn`. Deployment uses `/var/www/smartup-erp/scripts/deploy.sh`.
- **Type Check**: Completed with 0 errors (`npx tsc --noEmit`).
- **Local Build**: Running...

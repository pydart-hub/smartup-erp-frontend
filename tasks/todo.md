# Task: Push to Git and Deploy Clustered SmartUp ERP to Server

## Status: IN PROGRESS

### 1. Plan & Objectives
- [x] 1. Study deployment documentation (`Server Configuration - Clustered.md` and `Server Configuration.md`).
- [x] 2. Verify local build / TypeScript compilation (`npx tsc --noEmit`) to ensure clean production build.
- [/] 3. Review unstaged and untracked changes, stage appropriate files, and commit to `main` with conventional commit message.
- [ ] 4. Push commit(s) to remote Git repository (`origin/main`).
- [ ] 5. Connect to production server `smartup-portal` (`76.13.244.60`) via SSH and trigger `/var/www/smartup-erp/scripts/deploy.sh`.
- [ ] 6. Verify PM2 cluster status across all 4 instances (`smartup-erp-1`, `smartup-erp-2`, `smartup-erp-3`, `smartup-erp-4`).
- [ ] 7. Verify HTTP responses and public availability on `https://smartuplearning.net`.
- [ ] 8. Document results and finalize review.

### 2. Deployment Architecture Reference
- **Server:** `76.13.244.60` (alias `smartup-portal`, user `root`)
- **Directory:** `/var/www/smartup-erp`
- **Cluster Instances:** 4 nodes (`smartup-erp-1` :3001, `smartup-erp-2` :3005, `smartup-erp-3` :3006, `smartup-erp-4` :3007)
- **Upstream:** Nginx `smartup_erp_upstream` (`least_conn`)
- **Domain:** `smartuplearning.net` (Cloudflare Proxy -> Origin SSL)

### 3. Review & Results
*(Pending execution)*

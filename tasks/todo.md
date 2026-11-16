# Task: Deploy SmartUp ERP Clustered Service to Production Server

## Status: IN_PROGRESS

### 1. Plan & Objectives
Study the clustered server configuration documentation and execute a safe, zero-downtime deployment:
- Study `docs/Server Configuration - Clustered.md` and `docs/Server Configuration.md`.
- Verify TypeScript integrity (`npx tsc --noEmit`).
- Stage and commit the Frappe API POST filter fix and fee follow-up improvements.
- Push commit to remote `origin/main` on GitHub.
- Trigger remote safe deployment script `bash /var/www/smartup-erp/scripts/deploy.sh` on `smartup-portal` (`76.13.244.60`).
- Verify PM2 cluster status (instances `smartup-erp-1` through `smartup-erp-4` on ports 3001, 3005, 3006, 3007).
- Verify end-to-end health check on localhost ports and `https://smartuplearning.net`.

### 2. Checkable Items
- [x] 1. Study `Server Configuration - Clustered.md` and `Server Configuration.md`.
- [/] 2. Verify TypeScript integrity (`npx tsc --noEmit`).
- [ ] 3. Review git status and stage all modified files (`git add .`).
- [ ] 4. Commit changes with semantic commit message.
- [ ] 5. Push commit to remote `origin/main`.
- [ ] 6. Execute `bash /var/www/smartup-erp/scripts/deploy.sh` on `smartup-portal` via SSH.
- [ ] 7. Verify PM2 cluster status (`pm2 list`) and node ports (3001, 3005, 3006, 3007).
- [ ] 8. Verify HTTP responses on all 4 cluster nodes and public domain `https://smartuplearning.net`.
- [ ] 9. Document results and mark review complete.

### 3. Review & Verification
*(Pending deployment execution and health checks)*

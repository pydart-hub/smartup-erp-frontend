# Task: Push to Git and Deploy Clustered SmartUp ERP on Production Server

## Status: IN_PROGRESS

### 1. Plan & Objectives
Study the clustered server configuration documentation and execute a safe, zero-downtime deployment:
- Study `docs/Server Configuration - Clustered.md` and `docs/Server Configuration.md`.
- Verify local code integrity and run Next.js build validation.
- Stage and commit all pending changes with a descriptive commit message.
- Push changes to GitHub repository (`origin/main`).
- Connect to the production server (`smartup-portal` / `76.13.244.60`).
- Execute safe deployment script: `bash /var/www/smartup-erp/scripts/deploy.sh`.
- Run post-deployment verification across all 4 clustered instances (`smartup-erp-1` through `smartup-erp-4`) and public domain `smartuplearning.net`.

### 2. Checkable Items
- [x] 1. Study `Server Configuration - Clustered.md` and `Server Configuration.md`.
- [x] 2. Verify TypeScript integrity (`npx tsc --noEmit`).
- [ ] 3. Run local build check (`npm run build`) to ensure zero compile or runtime syntax issues.
- [ ] 4. Review git diff and stage changes (`git add .`).
- [ ] 5. Commit changes with clean semantic commit message.
- [ ] 6. Push commit to remote `origin/main`.
- [ ] 7. Execute `bash /var/www/smartup-erp/scripts/deploy.sh` on the server via SSH.
- [ ] 8. Verify PM2 cluster status (`pm2 list`) and node ports (3001, 3005, 3006, 3007).
- [ ] 9. Verify HTTP responses locally on server and via public domain `https://smartuplearning.net`.
- [ ] 10. Document results and mark review complete.

### 3. Review & Verification
*(Pending deployment execution and health checks)*

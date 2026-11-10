# Task: Git Push and Production Server Deployment

## Status: IN PROGRESS

### 1. Plan & Objectives
Study server documentation (`docs/Server Configuration - Clustered.md` & `docs/Server Configuration.md`), prepare pending changes, build & verify locally, push to remote git repository (`origin main`), and trigger the clustered deployment on the server (`ssh smartup-portal "bash /var/www/smartup-erp/scripts/deploy.sh"`).

### 2. Steps to Execute
- [x] 1. Typecheck and verify project locally (`npx tsc --noEmit`).
- [ ] 2. Run local Next.js production build (`npx next build`) to ensure zero build errors before pushing.
- [ ] 3. Check git status, stage, and commit changes with a descriptive message.
- [ ] 4. Push commit to remote `origin main`.
- [ ] 5. SSH to `smartup-portal` (`root@76.13.244.60`) and execute `/var/www/smartup-erp/scripts/deploy.sh`.
- [ ] 6. Verify clustered deployment status on the server (PM2 list, port checks for 3001, 3005, 3006, 3007, and HTTP response check).

### 3. Review & Verification
- Pending deployment verification.

#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

# Define variables
PROJECT_DIR="/var/www/smartup-erp"
BRANCH="main"

echo "========================================================"
echo "🚀 Starting Deployment for SmartUp ERP Clustered Service"
echo "========================================================"

# Step 1: Navigate to project directory
echo "📂 [1/6] Navigating to project directory: ${PROJECT_DIR}..."
cd "${PROJECT_DIR}"

# Step 2: Fetch and pull latest changes
echo "📥 [2/6] Fetching latest changes from git (branch: ${BRANCH})..."
git fetch origin "${BRANCH}"
git reset --hard "origin/${BRANCH}"

# Step 3: Install npm dependencies
echo "📦 [3/6] Installing dependencies..."
npm install

# Step 4: Generate database client bindings (Prisma)
echo "💎 [4/6] Generating Prisma Client..."
npx prisma generate

# Step 5: Build Next.js project
echo "🛠️ [5/6] Building Next.js production bundle..."
npm run build

# Step 6: Reload PM2 cluster and Nginx
echo "🔄 [6/6] Reloading PM2 instances & web server..."
if pm2 list | grep -q "smartup-erp-"; then
    echo "⚡ Found running cluster. Performing zero-downtime reload..."
    pm2 reload ecosystem.config.js
else
    echo "⚡ Starting cluster for the first time..."
    pm2 start ecosystem.config.js
fi

# Save the PM2 list to persist across reboots
pm2 save

# Verify Nginx syntax and reload the server
if nginx -t; then
    echo "🌐 Nginx configuration is valid. Reloading Nginx..."
    systemctl reload nginx
else
    echo "⚠️ Nginx configuration check failed! Skipping Nginx reload."
    exit 1
fi

echo "========================================================"
echo "✅ SmartUp ERP Clustered Service Deployed Successfully!"
echo "========================================================"

#!/bin/bash
echo "Setting up database..."
sudo -u postgres psql -c "CREATE USER smartup_offline_admin WITH PASSWORD 'Smartup@123';" 2>/dev/null || echo "User may already exist."
sudo -u postgres psql -c "CREATE DATABASE smartup_offline OWNER smartup_offline_admin;" 2>/dev/null || echo "Database may already exist."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE smartup_offline TO smartup_offline_admin;"
echo "Database setup completed!"

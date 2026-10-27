#!/usr/bin/env bash
# Build and (re)deploy on the VPS. Run from the project root: bash deploy/deploy.sh
set -euo pipefail

echo "==> Backend"
cd backend
npm ci
npm run build
cd ..

echo "==> Frontend"
cd frontend
npm ci
npx ng build --configuration production
sudo mkdir -p /var/www/vivo-diwali
sudo rsync -a --delete dist/frontend/ /var/www/vivo-diwali/
cd ..

echo "==> Restart API"
pm2 startOrReload deploy/ecosystem.config.js
pm2 save
echo "Done."

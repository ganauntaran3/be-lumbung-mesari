#!/bin/bash
set -euo pipefail

echo "Step 1: Loading nvm..."
export NVM_DIR="$HOME/.nvm"
set +u
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
set -u

echo "Step 2: Installing Node 24..."
nvm install 24
nvm use 24

echo "Step 3: Checking Node version..."
NODE_VERSION=$(node -v)
echo "Using Node: $NODE_VERSION"
case "$NODE_VERSION" in
  v24*) echo "Node version OK" ;;
  *) echo "ERROR: Node 24 required, got $NODE_VERSION"; exit 1 ;;
esac

echo "Step 4: Pulling latest release..."
cd ~/apps/be-lumbung-mesari

git fetch --tags
git checkout $(git describe --tags --abbrev=0)

echo "Step 5: Installing dependencies..."
npm ci

echo "Step 6: Building application..."
npm run build

echo "Step 7: Running migrations..."
npx knex migrate:latest --env production

echo "Step 8: Starting or restarting PM2 process..."
if pm2 list | grep -q "lumbung-mesari"; then
  echo "Process found, restarting..."
  pm2 restart lumbung-mesari
else
  echo "Process not found, starting fresh..."
  pm2 start dist/main.js --name lumbung-mesari
fi

echo "Step 9: Saving PM2 processes..."
pm2 save

echo "Deploy completed successfully."

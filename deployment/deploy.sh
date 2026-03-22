#!/bin/bash
set -euo pipefail

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node 24 if not present, then use it
nvm install 24
nvm use 24

# POSIX-compatible Node version check
NODE_VERSION=$(node -v)
echo "Using Node: $NODE_VERSION"
case "$NODE_VERSION" in
  v24*) echo "Node version OK" ;;
  *) echo "ERROR: Node 24 required, got $NODE_VERSION"; exit 1 ;;
esac

cd ~/apps/be-lumbung-mesari

git fetch --tags
git checkout $(git describe --tags --abbrev=0)
npm ci
npm run build
npx knex migrate:latest --env production

# Start or restart PM2 process
if pm2 list | grep -q "lumbung-mesari"; then
  echo "Process found, restarting..."
  pm2 restart lumbung-mesari
else
  echo "Process not found, starting fresh..."
  pm2 start dist/main.js --name lumbung-mesari
fi

pm2 save

echo "Deploy completed successfully."

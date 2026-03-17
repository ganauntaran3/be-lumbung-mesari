#!/bin/bash
set -e

node -v 
if [ "$(node -v)" <= "v24.11.0" ]; then
    echo "Node version is less than v24.11.0"
    exit 1
fi

git pull origin main
npm ci
npm run build
npx knex migrate:latest --env production
pm2 restart lumbung-mesari

echo "Deploy completed successfully."

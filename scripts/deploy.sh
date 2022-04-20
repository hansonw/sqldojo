#!/bin/bash

set -e
git pull --rebase

export NODE_ENV=production

yarn prisma generate
yarn build

pkill -f https.js
nohup node scripts/https.js >> ~/sqldojo.log 2>&1 &

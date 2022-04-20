#!/bin/bash

set -e
git pull --rebase

yarn
export NODE_ENV=production
yarn build

pkill -f https.js
nohup node scripts/https.js >> ~/sqldojo.log 2>&1 &

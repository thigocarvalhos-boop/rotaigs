#!/bin/bash

# Validate DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set"
  exit 1
fi

# Sync Prisma schema (safer than migrate deploy for pre-existing Railway DBs)
npx prisma@6.4.1 db push

# Start the server
npm start

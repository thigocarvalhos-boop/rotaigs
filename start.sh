#!/bin/bash

# Validate DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set"
  exit 1
fi

# Run Prisma migrations with explicit logging
npx prisma@6.4.1 migrate deploy --verbose

# Start the server
npm start
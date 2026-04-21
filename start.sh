#!/bin/bash

# Validate DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set"
  exit 1
fi

# Start the server (production migrations are handled in server bootstrap)
npm start

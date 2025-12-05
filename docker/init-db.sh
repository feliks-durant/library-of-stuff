#!/bin/bash
set -e

echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h db -U postgres; do
  sleep 1
done

echo "PostgreSQL is ready. Running database migrations..."
npm run db:push

echo "Database initialization complete!"

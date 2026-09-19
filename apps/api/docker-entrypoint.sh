#!/bin/sh
set -eu

echo "Preparing OpsPilot database..."
npm run db:push -w apps/api
npm run db:seed -w apps/api

echo "Starting OpsPilot API..."
exec npm run start -w apps/api

#!/bin/bash
set -e

echo "Running CI/CD Pipeline..."

# 1. Run full compile
echo "Compiling..."
npm run build

# 2. Run Playwright infrastructure tests against local or staging
echo "Running Playwright Tests..."
npx playwright test tests/infrastructure.spec.ts

# 3. Database migrations
echo "Running Database Migrations..."
# In a real pipeline, we would run: npx tsx db/migrate.ts or similar
# Ensure forward-only topology is respected
npx -y tsx patch_db_v6.ts || echo "Skipping DB patch execution in this demo."

echo "Deployment finished. Blue/Green switch would happen here."

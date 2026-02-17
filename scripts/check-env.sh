# scripts/check-env.sh

#!/bin/bash

echo "🔍 Checking environment..."
echo ""

if [ -f .env ]; then
  ENV_NAME=$(grep VITE_ENVIRONMENT .env | cut -d '=' -f2)
  echo "Current environment: $ENV_NAME"
  
  if [ "$ENV_NAME" = "production" ]; then
    echo "⚠️  WARNING: You are in PRODUCTION!"
  elif [ "$ENV_NAME" = "staging" ]; then
    echo "🟡 You are in STAGING"
  else
    echo "🟢 You are in DEVELOPMENT"
  fi
else
  echo "❌ No .env file found!"
  echo "Run: npm run switch:dev"
fi
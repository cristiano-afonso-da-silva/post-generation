#!/bin/bash

# Script to extract Stripe webhook secret from stripe listen output
# Usage: ./setup-webhook-secret.sh

echo "🔍 Setting up Stripe webhook secret for local testing..."
echo ""
echo "Step 1: Run 'stripe listen --forward-to localhost:3000/api/stripe/webhook' in a separate terminal"
echo "Step 2: Look for the line that says: 'Ready! Your webhook signing secret is whsec_...'"
echo "Step 3: Copy the whsec_... value and paste it below:"
echo ""
read -p "Enter your webhook secret (whsec_...): " webhook_secret

if [[ -z "$webhook_secret" ]]; then
  echo "❌ No webhook secret provided. Exiting."
  exit 1
fi

if [[ ! "$webhook_secret" =~ ^whsec_ ]]; then
  echo "❌ Invalid webhook secret format. Should start with 'whsec_'"
  exit 1
fi

# Check if .env.local exists
if [[ ! -f ".env.local" ]]; then
  echo "⚠️  .env.local not found. Creating it..."
  touch .env.local
fi

# Update or add STRIPE_WEBHOOK_SECRET
if grep -q "STRIPE_WEBHOOK_SECRET" .env.local; then
  # Update existing entry
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|STRIPE_WEBHOOK_SECRET=.*|STRIPE_WEBHOOK_SECRET=$webhook_secret|" .env.local
  else
    # Linux
    sed -i "s|STRIPE_WEBHOOK_SECRET=.*|STRIPE_WEBHOOK_SECRET=$webhook_secret|" .env.local
  fi
  echo "✅ Updated STRIPE_WEBHOOK_SECRET in .env.local"
else
  # Add new entry
  echo "" >> .env.local
  echo "# Stripe Webhook Secret (from stripe listen)" >> .env.local
  echo "STRIPE_WEBHOOK_SECRET=$webhook_secret" >> .env.local
  echo "✅ Added STRIPE_WEBHOOK_SECRET to .env.local"
fi

echo ""
echo "🎉 Webhook secret configured!"
echo "📝 Current value: $webhook_secret"
echo ""
echo "⚠️  Don't forget to restart your Next.js dev server if it's running!"


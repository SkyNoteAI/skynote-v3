#!/bin/bash

# CloudNotes AI - Cloudflare Setup Script

set -e

echo "🚀 CloudNotes AI - Cloudflare Setup"
echo "=================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create it from .env.example"
    exit 1
fi

# Source environment variables
export $(cat .env | grep -v '^#' | xargs)

# Authenticate Wrangler
echo "📡 Authenticating with Cloudflare..."
wrangler login

# Create R2 bucket
echo "📦 Creating R2 bucket..."
wrangler r2 bucket create cloudnotes-dev-storage || echo "Bucket may already exist"

# Create D1 database
echo "🗄️ Creating D1 database..."
wrangler d1 create cloudnotes-db-dev || echo "Database may already exist"

# Get the database ID and update wrangler.toml
DB_ID=$(wrangler d1 list | grep cloudnotes-db-dev | awk '{print $2}')
if [ ! -z "$DB_ID" ]; then
    echo "📝 Database ID: $DB_ID"
    # Update wrangler.toml with the actual database ID
    sed -i.bak "s/database_id = \"your-database-id\"/database_id = \"$DB_ID\"/" wrangler.toml
fi

# Create Queue
echo "📨 Creating Queue..."
wrangler queues create note-processing-dev || echo "Queue may already exist"

# Create Dead Letter Queue
echo "💀 Creating Dead Letter Queue..."
wrangler queues create note-processing-dlq || echo "DLQ may already exist"

# Instructions for manual steps
echo ""
echo "✅ Automated setup complete!"
echo ""
echo "📋 Manual steps required:"
echo "1. Go to https://dash.cloudflare.com"
echo "2. Set up AutoRAG:"
echo "   - Navigate to AI > AutoRAG"
echo "   - Create a new instance"
echo "   - Link it to the R2 bucket 'cloudnotes-dev-storage'"
echo "   - Copy the instance ID to your .env file"
echo ""
echo "3. Configure Cloudflare Access:"
echo "   - Navigate to Zero Trust > Access > Applications"
echo "   - Create a new application"
echo "   - Set up identity providers (Google, GitHub, etc.)"
echo "   - Copy the client ID and secret to your .env file"
echo ""
echo "4. Update your .env file with all the IDs from the Cloudflare dashboard"
echo ""
echo "🎉 Once complete, run: npm run dev"
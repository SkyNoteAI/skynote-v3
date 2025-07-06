# Cloudflare Setup Guide for CloudNotes AI

This guide walks you through setting up all required Cloudflare services for CloudNotes AI.

## Prerequisites

- Cloudflare account (free tier is sufficient for development)
- Node.js 18+ installed
- Wrangler CLI installed (`npm install -g wrangler`)

## Step 1: Create Cloudflare Account

1. Go to [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
2. Create your account and verify your email
3. Note your Account ID from the dashboard (right sidebar)

## Step 2: Generate API Token

1. Go to **My Profile > API Tokens**
2. Click **Create Token**
3. Use the "Custom token" template with these permissions:
   - Account: Cloudflare Workers R2 Storage:Edit
   - Account: D1:Edit
   - Account: Cloudflare Queues:Edit
   - Account: Workers AI:Edit
   - Account: Workers Scripts:Edit
   - Zone: Workers Routes:Edit (if using custom domain)

## Step 3: Set Up R2 Storage

### Via Dashboard:
1. Navigate to **R2** in the dashboard
2. Click **Create bucket**
3. Name: `cloudnotes-dev-storage`
4. Location: Automatic
5. Create the bucket

### Via CLI:
```bash
wrangler r2 bucket create cloudnotes-dev-storage
```

## Step 4: Create D1 Database

### Via Dashboard:
1. Navigate to **D1** in the dashboard
2. Click **Create database**
3. Name: `cloudnotes-db-dev`
4. Location: Automatic
5. Note the Database ID after creation

### Via CLI:
```bash
wrangler d1 create cloudnotes-db-dev
```

## Step 5: Configure Queues

### Via Dashboard:
1. Navigate to **Queues** in the dashboard
2. Create two queues:
   - `note-processing-dev` (main queue)
   - `note-processing-dlq` (dead letter queue)

### Via CLI:
```bash
wrangler queues create note-processing-dev
wrangler queues create note-processing-dlq
```

## Step 6: Set Up AutoRAG (Manual)

1. Navigate to **AI > AutoRAG** in the dashboard
2. Click **Create instance**
3. Configure:
   - Name: `cloudnotes-autorag-dev`
   - R2 Bucket: Select `cloudnotes-dev-storage`
   - File pattern: `**/*.md`
   - Embedding model: `text-embedding-ada-002` (or preferred)
   - Chunk size: 512 tokens
   - Chunk overlap: 128 tokens
4. Note the Instance ID after creation

## Step 7: Configure Cloudflare Access

1. Navigate to **Zero Trust > Access > Applications**
2. Click **Add an application**
3. Select **Self-hosted**
4. Configure:
   - Application name: `CloudNotes AI Dev`
   - Application domain: `cloudnotes-dev.workers.dev`
5. Set up identity providers:
   - Enable Google OAuth
   - Enable GitHub OAuth (optional)
6. Configure policies:
   - Name: `Allow all users`
   - Action: Allow
   - Include: Everyone (for dev, restrict for production)
7. Note the Client ID and Client Secret

## Step 8: Configure Environment Variables

1. Copy `.env.example` to `.env`
2. Fill in all values:

```bash
# From Step 1
CF_ACCOUNT_ID=your-account-id

# From Step 2
CLOUDFLARE_API_TOKEN=your-api-token

# From Step 3
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key

# From Step 4
D1_DATABASE_ID=your-database-id

# From Step 6
AUTORAG_INSTANCE_ID=your-autorag-id

# From Step 7
CF_ACCESS_CLIENT_ID=your-access-client-id
CF_ACCESS_CLIENT_SECRET=your-access-client-secret
```

## Step 9: Update wrangler.toml

Replace placeholder IDs in `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "cloudnotes-db-dev"
database_id = "your-actual-database-id"  # From Step 4
```

## Step 10: Verify Setup

Run the verification script:

```bash
# Authenticate Wrangler
wrangler login

# List your resources to verify
wrangler r2 bucket list
wrangler d1 list
wrangler queues list
```

## Troubleshooting

### Common Issues:

1. **Authentication Error**
   - Ensure your API token has all required permissions
   - Try `wrangler logout` then `wrangler login`

2. **R2 Bucket Not Found**
   - R2 buckets are account-level, ensure you're in the right account
   - Check bucket name matches exactly

3. **D1 Database Connection Failed**
   - Verify database ID in wrangler.toml
   - Ensure database is in the same account

4. **Queue Not Processing**
   - Check queue name matches in all configurations
   - Verify dead letter queue exists

5. **AutoRAG Not Indexing**
   - Ensure R2 bucket is linked correctly
   - Check file pattern matches your markdown files
   - Verify markdown files exist in the bucket

## Next Steps

Once all services are configured:

1. Run database migrations: `npm run db:migrate`
2. Start development server: `npm run dev`
3. Access the app at `http://localhost:5173`

## Production Considerations

- Use separate R2 buckets for dev/staging/prod
- Create separate D1 databases for each environment
- Configure proper Access policies for production
- Set up usage alerts for all services
- Enable logging and monitoring
- Configure custom domains
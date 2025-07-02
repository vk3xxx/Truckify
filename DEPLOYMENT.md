# Auto-Deployment to Coolify

This guide explains how to set up automatic deployment of your Truckify application to a self-hosted Coolify environment.

## Prerequisites

1. **GitHub Repository**: Your code should be in a GitHub repository
2. **Coolify Instance**: A running Coolify instance on your server
3. **GitHub Secrets**: Configured in your repository settings

## Method 1: GitHub Actions (Recommended)

### Step 1: Set up GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add these secrets:

- `COOLIFY_URL`: Your Coolify instance URL (e.g., `https://coolify.yourdomain.com`)
- `COOLIFY_TOKEN`: Your Coolify API token
- `COOLIFY_PROJECT_ID`: Your project ID in Coolify
- `COOLIFY_SERVICE_ID`: Your service ID in Coolify

### Step 2: Get Coolify Credentials

1. **Get API Token**:
   - Log into your Coolify dashboard
   - Go to Settings → API Tokens
   - Create a new token with appropriate permissions

2. **Get Project and Service IDs**:
   - Create a new project in Coolify
   - Add a new service (Dockerfile deployment)
   - The IDs will be in the URL or API responses

### Step 3: Configure the Workflow

The `.github/workflows/deploy.yml` file is already configured to:
- Trigger on pushes to `main` or `master` branch
- Use the official Coolify GitHub Action
- Deploy automatically when code is pushed

## Method 2: Coolify Git Integration

### Step 1: Connect Repository in Coolify

1. In Coolify dashboard, create a new project
2. Choose "Application" → "Dockerfile"
3. Connect your GitHub repository
4. Configure build settings:
   - **Build Command**: Leave empty (uses Dockerfile)
   - **Dockerfile Path**: `Dockerfile`
   - **Port**: `8080`

### Step 2: Configure Environment Variables

Add these environment variables in Coolify:
- `PORT`: `8080`

### Step 3: Enable Auto-Deploy

- Enable "Auto Deploy" in the service settings
- Choose your target branch (main/master)
- Set deployment strategy (Rolling update recommended)

## Method 3: Webhook Deployment

### Step 1: Get Webhook URL

1. In Coolify, go to your service settings
2. Find the webhook URL in the deployment section
3. Copy the webhook URL

### Step 2: Configure GitHub Webhook

1. Go to your GitHub repository → Settings → Webhooks
2. Add webhook with the Coolify URL
3. Set content type to `application/json`
4. Select events: "Just the push event"

## Environment Variables

Configure these in your Coolify service:

| Variable | Value | Description |
|----------|-------|-------------|
| `PORT` | `8080` | Application port |
| `NODE_ENV` | `production` | Environment (optional) |

## Health Checks

The application includes a health check endpoint at `/health` that Coolify can use to verify deployment success.

## Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check if `go.mod` and `main.go` are in the repository
   - Verify Dockerfile syntax
   - Check Coolify build logs

2. **Deployment Failures**:
   - Verify environment variables
   - Check port configuration
   - Review Coolify deployment logs

3. **GitHub Actions Issues**:
   - Verify all secrets are set correctly
   - Check GitHub Actions logs
   - Ensure repository permissions

### Debug Commands:

```bash
# Test local build
docker build -t truckify .

# Test local run
docker run -p 8080:8080 truckify

# Check application health
curl http://localhost:8080/health
```

## Monitoring

- **Coolify Dashboard**: Monitor deployments and logs
- **Application Logs**: View in Coolify service logs
- **Health Checks**: Automatic monitoring via `/health` endpoint

## Rollback

If deployment fails, Coolify will automatically rollback to the previous version if configured. You can also manually rollback from the Coolify dashboard. 
# GitHub Actions Workflows

This directory contains automated workflows for the unified digital platform.

## Workflows Overview

### 🚀 deploy.yml
**Main deployment workflow**
- Builds and deploys to production (main branch)
- Creates preview deployments for pull requests
- Automatic rollback on failure
- Deployment verification and health checks

**Triggers**: Push to main, pull requests, manual

### 🧪 staging.yml
**Staging environment deployment**
- Deploys to staging environment
- Runs automated smoke tests
- Pre-production testing

**Triggers**: Push to staging/develop, manual

### 🔄 rollback.yml
**Manual rollback workflow**
- Rollback to previous or specific deployment
- Supports production and staging environments
- Requires reason for rollback

**Triggers**: Manual only

### 💚 health-check.yml
**Continuous health monitoring**
- Checks site accessibility
- Monitors response times
- Validates SSL certificates
- Runs hourly and after deployments

**Triggers**: Scheduled (hourly), after deployments, manual

## Quick Start

### Deploy to Production
```bash
# Push to main branch
git push origin main

# Or deploy manually
npm run deploy:production
```

### Create Preview Deployment
```bash
# Create pull request
# Preview deployment is automatic
```

### Manual Rollback
1. Go to Actions tab
2. Select "Manual Rollback"
3. Click "Run workflow"
4. Fill in environment and reason
5. Execute

### Check Site Health
```bash
# Automatic: Runs every hour
# Manual: Go to Actions → Health Check → Run workflow
```

## Required Secrets

Configure in Repository Settings → Secrets and Variables → Actions:

- `CLOUDFLARE_API_TOKEN`: Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID
- `CLOUDFLARE_PROJECT_NAME`: Pages project name
- `NEXT_PUBLIC_MEDIA_URL`: Media CDN URL

## Workflow Status Badges

Add to README.md:

```markdown
![Deploy](https://github.com/anandmoghan/anandmoghan-me/workflows/Deploy%20to%20Cloudflare%20Pages/badge.svg)
![Health Check](https://github.com/anandmoghan/anandmoghan-me/workflows/Health%20Check/badge.svg)
```

## Troubleshooting

### Build Failures
- Check build logs in Actions tab
- Verify dependencies are up to date
- Run build locally: `npm run build`

### Deployment Failures
- Verify Cloudflare credentials
- Check Cloudflare status page
- Review deployment logs

### Health Check Failures
- Check site accessibility manually
- Review Cloudflare CDN status
- Verify DNS configuration

## Documentation

For detailed documentation, see:
- [CI/CD Documentation](../../docs/CI-CD.md)
- [Deployment Guide](../../docs/DEPLOYMENT.md)

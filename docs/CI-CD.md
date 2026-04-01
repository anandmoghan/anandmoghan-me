# CI/CD Pipeline Documentation

## Overview

The unified digital platform uses GitHub Actions for continuous integration and deployment to Cloudflare Pages. The pipeline provides automated builds, deployments, health checks, and rollback capabilities.

## Workflows

### 1. Deploy to Cloudflare Pages (`deploy.yml`)

**Purpose**: Main deployment workflow for production and preview environments

**Triggers**:
- Push to `main` branch → Production deployment
- Pull requests → Preview deployment
- Manual trigger via workflow_dispatch

**Jobs**:

#### Build Job
- Checks out repository
- Sets up Node.js 20 with npm caching
- Installs dependencies with `npm ci`
- Runs linting (non-blocking)
- Runs TypeScript type checking (non-blocking)
- Builds Next.js static export
- Uploads build artifacts
- Generates build info JSON

#### Deploy Production Job
- Downloads build artifacts
- Deploys to Cloudflare Pages (main branch)
- Verifies deployment accessibility
- Creates deployment summary
- Only runs on main branch or manual production trigger

#### Deploy Preview Job
- Downloads build artifacts
- Deploys to Cloudflare Pages (preview branch)
- Comments on pull request with preview URL
- Creates deployment summary
- Only runs on pull requests or manual preview trigger

#### Rollback Job
- Triggers on production deployment failure
- Fetches previous successful deployment
- Executes automatic rollback
- Notifies team of rollback

**Environment Variables**:
- `NEXT_PUBLIC_MEDIA_URL`: Media CDN URL
- `NEXT_PUBLIC_CDN_OPTIMIZE`: Enable/disable CDN optimization

**Secrets Required**:
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Pages permissions
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID
- `CLOUDFLARE_PROJECT_NAME`: Pages project name (default: anandmoghan-me)

### 2. Deploy to Staging (`staging.yml`)

**Purpose**: Staging environment deployment with smoke tests

**Triggers**:
- Push to `staging` or `develop` branches
- Manual trigger via workflow_dispatch

**Features**:
- Builds with staging configuration
- Deploys to staging branch
- Runs automated smoke tests:
  - Homepage accessibility
  - Blog page accessibility
  - Media page accessibility
- Creates deployment summary with test results

**Smoke Tests**:
```bash
# Tests run after deployment
- Homepage: GET /
- Blog: GET /posts
- Media: GET /media
```

### 3. Manual Rollback (`rollback.yml`)

**Purpose**: Manual rollback to previous or specific deployment

**Triggers**:
- Manual trigger only via workflow_dispatch

**Inputs**:
- `environment`: production or staging
- `deployment_id`: Optional specific deployment ID
- `reason`: Required reason for rollback

**Process**:
1. Validates rollback request
2. Identifies target deployment (previous or specified)
3. Retrieves deployment details
4. Executes rollback via Cloudflare API
5. Verifies site accessibility
6. Creates rollback summary

**Usage**:
1. Go to Actions tab in GitHub
2. Select "Manual Rollback" workflow
3. Click "Run workflow"
4. Fill in required inputs
5. Confirm and run

### 4. Health Check (`health-check.yml`)

**Purpose**: Continuous monitoring of site health and performance

**Triggers**:
- Scheduled: Every hour (cron: '0 * * * *')
- After deployment completion
- Manual trigger via workflow_dispatch

**Checks**:

#### Status Checks
- Homepage (/)
- Blog (/posts)
- Media (/media)
- Profile (/profile)
- Sitemap (/sitemap.xml)
- Robots.txt (/robots.txt)

#### Performance Checks
- Homepage response time
- Blog response time
- Threshold: 2 seconds (warning if exceeded)

#### Security Checks
- SSL certificate validity
- Certificate expiration date
- Warning if < 30 days until expiry

**Health Status Levels**:
- **Healthy**: All checks pass
- **Degraded**: Performance issues detected
- **Warning**: SSL certificate expiring soon
- **Unhealthy**: Critical failures detected

## Deployment Environments

### Production
- **URL**: https://anandmoghan.me
- **Branch**: main
- **Trigger**: Push to main or manual
- **Features**: Full optimization, CDN enabled
- **Protection**: Requires successful build

### Preview
- **URL**: Auto-generated Cloudflare Pages URL
- **Branch**: preview-{PR_NUMBER}
- **Trigger**: Pull requests
- **Features**: Testing environment for PRs
- **Protection**: None (temporary deployments)

### Staging
- **URL**: Auto-generated Cloudflare Pages URL
- **Branch**: staging
- **Trigger**: Push to staging/develop
- **Features**: Pre-production testing with smoke tests
- **Protection**: Automated smoke tests

## Deployment Process

### Automatic Deployment (Production)

1. **Developer pushes to main branch**
   ```bash
   git push origin main
   ```

2. **GitHub Actions triggers**
   - Build job starts
   - Linting and type checking
   - Next.js build

3. **Build artifacts created**
   - Static files in `out/` directory
   - Build info JSON

4. **Deployment to Cloudflare Pages**
   - Upload to Cloudflare
   - Automatic CDN distribution
   - DNS propagation

5. **Verification**
   - Health check runs
   - Site accessibility verified
   - Deployment summary created

6. **On Failure**
   - Automatic rollback triggered
   - Previous deployment restored
   - Team notified

### Manual Deployment

```bash
# Build locally
npm run build

# Deploy to production
npm run deploy:production

# Deploy to preview
npm run deploy:preview
```

### Preview Deployment (Pull Requests)

1. **Developer creates pull request**
2. **GitHub Actions triggers**
   - Build job starts
   - Preview deployment created
3. **Comment added to PR**
   - Preview URL provided
   - Deployment details included
4. **Review and test**
   - Test changes in preview environment
   - Verify functionality
5. **Merge to main**
   - Preview deployment deleted
   - Production deployment triggered

## Rollback Procedures

### Automatic Rollback

Triggered automatically when:
- Production deployment fails
- Health check fails after deployment
- Build verification fails

Process:
1. Detect deployment failure
2. Query Cloudflare API for previous deployment
3. Execute rollback via API
4. Verify site accessibility
5. Notify team

### Manual Rollback

Use when:
- Issues discovered after deployment
- Need to revert to specific version
- Emergency rollback required

Steps:
1. Navigate to Actions → Manual Rollback
2. Select environment (production/staging)
3. Optionally specify deployment ID
4. Provide rollback reason
5. Execute rollback
6. Verify site functionality

### Rollback via CLI

```bash
# List recent deployments
npx wrangler pages deployment list --project-name=anandmoghan-me

# Rollback to specific deployment
npx wrangler pages deployment rollback <deployment-id> --project-name=anandmoghan-me
```

## Monitoring and Alerts

### Health Check Monitoring

- **Frequency**: Every hour
- **Metrics**: Status codes, response times, SSL validity
- **Alerts**: Workflow fails on unhealthy status

### Deployment Monitoring

- **Build Status**: Success/failure notifications
- **Deployment Status**: Success/failure/rollback
- **Performance**: Response time tracking

### Manual Monitoring

```bash
# Check deployment status
npx wrangler pages deployment list --project-name=anandmoghan-me

# View deployment logs
npx wrangler pages deployment tail --project-name=anandmoghan-me

# Check site health
curl -I https://anandmoghan.me
```

## Secrets Management

### Required GitHub Secrets

Configure in: Repository Settings → Secrets and Variables → Actions

```bash
# Cloudflare Credentials
CLOUDFLARE_API_TOKEN=<token>
CLOUDFLARE_ACCOUNT_ID=<account_id>
CLOUDFLARE_PROJECT_NAME=anandmoghan-me

# R2 Storage (for future use)
R2_ACCESS_KEY_ID=<key_id>
R2_SECRET_ACCESS_KEY=<secret_key>
R2_BUCKET_NAME=anandmoghan-media

# Media Configuration
NEXT_PUBLIC_MEDIA_URL=https://media.anandmoghan.me
NEXT_PUBLIC_MEDIA_URL_STAGING=https://media-staging.anandmoghan.me
```

### Creating Cloudflare API Token

1. Go to Cloudflare Dashboard
2. Navigate to My Profile → API Tokens
3. Click "Create Token"
4. Use "Edit Cloudflare Pages" template
5. Configure permissions:
   - Account → Cloudflare Pages → Edit
   - Account → R2 → Edit (optional)
6. Set account resources
7. Create token and save securely

### Security Best Practices

- Rotate tokens every 90 days
- Use separate tokens for staging and production
- Never commit secrets to repository
- Use GitHub encrypted secrets
- Limit token permissions to minimum required
- Monitor token usage in Cloudflare dashboard

## Troubleshooting

### Build Failures

**Issue**: Dependencies installation fails
```bash
# Solution: Clear cache and retry
rm -rf node_modules package-lock.json
npm install
```

**Issue**: TypeScript errors
```bash
# Solution: Run type check locally
npx tsc --noEmit
# Fix errors before pushing
```

**Issue**: Build timeout
```bash
# Solution: Check build logs
# Optimize build process
# Increase timeout in workflow if needed
```

### Deployment Failures

**Issue**: Cloudflare API authentication fails
- Verify `CLOUDFLARE_API_TOKEN` is set correctly
- Check token permissions
- Regenerate token if expired

**Issue**: Deployment verification fails
- Check Cloudflare status page
- Verify DNS configuration
- Wait for CDN propagation (up to 5 minutes)

**Issue**: Rollback fails
- Check previous deployment exists
- Verify API token permissions
- Use manual rollback via Cloudflare dashboard

### Health Check Failures

**Issue**: Status code 404
- Verify routes are correctly configured
- Check build output includes all pages
- Review Next.js static export configuration

**Issue**: Slow response times
- Check Cloudflare CDN status
- Review caching configuration
- Optimize static assets

**Issue**: SSL certificate warnings
- Cloudflare auto-renews certificates
- Check domain configuration
- Contact Cloudflare support if persistent

## Performance Optimization

### Build Optimization

- Use `npm ci` for consistent installs
- Enable npm caching in GitHub Actions
- Minimize build dependencies
- Use Next.js built-in optimizations

### Deployment Optimization

- Leverage Cloudflare CDN
- Enable Brotli compression
- Use HTTP/3 when available
- Optimize static asset caching

### Monitoring Optimization

- Run health checks hourly (not more frequently)
- Use lightweight curl requests
- Cache health check results
- Alert only on critical issues

## Maintenance

### Regular Tasks

**Weekly**:
- Review deployment logs
- Check error rates
- Monitor response times

**Monthly**:
- Update dependencies
- Review security advisories
- Test rollback procedures

**Quarterly**:
- Rotate API tokens
- Review and optimize workflows
- Update documentation

**Annually**:
- Review caching strategies
- Audit security practices
- Evaluate new Cloudflare features

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare API Documentation](https://developers.cloudflare.com/api/)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)

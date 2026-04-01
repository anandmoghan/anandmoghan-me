# Deployment Guide

## Overview

This document provides comprehensive instructions for deploying the unified digital platform to Cloudflare Pages with automated CI/CD pipelines.

## Architecture

The platform uses:
- **Cloudflare Pages**: Hosting for the Next.js static export
- **Cloudflare R2**: Media storage with public/private access control
- **GitHub Actions**: Automated deployment pipeline
- **Custom Domain**: anandmoghan.me (main site) and media.anandmoghan.me (media subdomain)

## Prerequisites

1. **Cloudflare Account**
   - Active Cloudflare account with Pages enabled
   - R2 storage enabled
   - Custom domain configured

2. **GitHub Repository**
   - Repository with appropriate access permissions
   - GitHub Actions enabled

3. **Required Credentials**
   - Cloudflare API Token with Pages and R2 permissions
   - Cloudflare Account ID
   - R2 Access Key ID and Secret Access Key

## Environment Variables

### Build-Time Variables (Cloudflare Pages)

Configure these in Cloudflare Pages dashboard under Settings > Environment Variables:

```bash
# Media CDN Configuration
NEXT_PUBLIC_MEDIA_URL=https://media.anandmoghan.me

# Optional: CDN Optimization
NEXT_PUBLIC_CDN_OPTIMIZE=true
```

### Deployment Variables (GitHub Secrets)

Configure these in GitHub repository under Settings > Secrets and Variables > Actions:

```bash
# Cloudflare Credentials
CLOUDFLARE_API_TOKEN=<your_api_token>
CLOUDFLARE_ACCOUNT_ID=<your_account_id>

# R2 Storage Credentials
R2_ACCESS_KEY_ID=<your_r2_access_key>
R2_SECRET_ACCESS_KEY=<your_r2_secret_key>
R2_BUCKET_NAME=anandmoghan-media

# Deployment Configuration
CLOUDFLARE_PROJECT_NAME=anandmoghan-me
```

## Cloudflare Pages Configuration

### 1. Create Cloudflare Pages Project

```bash
# Using Wrangler CLI
wrangler pages project create anandmoghan-me

# Or via Cloudflare Dashboard:
# 1. Go to Pages > Create a project
# 2. Connect to GitHub repository
# 3. Configure build settings (see below)
```

### 2. Build Configuration

**Framework preset**: Next.js
**Build command**: `npm run build`
**Build output directory**: `out`
**Root directory**: `/`

### 3. Domain Configuration

#### Main Site (anandmoghan.me)

1. Go to Pages project > Custom domains
2. Add custom domain: `anandmoghan.me`
3. Add www subdomain: `www.anandmoghan.me`
4. Configure DNS records (automatic via Cloudflare)

#### Media Subdomain (media.anandmoghan.me)

1. Create R2 bucket: `anandmoghan-media`
2. Enable public access for `/public` prefix
3. Configure custom domain for R2:
   - Go to R2 > Bucket > Settings > Public access
   - Add custom domain: `media.anandmoghan.me`
   - Configure DNS records

### 4. Environment-Specific Configuration

#### Production Environment

```bash
NEXT_PUBLIC_MEDIA_URL=https://media.anandmoghan.me
NEXT_PUBLIC_CDN_OPTIMIZE=true
NODE_ENV=production
```

#### Preview/Staging Environment

```bash
NEXT_PUBLIC_MEDIA_URL=https://media-staging.anandmoghan.me
NEXT_PUBLIC_CDN_OPTIMIZE=false
NODE_ENV=development
```

## GitHub Actions Deployment Pipeline

The platform uses GitHub Actions for automated deployment with the following workflow:

### Workflow Triggers

- **Push to main branch**: Deploys to production
- **Pull request**: Deploys to preview environment
- **Manual trigger**: Allows manual deployment with environment selection

### Deployment Stages

1. **Build Stage**
   - Install dependencies
   - Run linting and type checking
   - Build Next.js static export
   - Generate build artifacts

2. **Deploy Stage**
   - Upload build to Cloudflare Pages
   - Configure environment variables
   - Verify deployment health

3. **Rollback Stage** (on failure)
   - Revert to previous deployment
   - Notify team of failure
   - Preserve logs for debugging

### Manual Deployment

```bash
# Deploy to production
npm run build
wrangler pages deploy out --project-name=anandmoghan-me --branch=main

# Deploy to preview
wrangler pages deploy out --project-name=anandmoghan-me --branch=preview
```

## Rollback Procedures

### Automatic Rollback

The GitHub Actions workflow automatically rolls back on deployment failure:
- Detects failed health checks
- Reverts to previous successful deployment
- Sends notification to team

### Manual Rollback

```bash
# List recent deployments
wrangler pages deployment list --project-name=anandmoghan-me

# Rollback to specific deployment
wrangler pages deployment rollback <deployment-id> --project-name=anandmoghan-me
```

### Via Cloudflare Dashboard

1. Go to Pages project > Deployments
2. Find the last successful deployment
3. Click "Rollback to this deployment"
4. Confirm rollback action

## Monitoring and Health Checks

### Deployment Health Checks

The pipeline verifies:
- Build completes successfully
- Static files are generated
- Deployment is accessible
- Critical pages return 200 status

### Post-Deployment Verification

```bash
# Check main site
curl -I https://anandmoghan.me

# Check media subdomain
curl -I https://media.anandmoghan.me/public/test.jpg

# Verify sitemap
curl https://anandmoghan.me/sitemap.xml

# Verify robots.txt
curl https://anandmoghan.me/robots.txt
```

## Troubleshooting

### Build Failures

**Issue**: Build fails with dependency errors
**Solution**: 
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Issue**: TypeScript errors during build
**Solution**:
```bash
# Run type checking locally
npx tsc --noEmit
# Fix type errors before pushing
```

### Deployment Failures

**Issue**: Deployment times out
**Solution**: Check Cloudflare status page and retry deployment

**Issue**: Environment variables not set
**Solution**: Verify variables in Cloudflare Pages dashboard and GitHub secrets

### Domain Configuration Issues

**Issue**: Custom domain not resolving
**Solution**: 
1. Verify DNS records in Cloudflare DNS dashboard
2. Wait for DNS propagation (up to 24 hours)
3. Clear DNS cache: `dig anandmoghan.me` or `nslookup anandmoghan.me`

**Issue**: SSL certificate errors
**Solution**: Cloudflare automatically provisions SSL certificates; wait 15-30 minutes after domain configuration

## Performance Optimization

### Caching Strategy

Cloudflare Pages automatically caches:
- Static assets (images, CSS, JS): 1 year
- HTML pages: 4 hours
- API responses: No cache (dynamic content)

### CDN Configuration

The platform leverages Cloudflare's global CDN:
- Automatic edge caching
- Brotli compression
- HTTP/3 support
- Image optimization (via R2)

### Cache Invalidation

```bash
# Purge entire cache
wrangler pages deployment tail --project-name=anandmoghan-me

# Purge specific URLs via Cloudflare API
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://anandmoghan.me/"]}'
```

## Security Considerations

### API Token Permissions

The Cloudflare API token should have:
- Pages: Edit permissions
- R2: Read and Write permissions
- DNS: Read permissions (for domain verification)

### Secret Management

- Never commit secrets to repository
- Use GitHub encrypted secrets for CI/CD
- Rotate credentials regularly (every 90 days)
- Use separate tokens for staging and production

### Access Control

- Limit GitHub Actions to specific branches
- Require pull request reviews before merging to main
- Enable branch protection rules
- Use deployment environments with approval gates

## Maintenance

### Regular Tasks

- **Weekly**: Review deployment logs and error rates
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Rotate API tokens and credentials
- **Annually**: Review and optimize caching strategies

### Backup Strategy

- GitHub repository serves as source of truth
- Cloudflare Pages maintains deployment history (30 days)
- R2 media files should be backed up separately
- Export environment variables and configuration regularly

## Support and Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

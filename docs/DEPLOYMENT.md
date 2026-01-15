# Deployment Guide

## Cloudflare Pages Deployment

This project is configured for deployment on Cloudflare Pages with static export.

### Prerequisites

1. A Cloudflare account
2. Git repository connected to Cloudflare Pages
3. Custom domain configured (anandmoghan.me)

### Build Configuration

**Framework preset**: Next.js (Static HTML Export)

**Build command**:
```bash
npm run build
```

**Build output directory**:
```
out
```

**Environment variables**: None required for basic deployment

### Deployment Steps

#### Option 1: Automatic Deployment (Recommended)

1. Connect your Git repository to Cloudflare Pages
2. Configure build settings:
   - Build command: `npm run build`
   - Build output directory: `out`
   - Root directory: `/`
3. Push to your main branch - Cloudflare will automatically build and deploy

#### Option 2: Manual Deployment with Wrangler

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy
wrangler pages deploy out
```

### Custom Domain Setup

1. Go to Cloudflare Pages dashboard
2. Select your project
3. Navigate to "Custom domains"
4. Add `anandmoghan.me` and `www.anandmoghan.me`
5. Cloudflare will automatically configure DNS

### Post-Deployment

After deployment, your site will be available at:
- Production: `https://anandmoghan.me`
- Preview: `https://[branch].[project].pages.dev`

### Future: Apps Hub with SSR

When implementing the apps hub with authentication:
1. Update `next.config.ts` to remove `output: "export"`
2. Configure Cloudflare Pages Functions for SSR
3. Add environment variables for authentication
4. Set up Cloudflare KV for session storage

## Monitoring

- Check build logs in Cloudflare Pages dashboard
- Monitor performance with Cloudflare Analytics
- Set up alerts for build failures

## Troubleshooting

**Build fails**: Check Node.js version (should be 18+)
**CSS not loading**: Verify Tailwind CSS configuration
**404 errors**: Ensure `out` directory is correctly specified

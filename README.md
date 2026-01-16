# Anand Mohan - Unified Digital Platform

A modern, unified digital platform combining a professional portfolio and blog with a private authenticated workspace.

## Overview

This platform bridges professional life as an AI Scientist at Amazon with personal journey in the UK. It features:

- **Public Site** (anandmoghan.me): Professional profile and blog with mathematical formula support
- **Apps Hub** (anandmoghan.me/apps): Private authenticated workspace for custom tools
- **Unified Design**: Consistent branding and theme system across all areas
- **Media Management**: Context-aware access to public and private content

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS with custom design tokens
- **Content**: MDX for blog posts with KaTeX for formulas
- **Hosting**: Cloudflare Pages with R2 storage
- **Authentication**: Service-abstracted auth system

## Getting Started

```bash
# Install dependencies
npm install

# Configure environment (for media system)
cp .env.example .env
# Edit .env with your Cloudflare R2 credentials

# Run development server
npm run dev

# Build for production
npm run build
```

Visit [http://localhost:3000](http://localhost:3000) to see the site.

## Documentation

- **[Media System Guide](docs/MEDIA-SYSTEM.md)** - Complete guide to media management with Cloudflare R2
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Deployment instructions for Cloudflare Pages
- **[SEO Checklist](docs/SEO-CHECKLIST.md)** - SEO optimization checklist

## Project Structure

```
├── app/                      # Next.js App Router
│   ├── (static-pages)/      # Static pages (blog, profile)
│   ├── apps/                # Private apps hub
│   └── api/                 # API routes
├── common/                  # Shared components and services
│   ├── components/          # Reusable UI components
│   ├── services/            # Service abstractions
│   └── utils/               # Utility functions
├── content/                 # Content files
│   ├── blog/                # Blog posts (MDX)
│   └── media/               # Media assets
└── scripts/                 # Utility scripts
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run upload-media` - Upload media to Cloudflare R2
- `npm run generate-manifest` - Generate static media manifest

## Key Features

### Media System
- **R2-First Architecture**: Media stored in Cloudflare R2, not in repository
- **Build-Time Discovery**: Fetches media list from R2 during static generation
- **CDN Delivery**: Global CDN serving with optimal performance
- **Smart Upload**: Automatic change detection and optional local file cleanup

See [docs/MEDIA-SYSTEM.md](docs/MEDIA-SYSTEM.md) for complete documentation.

## Deployment

The platform is designed for deployment on Cloudflare Pages with static generation for the blog and SSR for the apps hub.

## License

MIT © Anand Mohan

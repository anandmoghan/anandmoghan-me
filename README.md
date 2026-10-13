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
- **Hosting**: Firebase Hosting (static export) with a Firebase Function for `/api/**`, Firestore, and Storage
- **Authentication**: Service-abstracted auth system

## Getting Started

```bash
# Install dependencies
npm install

# Configure environment (for media system)
cp .env.example .env
# Edit .env with your Firebase credentials

# Run development server
npm run dev

# Build for production
npm run build
```

Visit [http://localhost:3000](http://localhost:3000) to see the site.

## Documentation

- **[Media System Guide](docs/MEDIA-SYSTEM.md)** - Complete guide to media management with Firebase Storage
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Deployment instructions for Firebase Hosting
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
- `npm run upload-media` - Upload media to Firebase Storage
- `npm run generate-manifest` - Generate static media manifest

## Key Features

### Media System
- **Storage-first**: Media lives in Firebase Storage (`public/**`), not in the repository
- **Build-time discovery**: The media list is fetched from Storage during static generation
- **Smart upload**: Automatic change detection and optional local file cleanup

See [docs/MEDIA-SYSTEM.md](docs/MEDIA-SYSTEM.md) for complete documentation.

## Deployment

The site is one Next.js static export hosted on Firebase Hosting (project `anandmoghan-me`). The private apps under `/apps/**` ship in the same export, `/api/**` is served by the Firebase Function `api` (us-central1), and DNS stays at Cloudflare.

```bash
npm run deploy          # build + hosting
npm run deploy:all      # hosting, functions, firestore rules, storage rules
npm run deploy:preview  # preview channel
```

- **Production**: GitHub Actions deploys hosting, functions, and rules on push to `main`
- **Preview**: each pull request gets a Hosting preview channel URL
- **Rollback**: Hosting release history in the Firebase console, or `firebase hosting:clone`

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [docs/CI-CD.md](docs/CI-CD.md).

## License

MIT © Anand Mohan

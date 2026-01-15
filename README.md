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

# Run development server
npm run dev

# Build for production
npm run build
```

Visit [http://localhost:3000](http://localhost:3000) to see the site.

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

## Deployment

The platform is designed for deployment on Cloudflare Pages with static generation for the blog and SSR for the apps hub.

## License

MIT © Anand Mohan

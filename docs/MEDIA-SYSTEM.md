# Media System Documentation

Complete guide to the unified digital platform's media management system.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Setup Guide](#setup-guide)
4. [Upload Script](#upload-script)
5. [Workflow Guide](#workflow-guide)
6. [API Reference](#api-reference)
7. [Design Decisions](#design-decisions)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

Get your media system up and running in 5 minutes.

### 1. Setup R2 (One-time)

#### Create R2 Bucket
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → R2
2. Create bucket: `anandmoghan-media`
3. Note your Account ID

#### Generate API Token
1. R2 → Manage R2 API Tokens → Create API Token
2. Permissions: Object Read & Write
3. Save Access Key ID and Secret Access Key

#### Configure Environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 2. Upload Media to R2

```bash
# Upload from local directory
npm run upload-media -- --source ~/my-photos --type public

# Upload and delete local copies (keeps repo lightweight)
npm run upload-media -- --source ~/my-photos --type public --delete-after-upload

# Upload single file
npm run upload-media -- --source ~/photo.jpg --type public

# Update existing files
npm run upload-media -- --source ~/my-photos --type public --overwrite
```

### 3. Build & Deploy

```bash
# Build (fetches media list from R2)
npm run build

# Deploy
npm run deploy
```

### Done! 🎉

Your media is now served from Cloudflare's global CDN at `media.anandmoghan.me`.

**Note**: You don't need to keep local copies of media files. R2 is the source of truth.

---

## Architecture Overview

### Design Philosophy

The media system uses **Cloudflare R2 as the single source of truth**:

1. **Upload**: Upload media files to Cloudflare R2 using the upload script
2. **Build Time**: Fetch media list from R2 during static site generation
3. **Runtime**: Serve media directly from R2 CDN (`media.anandmoghan.me`)

### Why This Approach?

- **No Local Storage**: No need to keep media files in your repository
- **CDN Performance**: Media served from Cloudflare's global CDN
- **Single Source of Truth**: R2 is the authoritative source for all media
- **Static Export Compatible**: Works with Next.js static export
- **Scalable**: Handle large media libraries without bloating your repo

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Developer Workflow                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Upload Media                                             │
│     npm run upload-media -- --source ~/photos --type public │
│                           │                                   │
│                           ▼                                   │
│                  ┌─────────────────┐                         │
│                  │ Cloudflare R2   │                         │
│                  │ (Source of      │                         │
│                  │  Truth)         │                         │
│                  └─────────────────┘                         │
│                           │                                   │
│  2. Build Site            │                                   │
│     npm run build ────────┘                                   │
│     (Fetches media list from R2)                             │
│                           │                                   │
│                           ▼                                   │
│                  ┌─────────────────┐                         │
│                  │ Static Site     │                         │
│                  │ (HTML + refs)   │                         │
│                  └─────────────────┘                         │
│                           │                                   │
│  3. Deploy                │                                   │
│     npm run deploy ───────┘                                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      User Experience                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  User visits site                                            │
│         │                                                     │
│         ▼                                                     │
│  ┌─────────────────┐                                         │
│  │ Static HTML     │                                         │
│  │ (from Pages)    │                                         │
│  └─────────────────┘                                         │
│         │                                                     │
│         │ References media URLs                              │
│         │ (media.anandmoghan.me/public/...)                 │
│         │                                                     │
│         ▼                                                     │
│  ┌─────────────────┐                                         │
│  │ Cloudflare CDN  │                                         │
│  │ (Global Cache)  │                                         │
│  └─────────────────┘                                         │
│         │                                                     │
│         ▼                                                     │
│  ┌─────────────────┐                                         │
│  │ Cloudflare R2   │                                         │
│  │ (Origin)        │                                         │
│  └─────────────────┘                                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

Media files are stored **only in Cloudflare R2**, organized as:

```
R2 Bucket (anandmoghan-media)/
├── public/
│   ├── images/              # Public images
│   │   ├── profile.jpg
│   │   ├── blog/
│   │   │   └── post-image.png
│   │   └── gallery/
│   │       └── photo.jpg
│   └── docs/                # Public documents
│       ├── Resume.pdf
│       └── whitepaper.pdf
└── private/                 # Private media (future)
    └── ...
```

**Note**: You don't need a local `content/media` directory. The build process fetches the media list directly from R2.

### Data Flow

#### Upload Flow
```
Local Files → Upload Script → R2 Storage
                    │
                    ├─ Check existence
                    ├─ Compare hashes
                    ├─ Upload new/changed
                    └─ Skip unchanged
```

#### Build Flow
```
Build Process → R2 API → Media List
      │                      │
      │                      ▼
      │              ┌──────────────┐
      │              │ MediaAsset[] │
      │              └──────────────┘
      │                      │
      └──────────────────────┘
                │
                ▼
         Static HTML Pages
         (with media refs)
```

#### Runtime Flow
```
Browser → Static HTML → Media URL
                           │
                           ▼
                    CDN (Cache Hit?)
                      │           │
                    Yes          No
                      │           │
                      ▼           ▼
                   Return      R2 Origin
                                  │
                                  ▼
                              Cache & Return
```

---

## Setup Guide

### Prerequisites

- Node.js 18+ installed
- Cloudflare account
- Git repository for your project

### Step 1: Configure R2 Storage

#### Create R2 Bucket

1. Log in to your Cloudflare dashboard
2. Navigate to R2 Object Storage
3. Create a new bucket (e.g., `anandmoghan-media`)
4. Note your Account ID from the R2 overview page

#### Generate R2 API Tokens

1. In R2 dashboard, go to "Manage R2 API Tokens"
2. Create a new API token with:
   - **Permissions**: Object Read & Write
   - **Bucket**: Select your media bucket
3. Save the Access Key ID and Secret Access Key

#### Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=anandmoghan-media
NEXT_PUBLIC_MEDIA_URL=https://media.anandmoghan.me
```

#### Configure R2 Custom Domain (Optional)

To serve media from `media.anandmoghan.me`:

1. In your R2 bucket settings, go to "Settings" → "Custom Domains"
2. Add custom domain: `media.anandmoghan.me`
3. Follow Cloudflare's instructions to add DNS records
4. Enable public access for the bucket (or configure access rules)

### Step 2: Install Dependencies

Dependencies are already included in `package.json`:

```bash
npm install
```

### Step 3: Test Configuration

Test your R2 credentials with a dry run:

```bash
npm run upload-media -- --dry-run
```

If configured correctly, you should see a list of files that would be uploaded.

---

## Upload Script

### Overview

The upload script (`scripts/upload-media.ts`) uploads media files from your local machine to Cloudflare R2 storage.

### Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--source <path>` | Source directory or file | `./content/media` |
| `--type <type>` | Media type: `public` or `private` | `public` |
| `--overwrite` | Update existing files in R2 | `false` |
| `--delete-after-upload` | Delete local files after successful upload | `false` |
| `--optimize` | Optimize images during upload | `false` (not yet implemented) |
| `--dry-run` | Show what would be uploaded | `false` |
| `--help` | Show help message | - |

### Usage Examples

#### Basic Upload

Upload all media from `content/media` as public:

```bash
npm run upload-media -- --type public
```

#### Upload with Overwrite

Update existing files in R2:

```bash
npm run upload-media -- --type public --overwrite
```

#### Upload Private Media

Upload media that requires authentication:

```bash
npm run upload-media -- --type private
```

#### Upload Specific Directory

Upload only images:

```bash
npm run upload-media -- --source ./content/media/images --type public
```

#### Upload Single File

Upload a specific file:

```bash
npm run upload-media -- --source ./content/media/images/photo.jpg --type public
```

#### Upload and Delete Local Copies

Upload files and automatically delete them after successful upload:

```bash
npm run upload-media -- --source ~/photos --type public --delete-after-upload
```

**⚠️ Warning**: This permanently deletes local files. Make sure you have backups!

#### Dry Run

See what would be uploaded without actually uploading:

```bash
npm run upload-media -- --dry-run
```

### How It Works

#### File Discovery

The script scans the source directory for supported file types:
- **Images**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`
- **Documents**: `.pdf`, `.doc`, `.docx`, `.txt`, `.md`
- **Videos**: `.mp4`, `.webm`, `.ogg`, `.mov`

#### Upload Process

1. **Scan**: Recursively scan source directory for media files
2. **Check**: For each file, check if it exists in R2
3. **Compare**: If exists and `--overwrite` is set, compare MD5 hashes
4. **Upload**: Upload new or changed files to R2
5. **Skip**: Skip unchanged files to save bandwidth
6. **Delete** (optional): Delete local files after successful upload

#### R2 Storage Structure

Files are organized in R2 with the following structure:

```
bucket/
├── public/
│   ├── images/
│   │   ├── photo1.jpg
│   │   └── photo2.png
│   └── docs/
│       └── resume.pdf
└── private/
    ├── family/
    │   └── photo.jpg
    └── documents/
        └── private-doc.pdf
```

#### Metadata

Each uploaded file includes metadata:
- `originalName`: Original filename
- `uploadedAt`: Upload timestamp (ISO 8601)
- `type`: `public` or `private`
- `hash`: MD5 hash for change detection

---

## Workflow Guide

### Workflow Options

#### Option 1: Keep Local Copies (Traditional)

**Use when**: You want to keep media in your repository or have local backups

```bash
# 1. Add media to content/media
cp ~/photos/*.jpg content/media/images/

# 2. Upload to R2
npm run upload-media -- --type public

# 3. Local files remain in content/media
```

**Pros**:
- Local backup in repository
- Can work offline
- Easy to track changes in Git

**Cons**:
- Large repository size
- Slower Git operations
- Storage duplication

#### Option 2: Delete After Upload (Recommended)

**Use when**: You want a lightweight repository and have backups elsewhere

```bash
# 1. Upload from anywhere (doesn't need to be in repo)
npm run upload-media -- --source ~/photos --type public --delete-after-upload

# 2. Local files are automatically deleted after successful upload
# 3. R2 is now the single source of truth
```

**Pros**:
- Lightweight repository
- Fast Git operations
- No storage duplication
- Single source of truth

**Cons**:
- Requires R2 access to view media
- Need external backups
- Can't work offline

### Example Workflows

#### Workflow 1: One-Time Upload

Upload photos from a trip and delete local copies:

```bash
# Upload and clean up
npm run upload-media -- --source ~/trip-photos --type public --delete-after-upload

# Build site with new media
npm run build

# Deploy
npm run deploy
```

#### Workflow 2: Update Existing Media

Update some photos and keep local copies:

```bash
# Upload with overwrite
npm run upload-media -- --source ~/updated-photos --type public --overwrite

# Build and deploy
npm run build && npm run deploy
```

#### Workflow 3: Batch Upload from Multiple Sources

Upload from different directories:

```bash
# Upload profile photos
npm run upload-media -- --source ~/profile-pics --type public --delete-after-upload

# Upload blog images
npm run upload-media -- --source ~/blog-images --type public --delete-after-upload

# Upload documents
npm run upload-media -- --source ~/documents --type public --delete-after-upload

# Build once with all media
npm run build
```

#### Workflow 4: Safe Upload with Verification

Upload with verification before deletion:

```bash
# 1. Dry run first
npm run upload-media -- --source ~/photos --dry-run

# 2. Upload without deletion
npm run upload-media -- --source ~/photos --type public

# 3. Verify in R2 dashboard or build site
npm run build

# 4. If everything looks good, delete manually
rm -rf ~/photos
```

### Development Workflow

1. Upload media to R2: `npm run upload-media -- --source ~/photos --type public`
2. Build site (fetches from R2): `npm run build`
3. Run dev server: `npm run dev`
4. Media served from R2 CDN

### Production Workflow

1. Upload new/updated media: `npm run upload-media -- --source ~/photos --type public --overwrite`
2. Build site: `npm run build`
3. Deploy: `npm run deploy`

### CI/CD Workflow

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      # Build needs R2 credentials to fetch media list
      - name: Build site
        env:
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
          R2_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
          R2_BUCKET_NAME: anandmoghan-media
        run: npm run build
      
      - name: Deploy to Cloudflare Pages
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: npm run deploy
```

**Note**: Media upload is typically done manually or in a separate workflow, not on every deploy.

---

## API Reference

### Server-Side Utilities (`common/utils/media.ts`)

Server-only functions that use R2 API to fetch media information.

#### `getPublicAssets(): Promise<MediaAsset[]>`

Get all public media assets from Cloudflare R2.

```typescript
import { getPublicAssets } from '@/common/utils/media';

const assets = await getPublicAssets();
// Returns: MediaAsset[]
```

#### `getAssetByPath(path: string): Promise<MediaAsset | null>`

Get a specific public asset by path from R2.

```typescript
import { getAssetByPath } from '@/common/utils/media';

const asset = await getAssetByPath('images/photo.jpg');
// Returns: MediaAsset | null
```

#### `getAllImages(): Promise<MediaAsset[]>`

Get all images from the images directory in R2.

```typescript
import { getAllImages } from '@/common/utils/media';

const images = await getAllImages();
// Returns: MediaAsset[]
```

#### `getAllDocuments(): Promise<MediaAsset[]>`

Get all documents from the docs directory in R2.

```typescript
import { getAllDocuments } from '@/common/utils/media';

const documents = await getAllDocuments();
// Returns: MediaAsset[]
```

#### `getImagesByDirectory(directory: string): Promise<MediaAsset[]>`

Get images from a specific directory in R2.

```typescript
import { getImagesByDirectory } from '@/common/utils/media';

const blogImages = await getImagesByDirectory('images/blog');
// Returns: MediaAsset[]
```

#### `getDocumentsByDirectory(directory: string): Promise<MediaAsset[]>`

Get documents from a specific directory in R2.

```typescript
import { getDocumentsByDirectory } from '@/common/utils/media';

const publicDocs = await getDocumentsByDirectory('docs/public');
// Returns: MediaAsset[]
```

### Client-Safe Utilities (`common/utils/media-client.ts`)

Client-safe functions for use in client components (no R2 dependency).

#### `getPublicMediaUrl(path: string): string`

Get the public URL for a media asset.

```typescript
import { getPublicMediaUrl } from '@/common/utils/media-client';

const url = getPublicMediaUrl('images/photo.jpg');
// Returns: "https://media.anandmoghan.me/public/images/photo.jpg"
```

#### `getOptimizedImageUrl(path: string, options?: ImageOptions): string`

Generate optimized image URL with parameters.

```typescript
import { getOptimizedImageUrl } from '@/common/utils/media-client';

const url = getOptimizedImageUrl('images/photo.jpg', {
  width: 800,
  quality: 85,
  format: 'webp'
});
// Returns: URL with optimization parameters
```

#### `generateSrcSet(path: string, widths?: number[]): string`

Generate srcset for responsive images.

```typescript
import { generateSrcSet } from '@/common/utils/media-client';

const srcset = generateSrcSet('images/photo.jpg');
// Returns: "url 640w, url 750w, url 1080w, ..."
```

### React Components

#### `<ResponsiveImage>`

Client component for displaying responsive images with lazy loading.

```typescript
import ResponsiveImage from '@/common/components/ResponsiveImage';

<ResponsiveImage
  src="images/photo.jpg"
  alt="My photo"
  width={800}
  height={600}
  priority={false}
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

**Props**:
- `src` (string): Path to image in R2
- `alt` (string): Alt text for accessibility
- `width` (number, optional): Image width
- `height` (number, optional): Image height
- `className` (string, optional): CSS classes
- `priority` (boolean, optional): Load immediately (default: false)
- `sizes` (string, optional): Responsive sizes attribute

**Features**:
- Lazy loading (except when priority is true)
- Loading states with spinner animation
- Error handling with fallback UI
- Automatic srcset generation
- Smooth fade-in transition

#### `<MediaGallery>`

Client component for displaying image galleries.

```typescript
import { getAllImages } from '@/common/utils/media';
import MediaGallery from '@/common/components/MediaGallery';

const images = await getAllImages();

<MediaGallery 
  assets={images} 
  columns={3}
  className="my-gallery"
/>
```

**Props**:
- `assets` (MediaAsset[]): Array of media assets
- `columns` (2 | 3 | 4, optional): Grid columns (default: 3)
- `className` (string, optional): CSS classes

**Features**:
- Responsive grid layout
- Hover effects with metadata
- Full-size modal view on click
- Empty state handling

### Type Definitions

#### `MediaAsset`

```typescript
interface MediaAsset {
  id: string;
  filename: string;
  path: string;
  publicUrl?: string;
  privateUrl?: string;
  type: 'image' | 'document' | 'video';
  size: number;
  dimensions?: { width: number; height: number };
  isPrivate: boolean;
  uploadedAt: Date;
  metadata: Record<string, any>;
}
```

#### `ImageOptions`

```typescript
interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill';
}
```

---

## Design Decisions

### 1. R2 as Single Source of Truth

**Decision**: Use Cloudflare R2 as the authoritative source for all media, not local files.

**Rationale**:
- Eliminates need to store large media files in Git
- Keeps repository lightweight and fast
- Simplifies deployment (no media sync needed)
- Single source of truth prevents inconsistencies

**Trade-offs**:
- Requires R2 credentials at build time
- Slightly slower builds (network fetch vs local read)
- Dependency on R2 availability during builds

**Implementation**: Build process connects to R2 and lists all objects with `public/` prefix.

### 2. Build-Time Media Discovery

**Decision**: Fetch media list from R2 during static site generation.

**Rationale**:
- Compatible with Next.js static export
- No runtime API calls needed
- Media list embedded in static HTML
- Fast page loads (no client-side fetching)

**Trade-offs**:
- Media changes require rebuild
- Build time increases with large media libraries
- R2 credentials needed in CI/CD

**Implementation**: Server-side utilities use AWS SDK S3 client to list R2 objects at build time.

### 3. Separate Upload Script

**Decision**: Provide standalone script for uploading media to R2.

**Rationale**:
- Decouples media management from deployment
- Allows manual media updates without full deploy
- Supports batch operations and dry runs
- Provides progress tracking and error handling

**Trade-offs**:
- Extra step in workflow
- Requires manual execution
- Potential for media/site desync

**Implementation**: CLI script with comprehensive options and safety features.

### 4. Optional Local File Deletion

**Decision**: Provide `--delete-after-upload` flag for automatic cleanup.

**Rationale**:
- Supports lightweight repository workflow
- Reduces storage duplication
- Maintains R2 as single source of truth
- Optional for safety

**Trade-offs**:
- Risk of accidental deletion
- Requires external backups
- Can't work offline

**Implementation**: Only deletes files after successful upload, with clear logging.

### 5. Graceful Degradation

**Decision**: Build succeeds even without R2 credentials.

**Rationale**:
- Allows development without R2 access
- Prevents build failures in CI/CD
- Supports incremental adoption

**Trade-offs**:
- Media pages will be empty without credentials
- May confuse developers

**Implementation**: Returns empty array when R2 client initialization fails, with warning message.

### 6. Consolidated Documentation

**Decision**: All media documentation in single `docs/MEDIA-SYSTEM.md` file.

**Rationale**:
- Easier to find and navigate
- Single source of truth for documentation
- Reduces documentation fragmentation
- Better for searching and referencing

**Trade-offs**:
- Longer single file
- May be overwhelming for quick reference

**Implementation**: Comprehensive guide with table of contents and clear sections.

---

## Troubleshooting

### Media Not Showing (404)

**Problem**: Images show 404 errors

**Solutions**:
1. Verify files exist in R2 bucket (check R2 dashboard)
2. Ensure R2 bucket has public access enabled
3. Verify custom domain is configured correctly
4. Check R2 credentials are set during build
5. Rebuild site: `npm run build`

### Build Errors

**Problem**: Build fails with "Module not found: fs"

**Solution**: Ensure you're using server-side utilities (`common/utils/media.ts`) only in server components, and client-safe utilities (`common/utils/media-client.ts`) in client components.

### R2 Credentials Not Configured

**Problem**: Build warns "R2 credentials not configured. Media list will be empty."

**Solutions**:
1. Verify environment variables are set in `.env`
2. Check `.env` file is in project root
3. Ensure `dotenv` is installed: `npm install dotenv`
4. Verify credentials are correct in Cloudflare dashboard

### Upload Fails

**Problem**: Upload script fails with authentication error

**Solutions**:
1. Verify environment variables are set correctly in `.env`
2. Check R2 API token has correct permissions (Object Read & Write)
3. Ensure bucket name matches configuration
4. Verify Account ID is correct

### Slow Loading

**Problem**: Images load slowly

**Solutions**:
1. Enable CDN optimization: `NEXT_PUBLIC_CDN_OPTIMIZE=true`
2. Use responsive images with appropriate sizes
3. Enable lazy loading for below-fold images
4. Consider image optimization before upload

### Files Not Deleted After Upload

**Problem**: Local files remain after upload with `--delete-after-upload`

**Possible causes**:
- Upload failed (check error messages)
- Dry-run mode was enabled
- File permissions issue

**Solution**: Check upload status in output. Only successfully uploaded files are deleted.

### Accidental Deletion

**Problem**: Deleted files you wanted to keep

**Solutions**: 
- Check your backups
- Download from R2 using AWS CLI or dashboard:
  ```bash
  aws s3 cp s3://anandmoghan-media/public/images/ ./restored/ --recursive \
    --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
  ```
- Use `--dry-run` next time to preview

### Build Time Too Long

**Problem**: Builds take too long with large media libraries

**Solutions**:
1. Use static manifest: `npm run generate-manifest`
2. Implement build caching (future enhancement)
3. Consider incremental builds
4. Optimize R2 list operations

---

## Best Practices

### 1. Always Backup

Before using `--delete-after-upload`, ensure you have backups:
- Cloud storage (Google Drive, Dropbox, etc.)
- External hard drive
- Another computer

### 2. Test with Dry Run

Always test with `--dry-run` first:

```bash
npm run upload-media -- --source ~/photos --dry-run
```

### 3. Start Small

Test with a few files before uploading large batches:

```bash
# Test with one file
npm run upload-media -- --source ~/test-photo.jpg --type public --delete-after-upload
```

### 4. Verify After Upload

After uploading, verify files are in R2:
- Check R2 dashboard
- Build site and check media page
- Test media URLs in browser

### 5. Use Version Control for Important Media

For critical media (logos, brand assets), consider keeping in Git:

```bash
# Upload without deletion
npm run upload-media -- --source ./content/media/brand --type public
```

### 6. Optimize Images Before Upload

Optimize images for web before uploading:

```bash
# Using ImageMagick
convert input.jpg -quality 85 -resize 1920x1920\> output.jpg

# Using sharp-cli
npx sharp-cli -i input.jpg -o output.jpg --quality 85 --width 1920
```

### 7. Organize Media by Purpose

Organize media in R2 by purpose:

```
public/
├── images/
│   ├── blog/           # Blog post images
│   ├── profile/        # Profile photos
│   ├── gallery/        # Photo gallery
│   └── ui/             # UI assets
└── docs/
    ├── public/         # Public documents
    └── downloads/      # Downloadable files
```

---

## Performance Characteristics

### Build Time

| Operation | Time | Notes |
|-----------|------|-------|
| R2 List (100 files) | ~500ms | Network latency dependent |
| R2 List (1000 files) | ~2s | Pagination required |
| Asset transformation | ~1ms/file | CPU bound |
| Total overhead | ~1-3s | Acceptable for static builds |

### Runtime

| Operation | Time | Notes |
|-----------|------|-------|
| CDN cache hit | ~10-50ms | Global edge network |
| CDN cache miss | ~100-300ms | R2 origin fetch |
| Image load | Varies | Depends on size/optimization |

### Upload

| Operation | Time | Notes |
|-----------|------|-------|
| Hash check | ~1ms/file | Local computation |
| R2 upload | ~100-500ms/file | Network dependent |
| Batch (100 files) | ~1-5min | Sequential uploads |

---

## Future Enhancements

### Short Term
- [ ] Build cache for media list
- [ ] Parallel R2 operations
- [ ] Progress indicators for large libraries
- [ ] Automatic retry on network errors

### Medium Term
- [ ] Image optimization during upload
- [ ] Thumbnail generation
- [ ] Video streaming support
- [ ] Private media with authentication

### Long Term
- [ ] Incremental static regeneration
- [ ] Real-time media updates
- [ ] Advanced CDN optimization
- [ ] Multi-region replication

---

## Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)

---

**Last Updated**: January 2025
**Version**: 1.0.0

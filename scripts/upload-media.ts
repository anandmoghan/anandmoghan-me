#!/usr/bin/env node

/**
 * Media Upload Script for Cloudflare R2
 * 
 * Uploads media files from local content/media directory to Cloudflare R2
 * Supports both public and private media with access control
 * 
 * Usage:
 *   npm run upload-media -- --type public
 *   npm run upload-media -- --type private --overwrite
 *   npm run upload-media -- --source ./content/media/images --type public
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';

interface UploadOptions {
  source: string;
  type: 'public' | 'private';
  overwrite: boolean;
  optimize: boolean;
  dryRun: boolean;
  deleteAfterUpload: boolean;
}

interface UploadResult {
  file: string;
  status: 'uploaded' | 'updated' | 'skipped' | 'failed';
  size: number;
  error?: string;
}

class MediaUploadScript {
  private s3Client: S3Client;
  private bucketName: string;
  private stats = {
    uploaded: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    totalSize: 0,
  };

  constructor() {
    // Initialize R2 client with S3-compatible API
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucketName = process.env.R2_BUCKET_NAME || 'anandmoghan-media';

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'Missing required environment variables:\n' +
        '  CLOUDFLARE_ACCOUNT_ID\n' +
        '  R2_ACCESS_KEY_ID\n' +
        '  R2_SECRET_ACCESS_KEY\n' +
        '  R2_BUCKET_NAME (optional, defaults to "anandmoghan-media")'
      );
    }

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Main upload function
   */
  async uploadMedia(options: UploadOptions): Promise<void> {
    console.log('🚀 Starting media upload to Cloudflare R2...\n');
    console.log(`Source: ${options.source}`);
    console.log(`Type: ${options.type}`);
    console.log(`Bucket: ${this.bucketName}`);
    console.log(`Overwrite: ${options.overwrite}`);
    console.log(`Delete after upload: ${options.deleteAfterUpload}`);
    console.log(`Dry run: ${options.dryRun}\n`);

    if (!fs.existsSync(options.source)) {
      throw new Error(`Source path does not exist: ${options.source}`);
    }

    const files = this.scanFiles(options.source);
    console.log(`Found ${files.length} files to process\n`);

    if (files.length === 0) {
      console.log('No files to upload.');
      return;
    }

    const filesToDelete: string[] = [];

    for (const file of files) {
      const result = await this.uploadFile(file, options);
      this.updateStats(result);
      this.logResult(result);

      // Track successfully uploaded files for deletion
      if (options.deleteAfterUpload && !options.dryRun && 
          (result.status === 'uploaded' || result.status === 'updated')) {
        filesToDelete.push(file);
      }
    }

    this.printSummary();

    // Delete local files after successful upload
    if (options.deleteAfterUpload && !options.dryRun && filesToDelete.length > 0) {
      console.log('\n🗑️  Deleting local copies...\n');
      for (const file of filesToDelete) {
        try {
          fs.unlinkSync(file);
          console.log(`🗑️  Deleted: ${path.basename(file)}`);
        } catch (error) {
          console.error(`❌ Failed to delete ${file}:`, error instanceof Error ? error.message : error);
        }
      }
      console.log(`\n✅ Deleted ${filesToDelete.length} local files\n`);
    }
  }

  /**
   * Scan directory for media files
   */
  private scanFiles(dir: string): string[] {
    const files: string[] = [];
    const supportedExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
      '.pdf', '.doc', '.docx', '.txt', '.md',
      '.mp4', '.webm', '.ogg', '.mov',
    ];

    const scan = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          scan(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (supportedExtensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };

    if (fs.statSync(dir).isDirectory()) {
      scan(dir);
    } else {
      files.push(dir);
    }

    return files;
  }

  /**
   * Upload a single file to R2
   */
  private async uploadFile(
    filePath: string,
    options: UploadOptions
  ): Promise<UploadResult> {
    try {
      const stats = fs.statSync(filePath);
      const fileBuffer = fs.readFileSync(filePath);
      
      // Generate R2 key
      const relativePath = this.getRelativePath(filePath, options.source);
      const r2Key = `${options.type}/${relativePath}`;

      // Check if file exists in R2
      const exists = await this.checkExists(r2Key);

      if (exists && !options.overwrite) {
        return {
          file: relativePath,
          status: 'skipped',
          size: stats.size,
        };
      }

      // Check if file has changed (compare hash)
      if (exists && options.overwrite) {
        const hasChanged = await this.hasFileChanged(r2Key, fileBuffer);
        if (!hasChanged) {
          return {
            file: relativePath,
            status: 'skipped',
            size: stats.size,
          };
        }
      }

      if (options.dryRun) {
        return {
          file: relativePath,
          status: exists ? 'updated' : 'uploaded',
          size: stats.size,
        };
      }

      // Upload to R2
      const contentType = this.getContentType(filePath);
      const metadata = {
        originalName: path.basename(filePath),
        uploadedAt: new Date().toISOString(),
        type: options.type,
        hash: this.calculateHash(fileBuffer),
      };

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: r2Key,
          Body: fileBuffer,
          ContentType: contentType,
          Metadata: metadata,
        })
      );

      return {
        file: relativePath,
        status: exists ? 'updated' : 'uploaded',
        size: stats.size,
      };
    } catch (error) {
      return {
        file: path.basename(filePath),
        status: 'failed',
        size: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if file exists in R2
   */
  private async checkExists(key: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if file has changed by comparing hashes
   */
  private async hasFileChanged(key: string, fileBuffer: Buffer): Promise<boolean> {
    try {
      const response = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );

      const remoteHash = response.Metadata?.hash;
      const localHash = this.calculateHash(fileBuffer);

      return remoteHash !== localHash;
    } catch {
      return true; // If we can't get metadata, assume changed
    }
  }

  /**
   * Calculate MD5 hash of file
   */
  private calculateHash(buffer: Buffer): string {
    return createHash('md5').update(buffer).digest('hex');
  }

  /**
   * Get relative path from source directory
   */
  private getRelativePath(filePath: string, source: string): string {
    const sourceStat = fs.statSync(source);
    
    if (sourceStat.isFile()) {
      return path.basename(filePath);
    }

    return path.relative(source, filePath).replace(/\\/g, '/');
  }

  /**
   * Get content type from file extension
   */
  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.json': 'application/json',
    };

    return contentTypes[ext] || 'application/octet-stream';
  }

  /**
   * Update statistics
   */
  private updateStats(result: UploadResult): void {
    this.stats[result.status]++;
    if (result.status !== 'failed') {
      this.stats.totalSize += result.size;
    }
  }

  /**
   * Log upload result
   */
  private logResult(result: UploadResult): void {
    const icons = {
      uploaded: '✅',
      updated: '🔄',
      skipped: '⏭️',
      failed: '❌',
    };

    const icon = icons[result.status];
    const sizeKB = (result.size / 1024).toFixed(2);

    if (result.status === 'failed') {
      console.log(`${icon} ${result.file} - ${result.error}`);
    } else {
      console.log(`${icon} ${result.file} (${sizeKB} KB)`);
    }
  }

  /**
   * Print summary statistics
   */
  private printSummary(): void {
    const totalSizeMB = (this.stats.totalSize / (1024 * 1024)).toFixed(2);

    console.log('\n' + '='.repeat(50));
    console.log('📊 Upload Summary');
    console.log('='.repeat(50));
    console.log(`✅ Uploaded: ${this.stats.uploaded}`);
    console.log(`🔄 Updated: ${this.stats.updated}`);
    console.log(`⏭️  Skipped: ${this.stats.skipped}`);
    console.log(`❌ Failed: ${this.stats.failed}`);
    console.log(`📦 Total size: ${totalSizeMB} MB`);
    console.log('='.repeat(50) + '\n');
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  const options: UploadOptions = {
    source: './content/media',
    type: 'public',
    overwrite: false,
    optimize: false,
    dryRun: false,
    deleteAfterUpload: false,
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--source':
        options.source = args[++i];
        break;
      case '--type':
        const type = args[++i];
        if (type !== 'public' && type !== 'private') {
          throw new Error('Type must be "public" or "private"');
        }
        options.type = type;
        break;
      case '--overwrite':
        options.overwrite = true;
        break;
      case '--optimize':
        options.optimize = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--delete-after-upload':
        options.deleteAfterUpload = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
      default:
        console.error(`Unknown option: ${args[i]}`);
        printHelp();
        process.exit(1);
    }
  }

  try {
    const uploader = new MediaUploadScript();
    await uploader.uploadMedia(options);
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
Media Upload Script for Cloudflare R2

Usage:
  npm run upload-media -- [options]

Options:
  --source <path>          Source directory or file (default: ./content/media)
  --type <type>            Media type: "public" or "private" (default: public)
  --overwrite              Update existing files in R2
  --optimize               Optimize images during upload (not yet implemented)
  --delete-after-upload    Delete local files after successful upload
  --dry-run                Show what would be uploaded without uploading
  --help                   Show this help message

Environment Variables (required):
  CLOUDFLARE_ACCOUNT_ID    Your Cloudflare account ID
  R2_ACCESS_KEY_ID         R2 access key ID
  R2_SECRET_ACCESS_KEY     R2 secret access key
  R2_BUCKET_NAME           R2 bucket name (optional, defaults to "anandmoghan-media")

Examples:
  # Upload all public media
  npm run upload-media -- --type public

  # Upload and overwrite existing files
  npm run upload-media -- --type public --overwrite

  # Upload and delete local copies after successful upload
  npm run upload-media -- --source ~/photos --type public --delete-after-upload

  # Upload private media
  npm run upload-media -- --type private

  # Upload specific directory
  npm run upload-media -- --source ./content/media/images --type public

  # Dry run to see what would be uploaded
  npm run upload-media -- --dry-run

  # Upload single file
  npm run upload-media -- --source ./content/media/images/photo.jpg --type public
`);
}

// Run if called directly
if (require.main === module) {
  main();
}

export type { UploadOptions, UploadResult };
export { MediaUploadScript };

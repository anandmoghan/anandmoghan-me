#!/usr/bin/env node

/**
 * Generate Media Manifest from Firebase Storage
 * 
 * Creates a static JSON manifest of all media files in Storage
 * Useful for build-time static generation when Firebase credentials aren't available
 * 
 * Usage:
 *   npm run generate-manifest
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { getMediaBucket, hasStorageCredentials } from '../common/utils/storage-admin';
import { getPublicMediaUrl } from '../common/utils/media-client';

interface MediaManifestItem {
  id: string;
  filename: string;
  path: string;
  publicUrl: string;
  type: 'image' | 'document' | 'video';
  size: number;
  uploadedAt: string;
}

interface MediaManifest {
  generatedAt: string;
  count: number;
  items: MediaManifestItem[];
}

async function generateManifest() {
  console.log('🔍 Generating media manifest from Firebase Storage...\n');

  if (!hasStorageCredentials()) {
    throw new Error(
      'No Google credentials found. Either:\n' +
      '  gcloud auth application-default login\n' +
      '  export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json'
    );
  }

  const bucket = getMediaBucket();

  const items: MediaManifestItem[] = [];

  try {
    const [files] = await bucket.getFiles({ prefix: 'public/' });

    for (const file of files) {
      if (file.name === 'public/' || file.name.endsWith('/')) continue;
      const assetPath = file.name.replace(/^public\//, '');
      const filename = assetPath.split('/').pop() || '';
      const ext = filename.split('.').pop()?.toLowerCase() || '';
      const type = getMediaType(ext);

      if (type) {
        items.push({
          id: assetPath,
          filename,
          path: assetPath,
          publicUrl: getPublicMediaUrl(assetPath),
          type,
          size: Number(file.metadata.size ?? 0),
          uploadedAt: file.metadata.timeCreated ?? new Date().toISOString(),
        });
      }
    }

    const manifest: MediaManifest = {
      generatedAt: new Date().toISOString(),
      count: items.length,
      items,
    };

    // Write manifest to public directory
    const outputPath = path.join(process.cwd(), 'public', 'media-manifest.json');
    fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

    console.log(`✅ Generated manifest with ${items.length} items`);
    console.log(`📄 Saved to: ${outputPath}\n`);

    // Print summary
    const byType = items.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('📊 Summary:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Error generating manifest:', error);
    process.exit(1);
  }
}

function getMediaType(ext: string): 'image' | 'document' | 'video' | null {
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  const documentExts = ['pdf', 'doc', 'docx', 'txt', 'md', 'json'];
  const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi'];

  if (imageExts.includes(ext)) return 'image';
  if (documentExts.includes(ext)) return 'document';
  if (videoExts.includes(ext)) return 'video';

  return null;
}

generateManifest();

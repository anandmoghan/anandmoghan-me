#!/usr/bin/env node

/**
 * Generate Media Manifest from Cloudflare R2
 * 
 * Creates a static JSON manifest of all media files in R2
 * Useful for build-time static generation when R2 credentials aren't available
 * 
 * Usage:
 *   npm run generate-manifest
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

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
  console.log('🔍 Generating media manifest from Cloudflare R2...\n');

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME || 'anandmoghan-media';
  const mediaBaseUrl = process.env.NEXT_PUBLIC_MEDIA_URL || 'https://media.anandmoghan.me';

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing required environment variables:\n' +
      '  CLOUDFLARE_ACCOUNT_ID\n' +
      '  R2_ACCESS_KEY_ID\n' +
      '  R2_SECRET_ACCESS_KEY'
    );
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const items: MediaManifestItem[] = [];
  let continuationToken: string | undefined;

  try {
    do {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: 'public/',
        ContinuationToken: continuationToken,
      });

      const response = await client.send(command);

      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Key && object.Key !== 'public/') {
            const path = object.Key.replace(/^public\//, '');
            const filename = path.split('/').pop() || '';
            const ext = filename.split('.').pop()?.toLowerCase() || '';
            const type = getMediaType(ext);

            if (type) {
              items.push({
                id: path,
                filename,
                path,
                publicUrl: `${mediaBaseUrl}/public/${path}`,
                type,
                size: object.Size || 0,
                uploadedAt: object.LastModified?.toISOString() || new Date().toISOString(),
              });
            }
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

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

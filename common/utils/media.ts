import 'server-only';
import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import type { MediaAsset, ImageOptions } from '../types/media';

/**
 * Get the public URL for a media asset
 * This is a server-only function
 */
export function getPublicMediaUrl(assetPath: string): string {
  const MEDIA_BASE_URL = process.env.NEXT_PUBLIC_MEDIA_URL || process.env.R2_PUBLIC_URL || 'https://media.anandmoghan.me';
  // Remove leading slash if present
  const cleanPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
  return `${MEDIA_BASE_URL}/public/${cleanPath}`;
}

/**
 * Initialize R2 client for fetching media list
 */
function getR2Client(): S3Client | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.warn('R2 credentials not configured. Media list will be empty.');
    return null;
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Get all public media assets from Cloudflare R2
 */
export async function getPublicAssets(): Promise<MediaAsset[]> {
  const client = getR2Client();
  if (!client) {
    return [];
  }

  const bucketName = process.env.R2_BUCKET_NAME || 'anandmoghan-media';
  const assets: MediaAsset[] = [];

  try {
    let continuationToken: string | undefined;

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
            const asset = await createMediaAssetFromR2(client, bucketName, object.Key, object.Size || 0);
            if (asset) {
              assets.push(asset);
            }
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return assets;
  } catch (error) {
    console.error('Error fetching media from R2:', error);
    return [];
  }
}

/**
 * Get a specific public asset by path from R2
 */
export async function getAssetByPath(assetPath: string): Promise<MediaAsset | null> {
  const client = getR2Client();
  if (!client) {
    return null;
  }

  const bucketName = process.env.R2_BUCKET_NAME || 'anandmoghan-media';
  const key = `public/${assetPath}`;

  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await client.send(command);
    
    return createMediaAssetFromR2(
      client,
      bucketName,
      key,
      response.ContentLength || 0,
      response.Metadata
    );
  } catch (error) {
    console.error(`Error fetching asset ${assetPath} from R2:`, error);
    return null;
  }
}

/**
 * Create a MediaAsset object from R2 object information
 */
async function createMediaAssetFromR2(
  client: S3Client,
  bucketName: string,
  key: string,
  size: number,
  metadata?: Record<string, string>
): Promise<MediaAsset | null> {
  // Remove 'public/' prefix
  const path = key.replace(/^public\//, '');
  const filename = path.split('/').pop() || '';
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  const type = getMediaType(ext);
  
  if (!type) {
    return null;
  }

  return {
    id: path,
    filename,
    path,
    publicUrl: getPublicMediaUrl(path),
    type,
    size,
    isPrivate: false,
    uploadedAt: metadata?.uploadedat ? new Date(metadata.uploadedat) : new Date(),
    metadata: {
      mimeType: getMimeType(ext),
      extension: ext,
      ...metadata,
    },
  };
}

/**
 * Determine media type from file extension
 */
function getMediaType(ext: string): 'image' | 'document' | 'video' | null {
  // Ensure ext has a dot prefix
  const extWithDot = ext.startsWith('.') ? ext : `.${ext}`;
  
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
  const documentExts = ['.pdf', '.doc', '.docx', '.txt', '.md', '.json'];
  const videoExts = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
  
  if (imageExts.includes(extWithDot)) return 'image';
  if (documentExts.includes(extWithDot)) return 'document';
  if (videoExts.includes(extWithDot)) return 'video';
  
  return null;
}

/**
 * Get MIME type from file extension
 */
function getMimeType(ext: string): string {
  // Ensure ext has a dot prefix
  const extWithDot = ext.startsWith('.') ? ext : `.${ext}`;
  
  const mimeTypes: Record<string, string> = {
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
  
  return mimeTypes[extWithDot] || 'application/octet-stream';
}

/**
 * Get images from a specific directory in R2
 */
export async function getImagesByDirectory(directory: string): Promise<MediaAsset[]> {
  const allAssets = await getPublicAssets();
  return allAssets.filter(asset => 
    asset.type === 'image' && 
    asset.path.startsWith(directory)
  );
}

/**
 * Get documents from a specific directory in R2
 */
export async function getDocumentsByDirectory(directory: string): Promise<MediaAsset[]> {
  const allAssets = await getPublicAssets();
  return allAssets.filter(asset => 
    asset.type === 'document' && 
    asset.path.startsWith(directory)
  );
}

/**
 * Generate optimized image URL with parameters
 * Note: In static export mode, this returns the base URL
 * For dynamic optimization, integrate with image CDN or service
 */
export function getOptimizedImageUrl(assetPath: string, options: ImageOptions = {}): string {
  const baseUrl = getPublicMediaUrl(assetPath);
  
  // For static export, return base URL
  // In production with CDN, append optimization parameters
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_CDN_OPTIMIZE === 'true') {
    const params = new URLSearchParams();
    
    if (options.width) params.append('w', options.width.toString());
    if (options.height) params.append('h', options.height.toString());
    if (options.quality) params.append('q', options.quality.toString());
    if (options.format) params.append('f', options.format);
    if (options.fit) params.append('fit', options.fit);
    
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }
  
  return baseUrl;
}

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(assetPath: string, widths: number[] = [640, 750, 828, 1080, 1200, 1920]): string {
  return widths
    .map(width => `${getOptimizedImageUrl(assetPath, { width })} ${width}w`)
    .join(', ');
}

/**
 * Get all images from the images directory in R2
 */
export async function getAllImages(): Promise<MediaAsset[]> {
  return getImagesByDirectory('images');
}

/**
 * Get all documents from the docs directory in R2
 */
export async function getAllDocuments(): Promise<MediaAsset[]> {
  return getDocumentsByDirectory('docs');
}

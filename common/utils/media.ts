import 'server-only';
import type { MediaAsset } from '../types/media';
import { getPublicMediaUrl } from './media-client';
import { getMediaBucket, hasStorageCredentials } from './storage-admin';

export { getPublicMediaUrl };

/**
 * Get all public media assets from Firebase Storage.
 * Returns an empty list when no credentials are available (CI, local without login)
 * so the build never fails.
 */
export async function getPublicAssets(): Promise<MediaAsset[]> {
  if (!hasStorageCredentials()) {
    console.warn('Firebase credentials not configured. Media list will be empty.');
    return [];
  }

  try {
    const [files] = await getMediaBucket().getFiles({ prefix: 'public/' });
    const assets: MediaAsset[] = [];
    for (const file of files) {
      if (file.name === 'public/' || file.name.endsWith('/')) continue;
      const asset = createMediaAsset(file.name, Number(file.metadata.size ?? 0), file.metadata);
      if (asset) assets.push(asset);
    }
    return assets;
  } catch (error) {
    console.error('Error fetching media from Firebase Storage:', error);
    return [];
  }
}

/**
 * Get a specific public asset by path from Firebase Storage
 */
export async function getAssetByPath(assetPath: string): Promise<MediaAsset | null> {
  if (!hasStorageCredentials()) {
    return null;
  }

  const key = `public/${assetPath}`;

  try {
    const [metadata] = await getMediaBucket().file(key).getMetadata();
    return createMediaAsset(key, Number(metadata.size ?? 0), metadata);
  } catch (error) {
    console.error(`Error fetching asset ${assetPath} from Firebase Storage:`, error);
    return null;
  }
}

/**
 * Create a MediaAsset object from Storage object information
 */
function createMediaAsset(
  key: string,
  size: number,
  metadata: Record<string, any>
): MediaAsset | null {
  // Remove 'public/' prefix
  const path = key.replace(/^public\//, '');
  const filename = path.split('/').pop() || '';
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  const type = getMediaType(ext);

  if (!type) {
    return null;
  }

  const uploadedAt = metadata.timeCreated ? new Date(metadata.timeCreated) : new Date();

  return {
    id: path,
    filename,
    path,
    publicUrl: getPublicMediaUrl(path),
    type,
    size,
    isPrivate: false,
    uploadedAt,
    metadata: {
      mimeType: getMimeType(ext),
      extension: ext,
      ...(metadata.metadata ?? {}),
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
 * Get images from a specific directory in Storage
 */
export async function getImagesByDirectory(directory: string): Promise<MediaAsset[]> {
  const allAssets = await getPublicAssets();
  return allAssets.filter(asset => 
    asset.type === 'image' && 
    asset.path.startsWith(directory)
  );
}

/**
 * Get documents from a specific directory in Storage
 */
export async function getDocumentsByDirectory(directory: string): Promise<MediaAsset[]> {
  const allAssets = await getPublicAssets();
  return allAssets.filter(asset => 
    asset.type === 'document' && 
    asset.path.startsWith(directory)
  );
}

/**
 * Get all images from the images directory in Storage
 */
export async function getAllImages(): Promise<MediaAsset[]> {
  return getImagesByDirectory('images');
}

/**
 * Get all documents from the docs directory in Storage
 */
export async function getAllDocuments(): Promise<MediaAsset[]> {
  return getDocumentsByDirectory('docs');
}

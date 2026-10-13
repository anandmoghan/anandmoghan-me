/**
 * Client-safe media utility functions
 * These functions don't use Node.js APIs and can be used in client components
 */

const DEFAULT_STORAGE_BUCKET = 'anandmoghan-me.appspot.com';

/**
 * Name of the Firebase Storage bucket that holds the media.
 * The env var must be read as a literal so Next.js can inline it into client bundles.
 */
export function getStorageBucket(): string {
  return process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET;
}

/**
 * Public download URL for an object key in the media bucket (the single URL builder).
 * Example: public/docs/a b.pdf ->
 * https://firebasestorage.googleapis.com/v0/b/<bucket>/o/public%2Fdocs%2Fa%20b.pdf?alt=media
 */
export function getStorageUrl(key: string, bucket: string = getStorageBucket()): string {
  const cleanKey = key.startsWith('/') ? key.slice(1) : key;
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(cleanKey)}?alt=media`;
}

/**
 * Get the public URL for a media asset under public/ (client-safe)
 */
export function getPublicMediaUrl(assetPath: string): string {
  const cleanPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
  return getStorageUrl(`public/${cleanPath}`);
}

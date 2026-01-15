import type { ImageOptions } from '../types/media';

/**
 * Client-safe media utility functions
 * These functions don't use Node.js APIs and can be used in client components
 */

/**
 * Get the public URL for a media asset (client-safe)
 */
export function getPublicMediaUrl(assetPath: string): string {
  const MEDIA_BASE_URL = process.env.NEXT_PUBLIC_MEDIA_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://media.anandmoghan.me';
  // Remove leading slash if present
  const cleanPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
  return `${MEDIA_BASE_URL}/public/${cleanPath}`;
}

/**
 * Generate optimized image URL with parameters (client-safe)
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
 * Generate srcset for responsive images (client-safe)
 */
export function generateSrcSet(assetPath: string, widths: number[] = [640, 750, 828, 1080, 1200, 1920]): string {
  return widths
    .map(width => `${getOptimizedImageUrl(assetPath, { width })} ${width}w`)
    .join(', ');
}

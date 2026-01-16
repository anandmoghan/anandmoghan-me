export interface MediaAsset {
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

export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill';
}

export interface ResponsiveImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

export interface MediaMetadata {
  originalName: string;
  uploadedAt: string;
  type: 'public' | 'private';
  contentType: string;
  size: number;
  dimensions?: {
    width: number;
    height: number;
  };
}

'use client';

import { useState } from 'react';
import ResponsiveImage from './ResponsiveImage';
import type { MediaAsset } from '../types/media';

interface MediaGalleryProps {
  assets: MediaAsset[];
  columns?: 2 | 3 | 4;
  className?: string;
}

/**
 * MediaGallery component for displaying a grid of images
 * Supports responsive layout and lazy loading
 */
export default function MediaGallery({
  assets,
  columns = 3,
  className = '',
}: MediaGalleryProps) {
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);

  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  const handleAssetClick = (asset: MediaAsset) => {
    setSelectedAsset(asset);
  };

  const handleCloseModal = () => {
    setSelectedAsset(null);
  };

  if (assets.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="mt-4 text-gray-500 dark:text-gray-400">No media assets found</p>
      </div>
    );
  }

  return (
    <>
      <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="group relative cursor-pointer overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 transition-transform hover:scale-105"
            onClick={() => handleAssetClick(asset)}
          >
            {asset.type === 'image' && asset.publicUrl && (
              <ResponsiveImage
                src={asset.path}
                alt={asset.filename}
                className="w-full h-64 object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-end">
              <div className="p-4 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-sm font-medium truncate">{asset.filename}</p>
                {asset.dimensions && (
                  <p className="text-xs">
                    {asset.dimensions.width} × {asset.dimensions.height}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for full-size view */}
      {selectedAsset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          onClick={handleCloseModal}
        >
          <div className="relative max-w-7xl max-h-full">
            <button
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
              onClick={handleCloseModal}
              aria-label="Close"
            >
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            {selectedAsset.type === 'image' && selectedAsset.publicUrl && (
              <img
                src={selectedAsset.publicUrl}
                alt={selectedAsset.filename}
                className="max-w-full max-h-[90vh] object-contain"
              />
            )}
            <div className="mt-4 text-white text-center">
              <p className="font-medium">{selectedAsset.filename}</p>
              {selectedAsset.dimensions && (
                <p className="text-sm text-gray-300">
                  {selectedAsset.dimensions.width} × {selectedAsset.dimensions.height}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

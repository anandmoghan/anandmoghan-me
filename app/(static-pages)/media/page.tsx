import { getAllImages, getAllDocuments } from '@/common/utils/media';
import MediaGallery from '@/common/components/MediaGallery';
import { Card } from '@/common/components/Card';
import type { MediaAsset } from '@/common/types/media';

export const metadata = {
  title: 'Media Gallery',
  description: 'Browse photos and documents from Anand Mohan\'s work and research.',
  openGraph: {
    title: 'Media Gallery - Anand Mohan',
    description: 'Browse photos and documents from Anand Mohan\'s work and research.',
    url: 'https://anandmoghan.me/media',
    siteName: 'Anand Mohan',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Media Gallery - Anand Mohan',
    description: 'Browse photos and documents from Anand Mohan\'s work and research.',
  },
  alternates: {
    canonical: 'https://anandmoghan.me/media'
  }
};

export default async function MediaPage() {
  let images: MediaAsset[] = [];
  let documents: MediaAsset[] = [];
  let error: string | null = null;

  try {
    images = await getAllImages();
    documents = await getAllDocuments();
  } catch (e) {
    console.error('Error loading media:', e);
    error = e instanceof Error ? e.message : 'Failed to load media';
  }

  return (
    <div className="px-6 sm:px-8 lg:px-12 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-gray-100">
          Media Gallery
        </h1>

        {error && (
          <Card className="mb-8 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <p className="text-red-600 dark:text-red-400">
              ⚠️ Error loading media: {error}
            </p>
            <p className="text-sm text-red-500 dark:text-red-500 mt-2">
              Try refreshing the page or check your R2 configuration.
            </p>
          </Card>
        )}

        {/* Images Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Images
          </h2>
          {images.length > 0 ? (
            <MediaGallery assets={images} columns={3} />
          ) : (
            <Card>
              <p className="text-gray-600 dark:text-gray-400">
                No images available yet. Upload images to R2 using: npm run upload-media
              </p>
            </Card>
          )}
        </section>

        {/* Documents Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Documents
          </h2>
          {documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <Card key={doc.id}>
                  <div className="flex items-start space-x-3">
                    <svg
                      className="h-8 w-8 text-blue-500 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {doc.filename}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(doc.size / 1024).toFixed(2)} KB
                      </p>
                      {doc.publicUrl && (
                        <a
                          href={doc.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <p className="text-gray-600 dark:text-gray-400">
                No documents available yet. Upload documents to R2 using: npm run upload-media
              </p>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

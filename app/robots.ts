import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/cdn-cgi/', '/apps/share/'],
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/', '/cdn-cgi/', '/apps/share/'],
      },
    ],
    sitemap: 'https://anandmoghan.me/sitemap.xml',
  };
}

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: ['/dashboard', '/products', '/sellers', '/clients', '/sales', '/settings', '/profile'],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SERVER_URL ?? 'https://www.flowy.ar'}/sitemap.xml`,
  };
}

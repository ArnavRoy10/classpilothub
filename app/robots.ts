import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Logged-in areas and APIs have nothing worth indexing.
        disallow: [
          '/api/', '/admin', '/founder', '/portal', '/dashboard', '/students', '/teachers',
          '/batches', '/attendance', '/tests', '/results', '/timetable', '/fees',
          '/announcements', '/reports', '/settings', '/communications', '/onboarding', '/auth',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}

import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-url'

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number }[] = [
    { path: '', priority: 1 },
    { path: '/features', priority: 0.8 },
    { path: '/pricing', priority: 0.8 },
    { path: '/tutors', priority: 0.7 },
    { path: '/about', priority: 0.5 },
    { path: '/security', priority: 0.4 },
    { path: '/privacy', priority: 0.3 },
    { path: '/terms', priority: 0.3 },
  ]

  return pages.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    priority,
  }))
}

import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-url'

// Only the main public pages. Legal pages, login/signup, tutor profiles and the app itself are left out on purpose.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number; changeFrequency: 'weekly' | 'monthly' }[] = [
    { path: '', priority: 1, changeFrequency: 'weekly' },
    { path: '/features', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/pricing', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/demo', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/about', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/tutors', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/sitemap', priority: 0.3, changeFrequency: 'monthly' },
  ]

  return pages.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }))
}

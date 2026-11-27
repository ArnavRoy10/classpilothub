import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-url'

// Only the homepage is submitted to Google.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_URL}/`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 }]
}

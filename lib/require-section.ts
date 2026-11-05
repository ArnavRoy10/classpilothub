import { redirect } from 'next/navigation'
import { getUserContext } from '@/lib/supabase/user-context'
import { hasPermission } from '@/lib/permissions'

// Server-side guard used by the layout of each protected section.
// Typing the URL by hand does not get around it.
export async function requireSection(key: string, area: 'app' | 'portal' = 'app') {
  const context = await getUserContext()
  if (!context) redirect('/login')
  if (!hasPermission(context, key)) redirect(area === 'portal' ? '/portal' : '/dashboard')
}

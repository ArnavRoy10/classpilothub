'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Shown only when the owner has allowed this student to edit their own profile.
export function ProfileEditor({ fullName, guardianPhone }: { fullName: string; guardianPhone: string }) {
  const router = useRouter()
  const [name, setName] = useState(fullName)
  const [phone, setPhone] = useState(guardianPhone)
  const [saving, setSaving] = useState(false)

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    const response = await fetch('/api/members/self', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fullName: name, guardianPhone: phone }) })
    const result = (await response.json().catch(() => ({}))) as { error?: string }
    setSaving(false)
    if (!response.ok) { toast.error(result.error ?? 'Unable to save'); return }
    toast.success('Profile updated')
    router.refresh()
  }

  return (
    <form onSubmit={save} className="mb-6 grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
      <h2 className="font-display text-lg font-semibold sm:col-span-2">Edit your details</h2>
      <div className="grid gap-2"><Label htmlFor="me-name">Your name</Label><Input id="me-name" required value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="grid gap-2"><Label htmlFor="me-phone">Guardian phone</Label><Input id="me-phone" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      <div className="sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button></div>
    </form>
  )
}

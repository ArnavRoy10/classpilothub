import { NextResponse } from 'next/server'
import { getUserContext } from '@/lib/supabase/user-context'
import { getAdminClient } from '@/lib/supabase/admin'
import { orpZEAWYtiB6bJ16NuLbGCc6CZ6jJdKfb63 } from '@/lib/billing-gate'
import { hasPermission } from '@/lib/permissions'
import { linkStudentToBatch, resolveBatch } from '@/lib/batch-assign'

// POST { studentId, batchId?, newBatchName? }  -> move a student to a batch (or out of all batches).
export async function POST(request: Request) {
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  if (!hasPermission(context, 'students')) return NextResponse.json({ error: 'You do not have access to students.' }, { status: 403 })
  const suspended = await orpZEAWYtiB6bJ16NuLbGCc6CZ6jJdKfb63()
  if (suspended) return suspended

  const body = (await request.json().catch(() => null)) as { studentId?: string; batchId?: string; newBatchName?: string; newBatchMonthlyFee?: number | string | null } | null
  const studentId = String(body?.studentId ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(studentId)) return NextResponse.json({ error: 'Invalid student.' }, { status: 400 })

  const admin = getAdminClient()
  const { data: student } = await admin.from('students').select('id').eq('id', studentId).eq('organization_id', context.organization.id).maybeSingle()
  if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })

  const rawFee = body?.newBatchMonthlyFee
  const parsedFee = rawFee === null || rawFee === undefined || rawFee === '' ? null : Number(rawFee)
  const newBatchMonthlyFee = parsedFee !== null && Number.isFinite(parsedFee) && parsedFee >= 0 && parsedFee <= 1_000_000 ? parsedFee : null

  try {
    const batch = await resolveBatch(admin, context.organization.id, { batchId: body?.batchId, newBatchName: body?.newBatchName, newBatchMonthlyFee }, studentId)
    const warning = await linkStudentToBatch(admin, studentId, batch)
    return NextResponse.json({ batch: batch?.name ?? null, createdBatch: batch?.created ?? false, warning })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not change the batch.' }, { status: 400 })
  }
}

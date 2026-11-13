import 'server-only'

import { getAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof getAdminClient>

export type BatchChoice = { batchId?: string | null; newBatchName?: string | null }
export type ResolvedBatch = { id: string; name: string; created: boolean }

// Finds the batch a student should join, or creates it when a new name was typed.
// Throws an Error with a readable message. Returns null when no batch was chosen.
export async function resolveBatch(admin: Admin, organizationId: string, choice: BatchChoice, ignoreStudentId?: string): Promise<ResolvedBatch | null> {
  const newName = String(choice.newBatchName ?? '').trim()
  const batchId = String(choice.batchId ?? '').trim()

  if (newName) {
    if (newName.length < 2 || newName.length > 80) throw new Error('The new batch name must be 2 to 80 characters.')
    // Reuse a batch with the same name instead of creating a duplicate (the % _ \ characters are matched literally).
    const escaped = newName.replace(/[\\%_]/g, (char) => `\\${char}`)
    const { data: existing } = await admin.from('batches').select('id, name').eq('organization_id', organizationId).ilike('name', escaped).limit(1).maybeSingle()
    if (existing) return { id: existing.id as string, name: existing.name as string, created: false }

    const { data, error } = await admin
      .from('batches')
      .insert({ organization_id: organizationId, name: newName, level: 'General', capacity: 30, schedule: 'To be scheduled' })
      .select('id, name')
      .single()
    if (error || !data) throw new Error(`Could not create the batch: ${error?.message ?? 'unknown error'}`)
    return { id: data.id as string, name: data.name as string, created: true }
  }

  if (!batchId) return null

  const { data: batch } = await admin.from('batches').select('id, name, capacity').eq('id', batchId).eq('organization_id', organizationId).maybeSingle()
  if (!batch) throw new Error('That batch no longer exists. Refresh the page and choose again.')

  const { data: links } = await admin.from('batch_students').select('student_id').eq('batch_id', batch.id)
  const taken = (links ?? []).filter((link) => link.student_id !== ignoreStudentId).length
  const capacity = Number(batch.capacity)
  if (Number.isFinite(capacity) && capacity > 0 && taken >= capacity) throw new Error(`"${batch.name}" is full (${capacity} students). Choose another batch or raise its capacity.`)

  return { id: batch.id as string, name: batch.name as string, created: false }
}

// Puts the student in exactly one batch (or none) and keeps the student's batch name in sync.
// Returns a warning message when the batch list could not be updated, otherwise null.
export async function linkStudentToBatch(admin: Admin, studentId: string, batch: ResolvedBatch | null): Promise<string | null> {
  let warning: string | null = null

  const removal = await admin.from('batch_students').delete().eq('student_id', studentId)
  if (removal.error) warning = `The student was saved, but the batch list could not be updated: ${removal.error.message}`

  if (batch) {
    const insertion = await admin.from('batch_students').insert({ batch_id: batch.id, student_id: studentId })
    if (insertion.error) warning = `The student was saved, but could not be added to the batch: ${insertion.error.message}`
  }

  const nameUpdate = await admin.from('students').update({ batch: batch?.name ?? null }).eq('id', studentId)
  if (nameUpdate.error && !warning) warning = `The student was saved, but the batch name could not be updated: ${nameUpdate.error.message}`

  return warning
}

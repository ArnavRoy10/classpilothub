  async function loadData() {
    setLoading(true)
    // Plain queries (no joins, no optional-column filters), so one missing column or relationship
    // cannot break the whole page. Everything is matched up here instead.
    const [batchResult, teacherResult, studentResult, linkResult] = await Promise.all([
      supabase.from('batches').select('*'),
      supabase.from('teachers').select('*'),
      supabase.from('students').select('*'),
      supabase.from('batch_students').select('batch_id, student_id'),
    ])
    const failed = batchResult.error ? { table: 'batches', error: batchResult.error }
      : teacherResult.error ? { table: 'teachers', error: teacherResult.error }
      : studentResult.error ? { table: 'students', error: studentResult.error }
      : null
    if (failed) {
      console.error('[batches] could not load', failed.table, failed.error)
      toast.error(`Unable to load ${failed.table}: ${failed.error.message}`)
    }
    if (linkResult.error) console.error('[batches] batch_students unavailable', linkResult.error)
    const links = (linkResult.data ?? []) as { batch_id: string; student_id: string }[]

    const batchRows = ((batchResult.data ?? []) as Record<string, unknown>[])
      .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))
      .map((row): Batch => ({
        id: String(row.id),
        name: String(row.name ?? ''),
        level: String(row.level ?? ''),
        capacity: Number(row.capacity ?? 0),
        teacher_id: (row.teacher_id as string | null) ?? null,
        schedule: String(row.schedule ?? ''),
        student_ids: links.filter((link) => link.batch_id === row.id).map((link) => link.student_id),
      }))
    setBatches(batchRows)
    setTeachers(((teacherResult.data ?? []) as Record<string, unknown>[])
      .filter((row) => row.status !== 'inactive')
      .map((row): Teacher => ({ id: String(row.id), full_name: String(row.full_name ?? '') }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name)))
    setStudents(((studentResult.data ?? []) as Record<string, unknown>[])
      .map((row): Student => ({ id: String(row.id), full_name: String(row.full_name ?? ''), student_code: String(row.student_code ?? '') }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name)))
    setLoading(false)
  }

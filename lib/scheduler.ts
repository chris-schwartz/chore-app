import { getServiceClient } from './supabase'
import { format, getDay, getDate } from 'date-fns'

export type Daughter = 'daughter1' | 'daughter2'

const DAUGHTERS: Daughter[] = ['daughter1', 'daughter2']

export async function runDailyScheduler(targetDate?: Date) {
  const db = getServiceClient()
  const today = targetDate || new Date()
  const dateStr = format(today, 'yyyy-MM-dd')
  const dayOfWeek = getDay(today)   // 0 = Sunday
  const dayOfMonth = getDate(today) // 1-31

  console.log(`[Scheduler] Running for ${dateStr} (dow=${dayOfWeek}, dom=${dayOfMonth})`)

  // Fetch all active chores
  const { data: chores, error } = await db
    .from('chores')
    .select('*')
    .eq('active', true)

  if (error) throw error

  const assignmentsToCreate: {
    chore_id: string
    daughter: Daughter
    assigned_date: string
  }[] = []

  for (const chore of chores!) {
    // Is this chore due today?
    let isDue = false
    if (chore.frequency === 'daily') {
      isDue = true
    } else if (chore.frequency === 'weekly') {
      // Due on specified day_of_week, or Sunday if not set
      isDue = dayOfWeek === (chore.day_of_week ?? 0)
    } else if (chore.frequency === 'monthly') {
      // Due on specified day_of_month, or 1st if not set
      isDue = dayOfMonth === (chore.day_of_month ?? 1)
    }

    if (!isDue) continue

    // Determine which daughters get it
    const recipients: Daughter[] =
      chore.daughter === 'both' ? DAUGHTERS : [chore.daughter as Daughter]

    for (const daughter of recipients) {
      assignmentsToCreate.push({
        chore_id: chore.id,
        daughter,
        assigned_date: dateStr,
      })
    }
  }

  if (assignmentsToCreate.length === 0) {
    console.log('[Scheduler] No assignments needed today')
    return { created: 0 }
  }

  // Upsert (ignore duplicates if cron runs twice)
  const { error: insertError, data: insertedRows } = await db
    .from('assignments')
    .upsert(assignmentsToCreate, {
      onConflict: 'chore_id,daughter,assigned_date',
      ignoreDuplicates: true,
    })
    .select('id')

  if (insertError) throw insertError

  const count = insertedRows?.length ?? 0
  console.log(`[Scheduler] Created ${count} assignments`)
  return { created: count }
}

export function getDaughterConfig(daughter: Daughter) {
  if (daughter === 'daughter1') {
    return {
      name: process.env.DAUGHTER_1_NAME || 'Daughter 1',
      email: process.env.DAUGHTER_1_EMAIL,
      phone: process.env.DAUGHTER_1_PHONE,
      slug: 'daughter1',
    }
  }
  return {
    name: process.env.DAUGHTER_2_NAME || 'Daughter 2',
    email: process.env.DAUGHTER_2_EMAIL,
    phone: process.env.DAUGHTER_2_PHONE,
    slug: 'daughter2',
  }
}

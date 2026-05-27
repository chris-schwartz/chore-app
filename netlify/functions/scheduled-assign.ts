import type { Config } from '@netlify/functions'
import { runDailyScheduler, getDaughterConfig } from '../../lib/scheduler'
import { sendNotifications } from '../../lib/notifications'
import { getServiceClient } from '../../lib/supabase'
import { format } from 'date-fns'

// This replaces vercel.json cron — Netlify calls this on schedule automatically
export default async function handler() {
  try {
    const result = await runDailyScheduler()

    const db = getServiceClient()
    const today = format(new Date(), 'yyyy-MM-dd')
    const notifyMethod = (process.env.NOTIFY_METHOD as any) || 'email'

    for (const daughter of ['daughter1', 'daughter2'] as const) {
      const { data } = await db
        .from('assignments')
        .select('chore:chores(name, description)')
        .eq('daughter', daughter)
        .eq('assigned_date', today)

      const chores = (data || []).map((a: any) => a.chore)
      await sendNotifications(daughter, chores, notifyMethod, new Date())
    }

    console.log(`[Scheduled] Done for ${today}. Assignments created: ${result.created}`)
  } catch (err) {
    console.error('[Scheduled] Error:', err)
  }
}

export const config: Config = {
  schedule: '0 12 * * *',
}

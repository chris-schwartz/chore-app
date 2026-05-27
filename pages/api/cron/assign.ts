import type { NextApiRequest, NextApiResponse } from 'next'
import { runDailyScheduler, getDaughterConfig } from '../../../lib/scheduler'
import { sendNotifications } from '../../../lib/notifications'
import { getServiceClient } from '../../../lib/supabase'
import { format } from 'date-fns'

// This route is for manual triggering from the admin panel only.
// The actual daily cron runs via netlify/functions/scheduled-assign.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()

  const auth = req.headers.authorization
  const isAdmin = auth === `Bearer ${process.env.ADMIN_PASSWORD}`
  const isCron  = auth === `Bearer ${process.env.CRON_SECRET}`

  if (!isAdmin && !isCron) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

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

    const config1 = getDaughterConfig('daughter1')
    const config2 = getDaughterConfig('daughter2')

    return res.json({
      ok: true,
      created: result.created,
      date: today,
      message: `Scheduler ran for ${today}. Created ${result.created} assignments. Notifications sent to ${config1.name} and ${config2.name}.`,
    })
  } catch (err: any) {
    console.error('[Cron] Error:', err)
    return res.status(500).json({ error: err.message })
  }
}

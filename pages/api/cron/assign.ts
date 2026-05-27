import type { NextApiRequest, NextApiResponse } from 'next'
import { runDailyScheduler, getDaughterConfig } from '../../../lib/scheduler'
import { sendNotifications } from '../../../lib/notifications'
import { getServiceClient } from '../../../lib/supabase'
import { format } from 'date-fns'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()

  // Verify secret (Vercel cron sends it as Authorization header, admin panel sends it too)
  const auth = req.headers.authorization
  const isVercelCron = req.headers['x-vercel-cron-signature'] !== undefined
  const isAdmin = auth === `Bearer ${process.env.ADMIN_PASSWORD}`
  const isCron = auth === `Bearer ${process.env.CRON_SECRET}`

  if (!isVercelCron && !isAdmin && !isCron) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // 1. Assign chores for today
    const result = await runDailyScheduler()

    // 2. Fetch today's assignments per daughter and send notifications
    const db = getServiceClient()
    const today = format(new Date(), 'yyyy-MM-dd')
    const notifyMethod = (process.env.NOTIFY_METHOD as any) || 'email'

    const daughters = ['daughter1', 'daughter2'] as const

    for (const daughter of daughters) {
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

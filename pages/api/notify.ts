import type { NextApiRequest, NextApiResponse } from 'next'
import { sendNotifications } from '../../lib/notifications'
import { getServiceClient } from '../../lib/supabase'
import { format } from 'date-fns'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const db = getServiceClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const notifyMethod = (process.env.NOTIFY_METHOD as any) || 'email'

  try {
    const daughters = ['daughter1', 'daughter2'] as const
    for (const daughter of daughters) {
      const { data } = await db
        .from('assignments')
        .select('chore:chores(name, description)')
        .eq('daughter', daughter)
        .eq('assigned_date', today)

      const chores = (data || []).map((a: any) => a.chore)
      await sendNotifications(daughter, chores, notifyMethod)
    }

    return res.json({ message: 'Notifications sent!' })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}

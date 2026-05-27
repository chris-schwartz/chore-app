import type { NextApiRequest, NextApiResponse } from 'next'
import { getServiceClient } from '../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') return res.status(405).end()

  const { id, completed } = req.body
  if (!id || completed === undefined) {
    return res.status(400).json({ error: 'Missing id or completed' })
  }

  const db = getServiceClient()
  const { error } = await db
    .from('assignments')
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', id)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ ok: true })
}

import type { NextApiRequest, NextApiResponse } from 'next'
import { getServiceClient } from '../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getServiceClient()

  if (req.method === 'GET') {
    const { data, error } = await db
      .from('chores')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ chores: data })
  }

  if (req.method === 'POST') {
    const { name, description, daughter, frequency, day_of_week, day_of_month } = req.body
    if (!name || !daughter || !frequency) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    const { data, error } = await db
      .from('chores')
      .insert({ name, description, daughter, frequency, day_of_week, day_of_month })
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ chore: data })
  }

  if (req.method === 'PUT') {
    const { id, ...updates } = req.body
    if (!id) return res.status(400).json({ error: 'Missing id' })
    const { data, error } = await db
      .from('chores')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ chore: data })
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'Missing id' })
    const { error } = await db.from('chores').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  }

  return res.status(405).end()
}

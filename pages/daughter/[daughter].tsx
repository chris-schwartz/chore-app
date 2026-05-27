import { useState } from 'react'
import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { getServiceClient } from '../../lib/supabase'
import { format } from 'date-fns'

type Assignment = {
  id: string
  completed: boolean
  chore: {
    name: string
    description: string
    frequency: string
  }
}

type Props = {
  daughter: 'daughter1' | 'daughter2'
  name: string
  assignments: Assignment[]
  dateLabel: string
  error?: string
}

export default function DaughterDashboard({ daughter, name, assignments: initial, dateLabel, error }: Props) {
  const [assignments, setAssignments] = useState(initial)
  const [checking, setChecking] = useState<string | null>(null)

  const completed = assignments.filter(a => a.completed).length
  const total = assignments.length
  const allDone = total > 0 && completed === total
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100)

  async function toggleChore(id: string, current: boolean) {
    setChecking(id)
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, completed: !current } : a))

    await fetch('/api/assignments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, completed: !current }),
    })
    setChecking(null)
  }

  const freqEmoji: Record<string, string> = { daily: '🌅', weekly: '📅', monthly: '🗓' }

  return (
    <>
      <Head>
        <title>{name}'s Chores</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={s.page}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerContent}>
            <div style={s.greeting}>Good {timeOfDay()}!</div>
            <h1 style={s.name}>{name} ✨</h1>
            <p style={s.date}>{dateLabel}</p>
          </div>

          {/* Progress circle */}
          <div style={s.progressWrap}>
            <svg width="88" height="88" viewBox="0 0 88 88">
              <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6"/>
              <circle
                cx="44" cy="44" r="36"
                fill="none"
                stroke={allDone ? '#a8d5a2' : '#c9a96e'}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress / 100)}`}
                transform="rotate(-90 44 44)"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div style={s.progressText}>
              <div style={s.progressNum}>{completed}/{total}</div>
              <div style={s.progressLabel}>done</div>
            </div>
          </div>
        </div>

        {/* All done banner */}
        {allDone && (
          <div style={s.allDone}>
            <span style={{ fontSize: 24 }}>🎉</span>
            <div>
              <div style={s.allDoneTitle}>All done!</div>
              <div style={s.allDoneSub}>Amazing work today, {name.split(' ')[0]}!</div>
            </div>
          </div>
        )}

        {/* Chore list */}
        <div style={s.list}>
          {error ? (
            <div style={s.empty}>{error}</div>
          ) : assignments.length === 0 ? (
            <div style={s.empty}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🌸</div>
              <p>No chores today — enjoy your free time!</p>
            </div>
          ) : (
            assignments.map(a => (
              <button
                key={a.id}
                onClick={() => toggleChore(a.id, a.completed)}
                style={{
                  ...s.choreItem,
                  ...(a.completed ? s.choreItemDone : {}),
                  ...(checking === a.id ? { opacity: 0.7 } : {}),
                }}
                disabled={checking === a.id}
              >
                {/* Checkbox */}
                <div style={{
                  ...s.checkbox,
                  ...(a.completed ? s.checkboxDone : {}),
                }}>
                  {a.completed && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div style={s.choreContent}>
                  <div style={{
                    ...s.choreName,
                    ...(a.completed ? s.choreNameDone : {}),
                  }}>
                    {a.chore.name}
                  </div>
                  {a.chore.description && (
                    <div style={s.choreDesc}>{a.chore.description}</div>
                  )}
                </div>

                {/* Freq badge */}
                <div style={s.freqBadge}>
                  {freqEmoji[a.chore.frequency] || '📌'}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer note */}
        <p style={s.footer}>Tap a chore to check it off ✓</p>
      </div>
    </>
  )
}

function timeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const daughter = params?.daughter as string
  if (!['daughter1', 'daughter2'].includes(daughter)) {
    return { notFound: true }
  }

  const name = daughter === 'daughter1'
    ? (process.env.DAUGHTER_1_NAME || 'Daughter 1')
    : (process.env.DAUGHTER_2_NAME || 'Daughter 2')

  const today = format(new Date(), 'yyyy-MM-dd')
  const dateLabel = format(new Date(), 'EEEE, MMMM do')

  try {
    const db = getServiceClient()
    const { data, error } = await db
      .from('assignments')
      .select('id, completed, chore:chores(name, description, frequency)')
      .eq('daughter', daughter)
      .eq('assigned_date', today)
      .order('created_at')

    if (error) throw error

    return {
      props: {
        daughter,
        name,
        dateLabel,
        assignments: data || [],
      },
    }
  } catch (err) {
    return {
      props: {
        daughter,
        name,
        dateLabel,
        assignments: [],
        error: 'Could not load chores. Please try again later.',
      },
    }
  }
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#fdf8f0', display: 'flex', flexDirection: 'column' },
  header: { background: '#2d1f0e', padding: '36px 24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  headerContent: { flex: 1 },
  greeting: { fontSize: 13, color: '#c9a96e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 },
  name: { fontFamily: 'Lora, Georgia, serif', fontSize: 32, fontWeight: 400, color: '#fdf8f0', lineHeight: 1.2, marginBottom: 6 },
  date: { fontSize: 14, color: '#8a7a6a' },
  progressWrap: { position: 'relative', width: 88, height: 88, flexShrink: 0 },
  progressText: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  progressNum: { fontSize: 18, fontWeight: 500, color: '#fdf8f0', lineHeight: 1 },
  progressLabel: { fontSize: 11, color: '#8a7a6a', marginTop: 2 },
  allDone: { background: '#f0f7ef', border: '1.5px solid #a8d5a2', borderRadius: 14, margin: '24px 20px 0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 },
  allDoneTitle: { fontWeight: 500, color: '#2d5a2a', fontSize: 16 },
  allDoneSub: { fontSize: 13, color: '#5a8a57', marginTop: 2 },
  list: { padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 },
  choreItem: { width: '100%', background: '#fff', border: '1.5px solid #f0e8d6', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease', boxShadow: '0 1px 6px rgba(45,31,14,0.05)' },
  choreItemDone: { background: '#f8fdf7', borderColor: '#c8eac5' },
  checkbox: { width: 26, height: 26, borderRadius: 8, border: '2px solid #d5c8b8', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' },
  checkboxDone: { background: '#5a9a57', border: '2px solid #5a9a57' },
  choreContent: { flex: 1, minWidth: 0 },
  choreName: { fontSize: 16, fontWeight: 500, color: '#2d1f0e', lineHeight: 1.3 },
  choreNameDone: { textDecoration: 'line-through', color: '#8a9a87', fontWeight: 400 },
  choreDesc: { fontSize: 13, color: '#8a7560', marginTop: 3, lineHeight: 1.4 },
  freqBadge: { fontSize: 18, flexShrink: 0 },
  empty: { textAlign: 'center', padding: '48px 24px', color: '#8a7560', lineHeight: 1.8, fontSize: 15 },
  footer: { textAlign: 'center', padding: '0 0 32px', fontSize: 12, color: '#c0b5a8' },
}

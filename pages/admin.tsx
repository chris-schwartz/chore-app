import { useState, useEffect } from 'react'
import Head from 'next/head'

type Chore = {
  id: string
  name: string
  description: string
  daughter: 'daughter1' | 'daughter2' | 'both'
  frequency: 'daily' | 'weekly' | 'monthly'
  day_of_week: number | null
  day_of_month: number | null
  active: boolean
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAUGHTER_LABELS: Record<string, string> = {
  daughter1: process.env.NEXT_PUBLIC_D1_NAME || 'Daughter 1',
  daughter2: process.env.NEXT_PUBLIC_D2_NAME || 'Daughter 2',
  both: 'Both',
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [chores, setChores] = useState<Chore[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingChore, setEditingChore] = useState<Chore | null>(null)

  const emptyForm = {
    name: '',
    description: '',
    daughter: 'daughter1' as const,
    frequency: 'daily' as const,
    day_of_week: 1,
    day_of_month: 1,
  }
  const [form, setForm] = useState(emptyForm)

  async function login() {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      setAuthed(true)
      loadChores()
    } else {
      setAuthError('Wrong password')
    }
  }

  async function loadChores() {
    setLoading(true)
    const res = await fetch('/api/chores')
    const data = await res.json()
    setChores(data.chores || [])
    setLoading(false)
  }

  async function saveChore() {
    setSaving(true)
    const method = editingChore ? 'PUT' : 'POST'
    const body = editingChore ? { ...form, id: editingChore.id } : form
    const res = await fetch('/api/chores', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      showToast(editingChore ? 'Chore updated!' : 'Chore added!')
      setShowForm(false)
      setEditingChore(null)
      setForm(emptyForm)
      loadChores()
    }
    setSaving(false)
  }

  async function toggleActive(chore: Chore) {
    await fetch('/api/chores', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: chore.id, active: !chore.active }),
    })
    loadChores()
  }

  async function deleteChore(id: string) {
    if (!confirm('Delete this chore?')) return
    await fetch(`/api/chores?id=${id}`, { method: 'DELETE' })
    showToast('Chore deleted')
    loadChores()
  }

  async function runScheduler() {
    setSaving(true)
    const res = await fetch('/api/cron/assign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${password}` },
    })
    const data = await res.json()
    showToast(`Scheduler ran — ${data.created ?? 0} assignments created`)
    setSaving(false)
  }

  async function sendTestNotifications() {
    setSaving(true)
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true }),
    })
    const data = await res.json()
    showToast(data.message || 'Notifications sent!')
    setSaving(false)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function startEdit(chore: Chore) {
    setForm({
      name: chore.name,
      description: chore.description || '',
      daughter: chore.daughter,
      frequency: chore.frequency,
      day_of_week: chore.day_of_week ?? 1,
      day_of_month: chore.day_of_month ?? 1,
    })
    setEditingChore(chore)
    setShowForm(true)
  }

  const activeChores = chores.filter(c => c.active)
  const inactiveChores = chores.filter(c => !c.active)

  if (!authed) {
    return (
      <>
        <Head><title>Admin — Chore Chart</title></Head>
        <div style={styles.loginWrap}>
          <div style={styles.loginCard}>
            <div style={styles.loginIcon}>🏡</div>
            <h1 style={styles.loginTitle}>Chore Chart</h1>
            <p style={styles.loginSub}>Admin access</p>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              style={styles.input}
              autoFocus
            />
            {authError && <p style={styles.error}>{authError}</p>}
            <button onClick={login} style={styles.btnPrimary}>Sign in</button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head><title>Admin — Chore Chart</title></Head>
      <div style={styles.page}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerInner}>
            <div>
              <h1 style={styles.pageTitle}>Chore Chart</h1>
              <p style={styles.pageSub}>Manage chores & schedules</p>
            </div>
            <div style={styles.headerActions}>
              <button onClick={runScheduler} style={styles.btnSecondary} disabled={saving}>
                ▶ Run scheduler now
              </button>
              <button onClick={sendTestNotifications} style={styles.btnSecondary} disabled={saving}>
                📬 Send test notifications
              </button>
              <button onClick={() => { setShowForm(true); setEditingChore(null); setForm(emptyForm) }} style={styles.btnPrimary}>
                + Add chore
              </button>
            </div>
          </div>
        </header>

        <main style={styles.main}>
          {/* Daughter dashboard links */}
          <div style={styles.dashLinks}>
            <a href="/daughter/daughter1" target="_blank" style={styles.dashLink}>
              <span style={styles.dashLinkIcon}>👧</span>
              <div>
                <div style={styles.dashLinkName}>{process.env.NEXT_PUBLIC_D1_NAME || 'Daughter 1'}'s dashboard</div>
                <div style={styles.dashLinkUrl}>/daughter/daughter1</div>
              </div>
              <span style={{marginLeft:'auto', opacity:.5}}>↗</span>
            </a>
            <a href="/daughter/daughter2" target="_blank" style={styles.dashLink}>
              <span style={styles.dashLinkIcon}>👧</span>
              <div>
                <div style={styles.dashLinkName}>{process.env.NEXT_PUBLIC_D2_NAME || 'Daughter 2'}'s dashboard</div>
                <div style={styles.dashLinkUrl}>/daughter/daughter2</div>
              </div>
              <span style={{marginLeft:'auto', opacity:.5}}>↗</span>
            </a>
          </div>

          {/* Add/Edit Form */}
          {showForm && (
            <div style={styles.formCard}>
              <div style={styles.formHeader}>
                <h2 style={styles.formTitle}>{editingChore ? 'Edit chore' : 'Add new chore'}</h2>
                <button onClick={() => { setShowForm(false); setEditingChore(null) }} style={styles.btnIcon}>✕</button>
              </div>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Chore name *</label>
                  <input
                    style={styles.input}
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Wash dishes"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Description (optional)</label>
                  <input
                    style={styles.input}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="e.g. Use hot water and dish soap"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Assigned to</label>
                  <select style={styles.select} value={form.daughter} onChange={e => setForm({ ...form, daughter: e.target.value as any })}>
                    <option value="daughter1">{process.env.NEXT_PUBLIC_D1_NAME || 'Daughter 1'}</option>
                    <option value="daughter2">{process.env.NEXT_PUBLIC_D2_NAME || 'Daughter 2'}</option>
                    <option value="both">Both daughters</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Frequency</label>
                  <select style={styles.select} value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value as any })}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                {form.frequency === 'weekly' && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Day of week</label>
                    <select style={styles.select} value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: +e.target.value })}>
                      {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </div>
                )}
                {form.frequency === 'monthly' && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Day of month</label>
                    <select style={styles.select} value={form.day_of_month} onChange={e => setForm({ ...form, day_of_month: +e.target.value })}>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div style={styles.formActions}>
                <button onClick={() => { setShowForm(false); setEditingChore(null) }} style={styles.btnSecondary}>Cancel</button>
                <button onClick={saveChore} style={styles.btnPrimary} disabled={!form.name || saving}>
                  {saving ? 'Saving...' : editingChore ? 'Save changes' : 'Add chore'}
                </button>
              </div>
            </div>
          )}

          {/* Chores list */}
          {loading ? (
            <div style={styles.empty}>Loading chores...</div>
          ) : chores.length === 0 ? (
            <div style={styles.empty}>
              <div style={{fontSize: 40, marginBottom: 12}}>🌱</div>
              <p>No chores yet. Add your first one above!</p>
            </div>
          ) : (
            <>
              <ChoreSection
                title="Active chores"
                chores={activeChores}
                onEdit={startEdit}
                onToggle={toggleActive}
                onDelete={deleteChore}
              />
              {inactiveChores.length > 0 && (
                <ChoreSection
                  title="Inactive chores"
                  chores={inactiveChores}
                  onEdit={startEdit}
                  onToggle={toggleActive}
                  onDelete={deleteChore}
                  muted
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div style={styles.toast}>{toast}</div>
      )}
    </>
  )
}

function ChoreSection({ title, chores, onEdit, onToggle, onDelete, muted }: any) {
  if (chores.length === 0) return null
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ ...styles.sectionTitle, opacity: muted ? 0.5 : 1 }}>{title} ({chores.length})</h2>
      <div style={styles.choreGrid}>
        {chores.map((c: Chore) => (
          <ChoreCard key={c.id} chore={c} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} muted={muted} />
        ))}
      </div>
    </div>
  )
}

function ChoreCard({ chore, onEdit, onToggle, onDelete, muted }: any) {
  const freqColor: Record<string, string> = {
    daily: '#7a9e7e',
    weekly: '#c9a96e',
    monthly: '#d4877a',
  }
  const assignedTo = chore.daughter === 'both'
    ? 'Both'
    : chore.daughter === 'daughter1'
      ? (process.env.NEXT_PUBLIC_D1_NAME || 'D1')
      : (process.env.NEXT_PUBLIC_D2_NAME || 'D2')

  const scheduleLabel = chore.frequency === 'daily'
    ? 'Every day'
    : chore.frequency === 'weekly'
      ? `Every ${DAYS[chore.day_of_week ?? 0]}`
      : `Monthly on the ${chore.day_of_month ?? 1}${ordinal(chore.day_of_month ?? 1)}`

  return (
    <div style={{ ...styles.choreCard, opacity: muted ? 0.6 : 1 }}>
      <div style={styles.choreCardTop}>
        <div style={{ flex: 1 }}>
          <div style={styles.choreName}>{chore.name}</div>
          {chore.description && <div style={styles.choreDesc}>{chore.description}</div>}
        </div>
        <div style={styles.choreActions}>
          <button onClick={() => onEdit(chore)} style={styles.btnIcon} title="Edit">✎</button>
          <button onClick={() => onToggle(chore)} style={styles.btnIcon} title={chore.active ? 'Deactivate' : 'Activate'}>
            {chore.active ? '⏸' : '▶'}
          </button>
          <button onClick={() => onDelete(chore.id)} style={{ ...styles.btnIcon, color: '#d4877a' }} title="Delete">🗑</button>
        </div>
      </div>
      <div style={styles.choreMeta}>
        <span style={{ ...styles.badge, background: freqColor[chore.frequency] + '22', color: freqColor[chore.frequency] }}>
          {chore.frequency}
        </span>
        <span style={styles.badgeGray}>{assignedTo}</span>
        <span style={styles.scheduleLabel}>{scheduleLabel}</span>
      </div>
    </div>
  )
}

function ordinal(n: number) {
  if (n >= 11 && n <= 13) return 'th'
  switch (n % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

const styles: Record<string, React.CSSProperties> = {
  loginWrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fdf8f0' },
  loginCard: { background: '#fff', borderRadius: 20, padding: '48px 40px', width: 360, textAlign: 'center', boxShadow: '0 8px 40px rgba(45,31,14,0.10)' },
  loginIcon: { fontSize: 48, marginBottom: 16 },
  loginTitle: { fontFamily: 'Lora, Georgia, serif', fontSize: 28, fontWeight: 400, color: '#2d1f0e', marginBottom: 4 },
  loginSub: { fontSize: 14, color: '#8a7560', marginBottom: 28 },
  error: { fontSize: 13, color: '#d4877a', marginTop: 8 },
  page: { minHeight: '100vh', background: '#fdf8f0' },
  header: { background: '#2d1f0e', padding: '0 24px' },
  headerInner: { maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0', flexWrap: 'wrap', gap: 12 },
  pageTitle: { fontFamily: 'Lora, Georgia, serif', fontSize: 24, fontWeight: 400, color: '#fdf8f0' },
  pageSub: { fontSize: 13, color: '#c9a96e', marginTop: 2 },
  headerActions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  main: { maxWidth: 1100, margin: '0 auto', padding: '32px 24px' },
  dashLinks: { display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' },
  dashLink: { display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1.5px solid #f0e8d6', borderRadius: 12, padding: '14px 20px', flex: 1, minWidth: 240, transition: 'border-color 0.15s', cursor: 'pointer' },
  dashLinkIcon: { fontSize: 24 },
  dashLinkName: { fontSize: 15, fontWeight: 500, color: '#2d1f0e' },
  dashLinkUrl: { fontSize: 12, color: '#8a7560', marginTop: 2 },
  formCard: { background: '#fff', border: '1.5px solid #f0e8d6', borderRadius: 16, padding: 28, marginBottom: 32 },
  formHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  formTitle: { fontFamily: 'Lora, Georgia, serif', fontSize: 20, fontWeight: 400, color: '#2d1f0e' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 24 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  formActions: { display: 'flex', gap: 10, justifyContent: 'flex-end' },
  sectionTitle: { fontFamily: 'Lora, Georgia, serif', fontSize: 18, fontWeight: 400, color: '#2d1f0e', marginBottom: 14 },
  choreGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 },
  choreCard: { background: '#fff', border: '1.5px solid #f0e8d6', borderRadius: 14, padding: '18px 20px', transition: 'box-shadow 0.15s' },
  choreCardTop: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  choreName: { fontSize: 15, fontWeight: 500, color: '#2d1f0e', lineHeight: 1.4 },
  choreDesc: { fontSize: 13, color: '#8a7560', marginTop: 3, lineHeight: 1.4 },
  choreActions: { display: 'flex', gap: 4, flexShrink: 0 },
  choreMeta: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: { fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20, letterSpacing: '0.03em', textTransform: 'capitalize' },
  badgeGray: { fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20, background: '#f0e8d6', color: '#8a7560' },
  scheduleLabel: { fontSize: 12, color: '#b0a090' },
  empty: { textAlign: 'center', padding: '64px 24px', color: '#8a7560', lineHeight: 1.8 },
  input: { width: '100%', padding: '10px 14px', border: '1.5px solid #f0e8d6', borderRadius: 8, fontSize: 14, color: '#2d1f0e', background: '#fdf8f0', transition: 'border-color 0.15s' },
  select: { width: '100%', padding: '10px 14px', border: '1.5px solid #f0e8d6', borderRadius: 8, fontSize: 14, color: '#2d1f0e', background: '#fdf8f0', cursor: 'pointer' },
  label: { fontSize: 12, fontWeight: 500, color: '#8a7560', letterSpacing: '0.05em', textTransform: 'uppercase' },
  btnPrimary: { background: '#2d1f0e', color: '#fdf8f0', padding: '10px 22px', borderRadius: 8, fontSize: 14, fontWeight: 500, transition: 'opacity 0.15s', cursor: 'pointer' },
  btnSecondary: { background: 'transparent', color: '#2d1f0e', padding: '10px 18px', borderRadius: 8, fontSize: 13, border: '1.5px solid #f0e8d6', transition: 'border-color 0.15s', cursor: 'pointer' },
  btnIcon: { background: 'transparent', color: '#8a7560', padding: '4px 8px', borderRadius: 6, fontSize: 15, cursor: 'pointer' },
  toast: { position: 'fixed', bottom: 28, right: 28, background: '#2d1f0e', color: '#fdf8f0', padding: '12px 24px', borderRadius: 10, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 9999, animation: 'fadeIn 0.2s ease' },
}

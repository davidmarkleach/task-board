export const LIST_COLORS = {
  slate: '#101204',
  green: '#164b35',
  yellow: '#7f5f01',
  orange: '#7f3f0f',
  red: '#ae2e24',
  blue: '#09326c',
  purple: '#352c63',
  pink: '#50253f',
}

const AVATAR_COLORS = ['#0055cc', '#1f845a', '#e2b203', '#c9372c', '#6e5dc6', '#227d9b', '#ae4787']

export function avatarColor(id = '') {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function initials(name = '?') {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
}

// Position for an item dropped at `index` among `items` (already excluding the moved item).
export function positionAt(items, index) {
  const before = items[index - 1]?.position
  const after = items[index]?.position
  if (before == null && after == null) return 1
  if (before == null) return after - 1
  if (after == null) return before + 1
  return (before + after) / 2
}

export function formatDue(date) {
  if (!date) return ''
  const d = new Date(date + 'T00:00:00')
  const opts = { month: 'short', day: 'numeric' }
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric'
  return d.toLocaleDateString(undefined, opts)
}

export function dueStatus(card) {
  if (!card.due_date) return null
  if (card.completed) return 'done'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(card.due_date + 'T00:00:00')
  const days = (due - today) / 86400000
  if (days < 0) return 'overdue'
  if (days <= 1) return 'soon'
  return 'later'
}

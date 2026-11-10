import { useEffect, useState } from 'react'
import { api } from './api'

export default function ArchiveModal({ onClose, onRestore }) {
  const [cards, setCards] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/api/cards/archived').then(setCards).catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function restore(card) {
    setCards((cs) => cs.filter((c) => c.id !== card.id))
    await onRestore(card)
  }

  async function remove(card) {
    if (!confirm(`Permanently delete "${card.title}"? This can't be undone.`)) return
    setCards((cs) => cs.filter((c) => c.id !== card.id))
    await api.del(`/api/cards/${card.id}`).catch((e) => alert(e.message))
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="icon-btn modal-close" onClick={onClose} title="Close">✕</button>
        <h2 className="modal-heading">Archived cards</h2>
        <p className="muted">Tip: hover over any card on the board and press C to archive it.</p>
        {error && <p className="msg error">{error}</p>}
        {!cards && !error && <p className="muted">Loading…</p>}
        {cards?.length === 0 && <p>No archived cards.</p>}
        <ul className="team-list">
          {cards?.map((c) => (
            <li key={c.id}>
              <div className="team-who">
                <div>{c.title}</div>
                <div className="muted">in {c.list_title} · archived {new Date(c.updated_at).toLocaleDateString()}</div>
              </div>
              <button className="link" onClick={() => restore(c)}>Restore</button>
              <button className="link danger-link" onClick={() => remove(c)}>Delete</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

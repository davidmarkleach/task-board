import { useEffect, useState } from 'react'
import Avatar from './Avatar'

export default function CardModal({ card, lists, profiles, profileById, onClose, onUpdate, onDelete }) {
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description)

  useEffect(() => setTitle(card.title), [card.title])
  useEffect(() => setDescription(card.description), [card.description])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function saveTitle() {
    const t = title.trim()
    if (t && t !== card.title) onUpdate({ title: t })
    else setTitle(card.title)
  }
  function saveDescription() {
    if (description !== card.description) onUpdate({ description })
  }

  const creator = profileById[card.created_by]

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="icon-btn modal-close" onClick={onClose} title="Close">✕</button>

        <div className="modal-title-row">
          <button
            className={'check big' + (card.completed ? ' on' : '')}
            onClick={() => onUpdate({ completed: !card.completed })}
            title={card.completed ? 'Mark incomplete' : 'Mark complete'}
          >
            {card.completed ? '✓' : ''}
          </button>
          <textarea
            className="modal-title"
            value={title}
            rows={1}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
          />
        </div>

        <div className="fields">
          <label>
            <span>List</span>
            <select value={card.list_id} onChange={(e) => onUpdate({ list_id: e.target.value, position: Date.now() / 1e6 })}>
              {lists.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
          </label>
          <label>
            <span>Assigned to</span>
            <div className="assignee-row">
              {profileById[card.assignee] && <Avatar profile={profileById[card.assignee]} size={24} />}
              <select value={card.assignee || ''} onChange={(e) => onUpdate({ assignee: e.target.value || null })}>
                <option value="">Nobody</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
          </label>
          <label>
            <span>Due date</span>
            <div className="assignee-row">
              <input type="date" value={card.due_date || ''} onChange={(e) => onUpdate({ due_date: e.target.value || null })} />
              {card.due_date && <button className="link" onClick={() => onUpdate({ due_date: null })}>Clear</button>}
            </div>
          </label>
        </div>

        <div className="section-label">Description</div>
        <textarea
          className="description"
          placeholder="Add a more detailed description…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={saveDescription}
        />

        <div className="modal-footer">
          <span className="muted">
            {creator ? `Created by ${creator.full_name} · ` : ''}
            {new Date(card.created_at).toLocaleDateString()}
          </span>
          <button className="btn danger" onClick={() => confirm('Delete this card?') && onDelete()}>Delete card</button>
        </div>
      </div>
    </div>
  )
}

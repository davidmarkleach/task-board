import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { supabase } from './supabase'
import { LIST_COLORS, positionAt, formatDue, dueStatus } from './util'
import Avatar from './Avatar'
import CardModal from './CardModal'

export default function Board({ session }) {
  const [lists, setLists] = useState([])
  const [cards, setCards] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [openCardId, setOpenCardId] = useState(null)
  const [query, setQuery] = useState('')
  const [userMenu, setUserMenu] = useState(false)
  const reloadTimer = useRef(null)

  const load = useCallback(async () => {
    const [l, c, p] = await Promise.all([
      supabase.from('lists').select('*').order('position'),
      supabase.from('cards').select('*').order('position'),
      supabase.from('profiles').select('*').order('full_name'),
    ])
    const err = l.error || c.error || p.error
    if (err) console.error(err)
    else {
      setLists(l.data)
      setCards(c.data)
      setProfiles(p.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const scheduleReload = () => {
      clearTimeout(reloadTimer.current)
      reloadTimer.current = setTimeout(load, 250)
    }
    const channel = supabase
      .channel('board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lists' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, scheduleReload)
      .subscribe()
    return () => {
      clearTimeout(reloadTimer.current)
      supabase.removeChannel(channel)
    }
  }, [load])

  const profileById = useMemo(() => Object.fromEntries(profiles.map((p) => [p.id, p])), [profiles])
  const me = profileById[session.user.id]

  const cardsByList = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out = {}
    for (const l of lists) out[l.id] = []
    for (const c of cards) {
      if (q && !(c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))) continue
      out[c.list_id]?.push(c)
    }
    for (const id in out) out[id].sort((a, b) => a.position - b.position)
    return out
  }, [lists, cards, query])

  async function run(promise) {
    const { error } = await promise
    if (error) {
      alert(error.message)
      load()
    }
  }

  // ---------- mutations (optimistic, then saved) ----------
  function updateCard(id, patch) {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)))
    run(supabase.from('cards').update(patch).eq('id', id))
  }
  function deleteCard(id) {
    setCards((cs) => cs.filter((c) => c.id !== id))
    setOpenCardId(null)
    run(supabase.from('cards').delete().eq('id', id))
  }
  async function addCard(listId, title) {
    const siblings = cards.filter((c) => c.list_id === listId)
    const position = siblings.length ? Math.max(...siblings.map((c) => c.position)) + 1 : 1
    const { data, error } = await supabase
      .from('cards')
      .insert({ list_id: listId, title, position })
      .select()
      .single()
    if (error) return alert(error.message)
    setCards((cs) => (cs.some((c) => c.id === data.id) ? cs : [...cs, data]))
  }
  function updateList(id, patch) {
    setLists((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)))
    run(supabase.from('lists').update(patch).eq('id', id))
  }
  function deleteList(id) {
    const n = cards.filter((c) => c.list_id === id).length
    if (!confirm(`Delete this list${n ? ` and its ${n} card${n === 1 ? '' : 's'}` : ''}? This can't be undone.`)) return
    setLists((ls) => ls.filter((l) => l.id !== id))
    setCards((cs) => cs.filter((c) => c.list_id !== id))
    run(supabase.from('lists').delete().eq('id', id))
  }
  async function addList(title) {
    const position = lists.length ? Math.max(...lists.map((l) => l.position)) + 1 : 1
    const { data, error } = await supabase.from('lists').insert({ title, position }).select().single()
    if (error) return alert(error.message)
    setLists((ls) => (ls.some((l) => l.id === data.id) ? ls : [...ls, data]))
  }

  function onDragEnd({ source, destination, draggableId, type }) {
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return
    if (type === 'LIST') {
      const others = lists.filter((l) => l.id !== draggableId)
      const position = positionAt(others, destination.index)
      setLists((ls) => ls.map((l) => (l.id === draggableId ? { ...l, position } : l)).sort((a, b) => a.position - b.position))
      run(supabase.from('lists').update({ position }).eq('id', draggableId))
    } else {
      const others = (cardsByList[destination.droppableId] || []).filter((c) => c.id !== draggableId)
      const position = positionAt(others, destination.index)
      updateCard(draggableId, { list_id: destination.droppableId, position })
    }
  }

  async function renameMe() {
    const name = prompt('Your display name', me?.full_name || '')
    if (!name?.trim()) return
    await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', session.user.id)
    load()
  }

  const openCard = cards.find((c) => c.id === openCardId)
  const filtering = query.trim() !== ''

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><span className="logo" /> FEC Board</div>
        <input className="search" placeholder="Search cards" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="topbar-right">
          <button className="avatar-btn" onClick={() => setUserMenu((v) => !v)}>
            <Avatar profile={me || { id: session.user.id, full_name: session.user.email }} size={28} />
          </button>
          {userMenu && (
            <>
              <div className="backdrop" onClick={() => setUserMenu(false)} />
              <div className="popover user-menu">
                <div className="popover-title">{me?.full_name}<br /><span className="muted">{session.user.email}</span></div>
                <button onClick={() => { setUserMenu(false); renameMe() }}>Change display name</button>
                <button onClick={() => supabase.auth.signOut()}>Log out</button>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="board-header">
        <h1>FEC Launch</h1>
        <div className="members">
          {profiles.map((p) => <Avatar key={p.id} profile={p} size={26} />)}
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading board…</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="board" direction="horizontal" type="LIST">
            {(provided) => (
              <div className="board" ref={provided.innerRef} {...provided.droppableProps}>
                {lists.map((list, index) => (
                  <List
                    key={list.id}
                    list={list}
                    index={index}
                    cards={cardsByList[list.id] || []}
                    totalCards={cards.filter((c) => c.list_id === list.id).length}
                    profileById={profileById}
                    dragDisabled={filtering}
                    onOpenCard={setOpenCardId}
                    onToggleCard={(c) => updateCard(c.id, { completed: !c.completed })}
                    onAddCard={addCard}
                    onUpdate={(patch) => updateList(list.id, patch)}
                    onDelete={() => deleteList(list.id)}
                  />
                ))}
                {provided.placeholder}
                <AddList onAdd={addList} />
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {openCard && (
        <CardModal
          card={openCard}
          lists={lists}
          profiles={profiles}
          profileById={profileById}
          onClose={() => setOpenCardId(null)}
          onUpdate={(patch) => updateCard(openCard.id, patch)}
          onDelete={() => deleteCard(openCard.id)}
        />
      )}
    </div>
  )
}

function List({ list, index, cards, totalCards, profileById, dragDisabled, onOpenCard, onToggleCard, onAddCard, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(list.title)
  const [menu, setMenu] = useState(false)
  const [composing, setComposing] = useState(false)

  useEffect(() => setTitle(list.title), [list.title])

  function saveTitle() {
    setEditing(false)
    const t = title.trim()
    if (t && t !== list.title) onUpdate({ title: t })
    else setTitle(list.title)
  }

  const bg = LIST_COLORS[list.color] || LIST_COLORS.slate

  return (
    <Draggable draggableId={list.id} index={index}>
      {(provided) => (
        <div className="list-wrap" ref={provided.innerRef} {...provided.draggableProps}>
          {list.collapsed ? (
            <div className="list collapsed" style={{ background: bg }} {...provided.dragHandleProps} onClick={() => onUpdate({ collapsed: false })} title="Expand list">
              <span className="expand-icon">↔</span>
              <span className="collapsed-title">{list.title}</span>
              <span className="count">{totalCards}</span>
            </div>
          ) : (
            <div className="list" style={{ background: bg }}>
              <div className="list-header" {...provided.dragHandleProps}>
                {editing ? (
                  <textarea
                    className="list-title-input"
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveTitle() } if (e.key === 'Escape') { setTitle(list.title); setEditing(false) } }}
                  />
                ) : (
                  <h2 onClick={() => setEditing(true)}>{list.title}</h2>
                )}
                <span className="count">{totalCards}</span>
                <button className="icon-btn" title="Collapse list" onClick={() => onUpdate({ collapsed: true })}>⇥</button>
                <button className="icon-btn" title="List actions" onClick={() => setMenu((v) => !v)}>⋯</button>
                {menu && (
                  <>
                    <div className="backdrop" onClick={() => setMenu(false)} />
                    <div className="popover list-menu">
                      <div className="popover-title">List actions</div>
                      <button onClick={() => { setMenu(false); setComposing(true) }}>Add card</button>
                      <button onClick={() => { setMenu(false); setEditing(true) }}>Rename list</button>
                      <div className="popover-label">Change list color</div>
                      <div className="swatches">
                        {Object.entries(LIST_COLORS).map(([name, hex]) => (
                          <button
                            key={name}
                            className={'swatch' + (list.color === name ? ' active' : '')}
                            style={{ background: hex }}
                            title={name}
                            onClick={() => onUpdate({ color: name })}
                          />
                        ))}
                      </div>
                      <button className="danger" onClick={() => { setMenu(false); onDelete() }}>Delete list</button>
                    </div>
                  </>
                )}
              </div>

              <Droppable droppableId={list.id} type="CARD">
                {(dropProvided, snapshot) => (
                  <div
                    className={'cards' + (snapshot.isDraggingOver ? ' over' : '')}
                    ref={dropProvided.innerRef}
                    {...dropProvided.droppableProps}
                  >
                    {cards.map((card, i) => (
                      <CardItem
                        key={card.id}
                        card={card}
                        index={i}
                        assignee={profileById[card.assignee]}
                        dragDisabled={dragDisabled}
                        onOpen={() => onOpenCard(card.id)}
                        onToggle={() => onToggleCard(card)}
                      />
                    ))}
                    {dropProvided.placeholder}
                  </div>
                )}
              </Droppable>

              {composing ? (
                <Composer
                  placeholder="Enter a title for this card…"
                  button="Add card"
                  onSubmit={(t) => onAddCard(list.id, t)}
                  onCancel={() => setComposing(false)}
                />
              ) : (
                <button className="add-card" onClick={() => setComposing(true)}>+ Add a card</button>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  )
}

function CardItem({ card, index, assignee, dragDisabled, onOpen, onToggle }) {
  const status = dueStatus(card)
  return (
    <Draggable draggableId={card.id} index={index} isDragDisabled={dragDisabled}>
      {(provided, snapshot) => (
        <div
          className={'card' + (snapshot.isDragging ? ' dragging' : '') + (card.completed ? ' completed' : '')}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onOpen}
        >
          <div className="card-main">
            <button
              className={'check' + (card.completed ? ' on' : '')}
              title={card.completed ? 'Mark incomplete' : 'Mark complete'}
              onClick={(e) => { e.stopPropagation(); onToggle() }}
            >
              {card.completed ? '✓' : ''}
            </button>
            <span className="card-title">{card.title}</span>
          </div>
          {(card.due_date || card.description || assignee) && (
            <div className="badges">
              {card.due_date && <span className={'badge due ' + status}>◷ {formatDue(card.due_date)}</span>}
              {card.description && <span className="badge" title="This card has a description">≡</span>}
              {assignee && <span className="badge-right"><Avatar profile={assignee} size={22} /></span>}
            </div>
          )}
        </div>
      )}
    </Draggable>
  )
}

function Composer({ placeholder, button, onSubmit, onCancel }) {
  const [text, setText] = useState('')
  function submit() {
    const t = text.trim()
    if (t) onSubmit(t)
    setText('')
  }
  return (
    <div className="composer">
      <textarea
        autoFocus
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); submit() }
          if (e.key === 'Escape') onCancel()
        }}
      />
      <div className="composer-actions">
        <button className="btn primary" onClick={submit}>{button}</button>
        <button className="icon-btn" onClick={onCancel} title="Cancel">✕</button>
      </div>
    </div>
  )
}

function AddList({ onAdd }) {
  const [open, setOpen] = useState(false)
  if (!open) return <button className="add-list" onClick={() => setOpen(true)}>+ Add another list</button>
  return (
    <div className="list add-list-form">
      <Composer placeholder="Enter list name…" button="Add list" onSubmit={onAdd} onCancel={() => setOpen(false)} />
    </div>
  )
}

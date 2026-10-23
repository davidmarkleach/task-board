import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import Avatar from './Avatar'

const linkFor = (token) => `${window.location.origin}/invite/${token}`

export default function TeamModal({ currentUser, onClose }) {
  const [team, setTeam] = useState(null)
  const [email, setEmail] = useState('')
  const [newLink, setNewLink] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(null)

  const load = useCallback(() => {
    api.get('/api/team').then(setTeam).catch((e) => setError(e.message))
  }, [])
  useEffect(load, [load])

  async function invite(address) {
    setError(null)
    try {
      const { token } = await api.post('/api/team/invite', { email: address })
      setNewLink({ email: address, url: linkFor(token) })
      setEmail('')
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function copy(text) {
    await navigator.clipboard.writeText(text).catch(() => {})
    setCopied(text)
    setTimeout(() => setCopied(null), 1500)
  }

  async function removeUser(u) {
    if (!confirm(`Remove ${u.full_name} from the board? They won't be able to log in anymore.`)) return
    await api.del(`/api/team/users/${u.id}`).catch((e) => alert(e.message))
    load()
  }

  async function cancelInvite(token) {
    await api.del(`/api/team/invites/${token}`).catch(() => {})
    load()
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="icon-btn modal-close" onClick={onClose} title="Close">✕</button>
        <h2 className="modal-heading">Team &amp; invites</h2>

        <form className="invite-form" onSubmit={(e) => { e.preventDefault(); invite(email.trim()) }}>
          <input type="email" placeholder="teammate@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button className="btn primary">Create invite link</button>
        </form>
        {error && <p className="msg error">{error}</p>}

        {newLink && (
          <div className="new-link">
            <p>Send this link to <strong>{newLink.email}</strong> (text, Slack, email). It works once and expires in 7 days.</p>
            <div className="link-row">
              <input readOnly value={newLink.url} onFocus={(e) => e.target.select()} />
              <button className="btn" onClick={() => copy(newLink.url)}>{copied === newLink.url ? 'Copied!' : 'Copy'}</button>
            </div>
          </div>
        )}

        <div className="section-label">Members</div>
        <ul className="team-list">
          {team?.users.map((u) => (
            <li key={u.id}>
              <Avatar profile={u} size={28} />
              <div className="team-who">
                <div>{u.full_name} {u.is_admin && <span className="tag">Owner</span>}</div>
                <div className="muted">{u.email}</div>
              </div>
              {u.id !== currentUser.id && (
                <>
                  <button className="link" onClick={() => invite(u.email)}>Password reset link</button>
                  <button className="link danger-link" onClick={() => removeUser(u)}>Remove</button>
                </>
              )}
            </li>
          ))}
        </ul>

        {team?.invites.length > 0 && (
          <>
            <div className="section-label">Pending invite links</div>
            <ul className="team-list">
              {team.invites.map((i) => (
                <li key={i.token}>
                  <div className="team-who">
                    <div>{i.email}</div>
                    <div className="muted">Expires {new Date(i.expires_at).toLocaleDateString()}</div>
                  </div>
                  <button className="link" onClick={() => copy(linkFor(i.token))}>{copied === linkFor(i.token) ? 'Copied!' : 'Copy link'}</button>
                  <button className="link danger-link" onClick={() => cancelInvite(i.token)}>Cancel</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

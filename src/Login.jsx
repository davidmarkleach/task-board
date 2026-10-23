import { useEffect, useState } from 'react'
import { api } from './api'

export default function Login({ onDone }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [forgot, setForgot] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.post('/api/login', { email, password })
      onDone()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-box" onSubmit={submit}>
        <div className="brand"><span className="logo" /> FEC Launch</div>
        <h1>Log in to your board</h1>
        <input type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        <input type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn primary" disabled={busy}>{busy ? '…' : 'Log in'}</button>
        {error && <p className="msg error">{error}</p>}
        <button type="button" className="link" onClick={() => setForgot((v) => !v)}>Forgot password?</button>
        {forgot && <p className="muted">Ask the board owner to send you a new password link from the Team page.</p>}
      </form>
    </div>
  )
}

export function AcceptInvite({ token, onDone }) {
  const [invite, setInvite] = useState(null)
  const [error, setError] = useState(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get(`/api/invites/${token}`).then(setInvite).catch((e) => setError(e.message))
  }, [token])

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.post(`/api/invites/${token}`, { full_name: name, password })
      onDone()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-box" onSubmit={submit}>
        <div className="brand"><span className="logo" /> FEC Launch</div>
        {!invite && !error && <p className="muted">Checking your link…</p>}
        {!invite && error && (
          <>
            <h1>Link not valid</h1>
            <p className="msg error">{error}</p>
            <a className="link" href="/">Go to log in</a>
          </>
        )}
        {invite && (
          <>
            <h1>Set up your account</h1>
            <p className="muted">{invite.email}</p>
            <input placeholder="Your name (e.g. Shannen)" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            <input type="password" placeholder="Choose a password (8+ characters)" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button className="btn primary" disabled={busy}>{busy ? '…' : 'Save and open board'}</button>
            {error && <p className="msg error">{error}</p>}
          </>
        )}
      </form>
    </div>
  )
}

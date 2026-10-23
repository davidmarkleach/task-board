import { useState } from 'react'
import { supabase } from './supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMsg({ error: true, text: error.message })
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      setMsg(error ? { error: true, text: error.message } : { text: 'Check your email for a reset link.' })
    }
    setBusy(false)
  }

  return (
    <div className="auth-screen">
      <form className="auth-box" onSubmit={submit}>
        <div className="brand"><span className="logo" /> FEC Launch</div>
        <h1>{mode === 'login' ? 'Log in to your board' : 'Reset your password'}</h1>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        {mode === 'login' && (
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        )}
        <button className="btn primary" disabled={busy}>
          {busy ? '…' : mode === 'login' ? 'Log in' : 'Send reset link'}
        </button>
        {msg && <p className={msg.error ? 'msg error' : 'msg'}>{msg.text}</p>}
        <button type="button" className="link" onClick={() => { setMode(mode === 'login' ? 'reset' : 'login'); setMsg(null) }}>
          {mode === 'login' ? 'Forgot password?' : 'Back to log in'}
        </button>
      </form>
    </div>
  )
}

export function SetPassword({ session, onDone }) {
  const [name, setName] = useState(session.user.user_metadata?.full_name || '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password, data: { full_name: name } })
    if (!error && name) {
      await supabase.from('profiles').update({ full_name: name }).eq('id', session.user.id)
    }
    setBusy(false)
    if (error) return setErr(error.message)
    window.history.replaceState(null, '', window.location.pathname)
    onDone()
  }

  return (
    <div className="auth-screen">
      <form className="auth-box" onSubmit={submit}>
        <div className="brand"><span className="logo" /> FEC Launch</div>
        <h1>Welcome! Set up your account</h1>
        <p className="muted">{session.user.email}</p>
        <input placeholder="Your name (e.g. Shannen)" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="password" placeholder="Choose a password (6+ characters)" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn primary" disabled={busy}>{busy ? '…' : 'Save and open board'}</button>
        {err && <p className="msg error">{err}</p>}
      </form>
    </div>
  )
}

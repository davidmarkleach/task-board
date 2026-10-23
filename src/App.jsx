import { useEffect, useState } from 'react'
import { supabase, isConfigured, authLinkType } from './supabase'
import Login, { SetPassword } from './Login'
import Board from './Board'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [needsPassword, setNeedsPassword] = useState(
    authLinkType === 'invite' || authLinkType === 'recovery'
  )

  useEffect(() => {
    if (!isConfigured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setNeedsPassword(true)
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!isConfigured) {
    return (
      <div className="auth-screen">
        <div className="auth-box">
          <h1>Almost there</h1>
          <p>
            Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your
            environment (see README), then rebuild.
          </p>
        </div>
      </div>
    )
  }
  if (session === undefined) return <div className="auth-screen" />
  if (!session) return <Login />
  if (needsPassword) return <SetPassword session={session} onDone={() => setNeedsPassword(false)} />
  return <Board session={session} />
}

import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import Login, { AcceptInvite } from './Login'
import Board from './Board'

const inviteToken = window.location.pathname.match(/^\/invite\/([\w-]+)/)?.[1]

export default function App() {
  const [user, setUser] = useState(undefined)

  const refreshUser = useCallback(() => {
    api.get('/api/me').then(setUser).catch(() => setUser(null))
  }, [])

  useEffect(refreshUser, [refreshUser])

  function onLoggedIn() {
    window.history.replaceState(null, '', '/')
    refreshUser()
  }

  if (inviteToken && window.location.pathname !== '/') return <AcceptInvite token={inviteToken} onDone={onLoggedIn} />
  if (user === undefined) return <div className="auth-screen" />
  if (!user) return <Login onDone={onLoggedIn} />
  return <Board user={user} onUserChange={refreshUser} onLogout={() => setUser(null)} />
}

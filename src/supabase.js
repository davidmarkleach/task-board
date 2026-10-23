import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && key)

// Invite and password-reset emails land here with "type=invite" / "type=recovery"
// in the URL hash. Capture it before the client consumes and clears the hash.
const hash = new URLSearchParams(window.location.hash.slice(1))
export const authLinkType = hash.get('type')

export const supabase = isConfigured ? createClient(url, key) : null

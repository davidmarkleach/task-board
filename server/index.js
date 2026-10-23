import express from 'express'
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import pg from 'pg'
import { query, migrate } from './db.js'

pg.types.setTypeParser(1082, (v) => v) // return DATE columns as 'YYYY-MM-DD' strings

const app = express()
app.set('trust proxy', 1)
app.use(express.json({ limit: '1mb' }))

const SESSION_DAYS = 30
const INVITE_DAYS = 7
const COOKIE = 'fec_session'
const token = () => crypto.randomBytes(32).toString('base64url')
const ah = (fn) => (req, res, next) => fn(req, res, next).catch(next)

// ---------- sessions ----------
function readCookie(req, name) {
  const match = (req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(name + '='))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

async function startSession(req, res, userId) {
  const t = token()
  await query(`insert into sessions (token, user_id, expires_at) values ($1, $2, now() + interval '${SESSION_DAYS} days')`, [t, userId])
  res.cookie(COOKIE, t, { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: SESSION_DAYS * 86400000 })
}

const USER_COLS = 'id, email, full_name, is_admin'

async function auth(req, res, next) {
  const t = readCookie(req, COOKIE)
  if (t) {
    const { rows } = await query(
      `select ${USER_COLS.split(', ').map((c) => 'u.' + c).join(', ')} from sessions s join users u on u.id = s.user_id
       where s.token = $1 and s.expires_at > now()`,
      [t]
    )
    if (rows[0]) {
      req.user = rows[0]
      return next()
    }
  }
  res.status(401).json({ error: 'Not logged in' })
}

function adminOnly(req, res, next) {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Only the board owner can do that' })
  next()
}

// Basic brute-force protection for the login form.
const attempts = new Map()
function tooManyAttempts(ip) {
  const now = Date.now()
  const a = attempts.get(ip) || { count: 0, since: now }
  if (now - a.since > 15 * 60000) Object.assign(a, { count: 0, since: now })
  a.count++
  attempts.set(ip, a)
  return a.count > 20
}

// ---------- live updates (Server-Sent Events) ----------
const clients = new Set()
function broadcast() {
  for (const res of clients) res.write('data: changed\n\n')
}

// ---------- auth routes ----------
app.post('/api/login', ah(async (req, res) => {
  if (tooManyAttempts(req.ip)) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' })
  const { email = '', password = '' } = req.body
  const { rows } = await query(`select id, password_hash from users where email = lower($1)`, [email.trim()])
  const user = rows[0]
  if (!user?.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Wrong email or password' })
  }
  await startSession(req, res, user.id)
  res.json({ ok: true })
}))

app.post('/api/logout', ah(async (req, res) => {
  const t = readCookie(req, COOKIE)
  if (t) await query(`delete from sessions where token = $1`, [t])
  res.clearCookie(COOKIE)
  res.json({ ok: true })
}))

app.get('/api/invites/:token', ah(async (req, res) => {
  const { rows } = await query(`select email, full_name from invites where token = $1 and expires_at > now()`, [req.params.token])
  if (!rows[0]) return res.status(404).json({ error: 'This link has expired or was already used. Ask David for a new one.' })
  res.json(rows[0])
}))

app.post('/api/invites/:token', ah(async (req, res) => {
  const { full_name = '', password = '' } = req.body
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
  if (!full_name.trim()) return res.status(400).json({ error: 'Please enter your name' })
  const { rows } = await query(`delete from invites where token = $1 and expires_at > now() returning email`, [req.params.token])
  if (!rows[0]) return res.status(404).json({ error: 'This link has expired or was already used.' })
  const hash = await bcrypt.hash(password, 10)
  const user = await query(
    `insert into users (email, full_name, password_hash) values ($1, $2, $3)
     on conflict (email) do update set full_name = excluded.full_name, password_hash = excluded.password_hash
     returning id`,
    [rows[0].email, full_name.trim(), hash]
  )
  await query(`delete from sessions where user_id = $1`, [user.rows[0].id])
  await startSession(req, res, user.rows[0].id)
  broadcast()
  res.json({ ok: true })
}))

// Everything below requires login.
app.use('/api', ah(auth))

app.get('/api/me', (req, res) => res.json(req.user))

app.patch('/api/me', ah(async (req, res) => {
  const name = (req.body.full_name || '').trim()
  if (name) await query(`update users set full_name = $1 where id = $2`, [name, req.user.id])
  if (req.body.password) {
    if (req.body.password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
    await query(`update users set password_hash = $1 where id = $2`, [await bcrypt.hash(req.body.password, 10), req.user.id])
  }
  broadcast()
  res.json({ ok: true })
}))

app.get('/api/events', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
  res.flushHeaders()
  res.write('retry: 3000\n\n')
  clients.add(res)
  const ping = setInterval(() => res.write(': ping\n\n'), 25000)
  req.on('close', () => {
    clearInterval(ping)
    clients.delete(res)
  })
})

// ---------- board ----------
app.get('/api/board', ah(async (req, res) => {
  const [lists, cards, users] = await Promise.all([
    query(`select * from lists order by position`),
    query(`select * from cards order by position`),
    query(`select id, full_name from users order by full_name`),
  ])
  res.json({ lists: lists.rows, cards: cards.rows, profiles: users.rows })
}))

function pick(body, fields) {
  const out = {}
  for (const f of fields) if (f in body) out[f] = body[f]
  return out
}

async function updateRow(table, id, patch, extra = '') {
  const keys = Object.keys(patch)
  if (!keys.length) return null
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
  const { rows } = await query(`update ${table} set ${sets}${extra} where id = $1 returning *`, [id, ...Object.values(patch)])
  return rows[0]
}

const LIST_FIELDS = ['title', 'color', 'position', 'collapsed']
const CARD_FIELDS = ['list_id', 'title', 'description', 'due_date', 'completed', 'position', 'assignee']

app.post('/api/lists', ah(async (req, res) => {
  const { title, position = 0 } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'Title required' })
  const { rows } = await query(`insert into lists (title, position) values ($1, $2) returning *`, [title.trim(), position])
  broadcast()
  res.json(rows[0])
}))

app.patch('/api/lists/:id', ah(async (req, res) => {
  const row = await updateRow('lists', req.params.id, pick(req.body, LIST_FIELDS))
  broadcast()
  res.json(row)
}))

app.delete('/api/lists/:id', ah(async (req, res) => {
  await query(`delete from lists where id = $1`, [req.params.id])
  broadcast()
  res.json({ ok: true })
}))

app.post('/api/cards', ah(async (req, res) => {
  const { list_id, title, position = 0 } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'Title required' })
  const { rows } = await query(
    `insert into cards (list_id, title, position, created_by) values ($1, $2, $3, $4) returning *`,
    [list_id, title.trim(), position, req.user.id]
  )
  broadcast()
  res.json(rows[0])
}))

app.patch('/api/cards/:id', ah(async (req, res) => {
  const row = await updateRow('cards', req.params.id, pick(req.body, CARD_FIELDS), ', updated_at = now()')
  broadcast()
  res.json(row)
}))

app.delete('/api/cards/:id', ah(async (req, res) => {
  await query(`delete from cards where id = $1`, [req.params.id])
  broadcast()
  res.json({ ok: true })
}))

// ---------- team management (owner only) ----------
app.get('/api/team', adminOnly, ah(async (req, res) => {
  const users = await query(`select ${USER_COLS}, password_hash is not null as active from users order by created_at`)
  const invites = await query(`select token, email, expires_at from invites where expires_at > now() order by expires_at`)
  res.json({ users: users.rows, invites: invites.rows })
}))

// Creates a one-time link to join the board, or to reset the password of an existing member.
app.post('/api/team/invite', adminOnly, ah(async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email' })
  await query(`delete from invites where email = $1`, [email])
  const t = token()
  await query(
    `insert into invites (token, email, expires_at, created_by) values ($1, $2, now() + interval '${INVITE_DAYS} days', $3)`,
    [t, email, req.user.id]
  )
  res.json({ token: t })
}))

app.delete('/api/team/invites/:token', adminOnly, ah(async (req, res) => {
  await query(`delete from invites where token = $1`, [req.params.token])
  res.json({ ok: true })
}))

app.delete('/api/team/users/:id', adminOnly, ah(async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: "You can't remove yourself" })
  await query(`delete from users where id = $1`, [req.params.id])
  broadcast()
  res.json({ ok: true })
}))

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }))

// ---------- frontend ----------
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
app.use(express.static(dist))
app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')))

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Something went wrong. Please try again.' })
})

await migrate()
setInterval(() => query(`delete from sessions where expires_at < now()`).catch(() => {}), 6 * 3600000)
const port = process.env.PORT || 3000
app.listen(port, () => console.log(`FEC Board running on port ${port}`))

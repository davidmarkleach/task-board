import pg from 'pg'
import bcrypt from 'bcryptjs'
import { SEED_LISTS } from './seed.js'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. On Railway, add a Postgres database and reference its DATABASE_URL.')
  process.exit(1)
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
})

export const query = (text, params) => pool.query(text, params)

const SCHEMA = `
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  password_hash text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token text primary key,
  user_id uuid not null references users on delete cascade,
  expires_at timestamptz not null
);

create table if not exists invites (
  token text primary key,
  email text not null,
  full_name text not null default '',
  expires_at timestamptz not null,
  created_by uuid references users on delete set null
);

create table if not exists lists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  color text not null default 'slate',
  position double precision not null default 0,
  collapsed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references lists on delete cascade,
  title text not null,
  description text not null default '',
  due_date date,
  completed boolean not null default false,
  position double precision not null default 0,
  assignee uuid references users on delete set null,
  created_by uuid references users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cards_list_id_idx on cards (list_id);

create table if not exists meta (key text primary key, value text);
`

export async function migrate() {
  await query(SCHEMA)

  // Create (or reset the password of) the owner account from env vars.
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10)
    await query(
      `insert into users (email, full_name, password_hash, is_admin) values (lower($1), $2, $3, true)
       on conflict (email) do update set password_hash = excluded.password_hash, is_admin = true`,
      [ADMIN_EMAIL.trim(), ADMIN_NAME || ADMIN_EMAIL.split('@')[0], hash]
    )
  }

  // Load the cards from the old Trello board the first time the app starts.
  const seeded = await query(`select 1 from meta where key = 'seeded'`)
  if (!seeded.rowCount) {
    const client = await pool.connect()
    try {
      await client.query('begin')
      for (const [i, list] of SEED_LISTS.entries()) {
        const { rows } = await client.query(
          `insert into lists (title, color, position, collapsed) values ($1, $2, $3, $4) returning id`,
          [list.title, list.color, i, Boolean(list.collapsed)]
        )
        for (const [j, card] of list.cards.entries()) {
          await client.query(
            `insert into cards (list_id, title, completed, due_date, position) values ($1, $2, $3, $4, $5)`,
            [rows[0].id, card.title, Boolean(card.done), card.due || null, j + 1]
          )
        }
      }
      await client.query(`insert into meta (key, value) values ('seeded', now()::text)`)
      await client.query('commit')
    } catch (e) {
      await client.query('rollback')
      throw e
    } finally {
      client.release()
    }
  }
}

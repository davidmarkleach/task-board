# FEC Board

A self-hosted replacement for the "FEC Launch" Trello board. Lists, cards, drag and drop,
checkmarks, due dates, assignees, descriptions, search, collapsible lists, and live updates
so everyone sees changes as they happen. Only people you invite can log in.

Runs on free tiers: **Netlify** (hosting), **Supabase** (database and logins), **GitHub** (code).

---

## 1. Set up Supabase (database + logins), about 5 minutes

1. Go to https://supabase.com, sign up, and click **New project**. Pick any name and a strong
   database password, then wait about a minute for it to finish.
2. In the left sidebar open **SQL Editor** → **New query**. Paste all of `supabase/schema.sql`,
   then click **Run**.
3. (Optional, loads your current Trello cards) New query → paste `supabase/seed.sql` → **Run**.
   Run it only once, or you'll get duplicate lists.
4. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up".
   That makes the board invite-only.
5. **Project Settings → API** (or the **Connect** button at the top): copy the **Project URL** and the
   **anon / publishable** key. You'll need both in step 3.

## 2. Put the code on GitHub

Create an empty repository on github.com (private is fine), then from this folder:

```bash
git remote add origin https://github.com/YOUR-USERNAME/fec-board.git
git push -u origin main
```

## 3. Deploy on Netlify

1. https://app.netlify.com → **Add new site → Import an existing project → GitHub** → pick the repo.
2. Netlify reads the build settings from `netlify.toml`, so leave them as they are.
3. Before deploying, click **Add environment variables** and add:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon / publishable key
4. Click **Deploy**. From now on, every push to GitHub redeploys automatically.
5. Copy your Netlify URL (e.g. `https://fec-board.netlify.app`). Back in Supabase, open
   **Authentication → URL Configuration** and set **Site URL** to it. This makes the invite and
   password-reset emails link to your board.

## 4. Invite your team (and yourself)

Supabase → **Authentication → Users → Add user → Send invitation**, and enter each email.
Each person gets an email, clicks the link, enters their name and a password, and lands on the board.
After that they log in with their email and password. "Forgot password?" on the login page works too.

To remove someone: Authentication → Users → ⋯ → Delete user.

---

## Local development

```bash
cp .env.example .env.local   # fill in the two values
npm install
npm run dev
```

## Notes

- The anon key is safe to put in a website. It's designed to be public, and the database rules
  (in `schema.sql`) only allow logged-in users to read or change anything.
- Supabase's free tier pauses a project after 7 days with no activity. If the board is used weekly
  this won't happen. If it does pause, click "Restore" in the Supabase dashboard.
- Supabase's built-in email sender is limited to a few emails per hour. That's plenty for inviting
  4 people, but don't send them all at the same moment.

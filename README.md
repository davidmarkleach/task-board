# FEC Board

A self-hosted replacement for the "FEC Launch" Trello board. It has lists, cards, drag and drop,
checkmarks, due dates, assignees, descriptions, search, collapsible lists, and live updates
so everyone sees changes as they happen. Only people you invite can log in.

Everything runs as one app on **Railway**: a small Node server plus a Railway Postgres database.
The code lives on **GitHub**, and every push redeploys automatically.

---

## Deploy on Railway (about 10 minutes)

1. **Create the project.** On https://railway.com go to **New Project → Deploy from GitHub repo** and
   pick `fec-board`.
2. **Add a database.** Inside the project, click **+ Create → Database → PostgreSQL**.
3. **Set variables.** Click the `fec-board` service → **Variables** and add:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Railway offers this as a reference when you type it) |
   | `ADMIN_EMAIL` | your email, e.g. `davidmarkleach@gmail.com` |
   | `ADMIN_PASSWORD` | the password you want to log in with |
   | `ADMIN_NAME` | `David Leach` |

4. **Get a URL.** Go to the service → **Settings → Networking → Generate Domain**. You can add a
   custom domain like `board.yourcompany.com` here too.
5. Railway builds and deploys. Open the URL and log in with your admin email and password.
   Your current Trello cards are loaded automatically the first time the app starts.

> `ADMIN_PASSWORD` is applied every time the app starts. If you ever forget your password, change
> this variable and Railway redeploys with the new one.

## Invite your team

Click your avatar (top right) → **Team & invites** → enter a teammate's email → **Create invite link**.
Send them the link however you like (text, Slack, email). They open it, enter their name and a
password, and they're on the board. Links work once and expire after 7 days.

- **Someone forgot their password:** Team & invites → **Password reset link** next to their name,
  then send them the new link.
- **Someone leaves:** Team & invites → **Remove**. They're logged out right away.

---

## Local development

Needs Node 20+ and a Postgres database (you can use your Railway database's public URL).

```bash
npm install
cp .env.example .env    # fill in the values
npm run build && node --env-file=.env server/index.js
# open http://localhost:3000
```

For live reload while editing the frontend, run `node --env-file=.env server/index.js` in one terminal and
`npm run dev` in another, then open the URL that Vite prints.

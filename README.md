# 🏡 Chore Chart App

A family chore management app with daily/weekly/monthly scheduling, email/SMS notifications, and per-daughter dashboards.

## What it does

- **Admin panel** (`/admin`) — add chores, set frequency, assign to daughters
- **Daughter dashboards** (`/daughter/daughter1`, `/daughter/daughter2`) — tap to check off chores
- **Daily cron job** — runs every morning, assigns due chores and sends notifications
- **Smart scheduling** — daily chores every day, weekly on a chosen weekday, monthly on a chosen date

---

## Setup (30 minutes)

### Step 1 — Create a Supabase project (free)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (pick any name, save the database password)
3. Once created, go to **SQL Editor** and paste + run the contents of `sql/schema.sql`
4. Go to **Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### Step 2 — Set up email via Resend (free, 3,000 emails/month)

1. Go to [resend.com](https://resend.com) and create a free account
2. Verify your domain (or use their test domain for testing)
3. Go to **API Keys** and create a key → `RESEND_API_KEY`
4. Set `EMAIL_FROM` to an address on your verified domain

### Step 3 — Set up SMS via Twilio (optional, ~$0.008/text)

1. Go to [twilio.com](https://twilio.com) and create an account
2. Get a phone number (~$1/month)
3. Copy **Account SID** → `TWILIO_ACCOUNT_SID`
4. Copy **Auth Token** → `TWILIO_AUTH_TOKEN`
5. Copy your Twilio phone number → `TWILIO_PHONE_NUMBER`

> **Skip this step** if you only want email notifications. Set `NOTIFY_METHOD=email` in your env.

### Step 4 — Deploy to Vercel (free)

1. Push this folder to a GitHub repo (or drag-drop to Vercel)
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Add all environment variables (see `.env.local.example` for the full list)
4. Deploy!

### Step 5 — Configure environment variables on Vercel

In Vercel → Project → Settings → Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL        = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY   = eyJ...
SUPABASE_SERVICE_ROLE_KEY       = eyJ...

ADMIN_PASSWORD                  = yourSecretPassword

RESEND_API_KEY                  = re_xxx
EMAIL_FROM                      = chores@yourdomain.com

# Optional SMS:
TWILIO_ACCOUNT_SID              = ACxxx
TWILIO_AUTH_TOKEN               = xxx
TWILIO_PHONE_NUMBER             = +15555555555

DAUGHTER_1_NAME                 = Emma
DAUGHTER_1_EMAIL                = emma@example.com
DAUGHTER_1_PHONE                = +15555550001   # optional

DAUGHTER_2_NAME                 = Olivia
DAUGHTER_2_EMAIL                = olivia@example.com
DAUGHTER_2_PHONE                = +15555550002   # optional

CRON_SECRET                     = some-long-random-string
NOTIFY_METHOD                   = email           # or: sms, both

NEXT_PUBLIC_APP_URL             = https://your-app.vercel.app
```

### Step 6 — Set notification time (default: 12pm UTC)

Edit `vercel.json` to change the cron schedule. The format is `"M H * * *"`:
- `"0 12 * * *"` = 12pm UTC (7am US Central, 8am US Eastern)
- `"0 13 * * *"` = 1pm UTC (8am US Central)
- Use [crontab.guru](https://crontab.guru) to calculate the right UTC time for your timezone

---

## Using the app

### As a parent (admin)
1. Visit `https://your-app.vercel.app/admin`
2. Enter your admin password
3. Click **+ Add chore** to create chores
4. Choose frequency: **Daily** (every day), **Weekly** (pick a weekday), **Monthly** (pick a date)
5. Assign to Daughter 1, Daughter 2, or Both
6. Click **Run scheduler now** to immediately assign today's chores (useful for first-time setup)
7. Click **Send test notifications** to verify email/SMS is working

### As a daughter
- Visit the link in the email/text notification, **or**
- Go to `https://your-app.vercel.app/daughter/daughter1` (or `daughter2`)
- Tap each chore to check it off — it saves instantly

---

## How scheduling works

| Frequency | When assigned |
|-----------|--------------|
| Daily     | Every day |
| Weekly    | On the chosen weekday (e.g. every Saturday) |
| Monthly   | On the chosen day of the month (e.g. the 1st) |

The cron job runs once per day. If it runs twice (unlikely), duplicate assignments are safely ignored.

---

## Project structure

```
chore-app/
├── pages/
│   ├── index.tsx              → redirects to /admin
│   ├── admin.tsx              → parent management interface
│   ├── daughter/[daughter].tsx → per-daughter checklist
│   └── api/
│       ├── auth.ts            → login check
│       ├── chores.ts          → CRUD for chores
│       ├── assignments.ts     → toggle completion
│       ├── notify.ts          → send notifications manually
│       └── cron/assign.ts     → daily scheduler + notification sender
├── lib/
│   ├── supabase.ts            → database client
│   ├── scheduler.ts           → chore assignment logic
│   └── notifications.ts       → email (Resend) + SMS (Twilio)
├── sql/
│   └── schema.sql             → run this in Supabase SQL editor
├── styles/
│   └── globals.css
├── vercel.json                → cron schedule
└── .env.local.example         → copy to .env.local for local dev
```

---

## Running locally

```bash
npm install
cp .env.local.example .env.local
# Fill in your .env.local values
npm run dev
# Visit http://localhost:3000
```

To test the scheduler locally:
```bash
curl -X POST http://localhost:3000/api/cron/assign \
  -H "Authorization: Bearer your-cron-secret"
```

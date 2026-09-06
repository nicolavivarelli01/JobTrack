# JobTrack

A personal job-search dashboard for tracking applications, employer responses, interviews, offers, and rejections.

## Features

- Application, response, interview, and offer metrics
- Application and response trends for this month, 3 months, or 6 months
- Detailed pipeline stages through Interview 1, 2, 3, and 4+
- Conversion flow from application to offer
- Current-outcome breakdown
- Searchable and filterable application table
- Add, edit, and delete workflows
- Private notes for recruiter details, next steps, and reminders
- Optional interview date, time, meeting link, and preparation details
- Company favicons loaded from saved job-posting domains with initials as a fallback
- Email/password authentication
- Email-based password recovery
- Supabase Postgres persistence across devices
- Row-level security so each account can access only its own applications
- One-time import of existing non-demo browser data
- Installable iPhone and Android PWA with branded Home Screen icons
- Standalone, notch-safe mobile layout
- Touch-friendly mobile application cards and a responsive dark interface

## Install on iPhone

1. Open the deployed JobTrack URL in Safari.
2. Tap the **Share** button.
3. Tap **Add to Home Screen** and keep **Open as Web App** enabled.
4. Tap **Add**. JobTrack will open from its own Home Screen icon without Safari chrome.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor** and run the files in `supabase/migrations` in filename order. If your database already exists, run only the newer files you have not applied yet.
3. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key from **Connect → API Keys**.
4. In **Authentication → URL Configuration**, set the Site URL to the deployed app URL and add the same URL to Redirect URLs.

Only the publishable browser key belongs in these variables. Never expose or commit a `service_role` or secret key.

## Deploy to Vercel

Add these variables to the Vercel project for Production, Preview, and Development, then redeploy:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

The browser talks directly to Supabase using the signed-in session. PostgreSQL row-level-security policies enforce ownership for reads, inserts, updates, and deletes.

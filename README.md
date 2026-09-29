# JobTrack

[![CI](https://github.com/nicolavivarelli01/JobTrack/actions/workflows/ci.yml/badge.svg)](https://github.com/nicolavivarelli01/JobTrack/actions/workflows/ci.yml)

A job-search tracker that shows where your applications stand and how the search is going: response rates, interviews, offers, and rejections over time.

Built with Next.js, React, TypeScript, Tailwind CSS, and Supabase. Installable as a PWA on iPhone and Android.

![JobTrack dashboard with response-rate metrics, a daily activity chart, and an outcomes breakdown](docs/screenshots/dashboard.png)

<table>
  <tr>
    <td width="62%"><img src="docs/screenshots/applications.png" alt="Applications table with stages, results, interview times, and notes"></td>
    <td width="38%" rowspan="2"><img src="docs/screenshots/mobile.png" alt="Mobile layout with application cards"></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/import.png" alt="Import dialog mapping spreadsheet status values to stages and results"></td>
  </tr>
</table>

<sub>Screenshots use sample data.</sub>

## Features

**Tracking**

- Pipeline stages from Applied through Interview 1–4+ and Offer, with the current result (active, rejected, offer, withdrawn) tracked separately
- Assessments recorded independently of the highest stage reached
- Interview date, meeting link, and prep notes; free-text notes and the company's own status label
- Pin applications to keep them at the top

**Dashboard**

- Positive-response, rejection, interview, and offer rates
- Daily or weekly trends for this month, 3 months, or 6 months
- A flow diagram of how applications move through assessments and interviews

**Import and export**

- Import from any CSV or Excel file. Columns are matched by name and can be adjusted, free-text statuses such as "Ghosted" or "2nd round" are mapped to stages, and the mapping is remembered for the next file with the same columns.
- Spreadsheets that track rounds as one column per phase are supported: the furthest filled column sets the stage.
- From Excel files, hyperlinks become job-posting links and red cells in progress columns mark rejections.
- Export the filtered list to CSV with the columns you choose.

**Accounts**

- Email and password sign-in with password recovery
- Data stored in Postgres; row-level security limits every account to its own applications

## Project structure

```text
app/                  Next.js entry point (auth routing only)
components/
  dashboard/          Header, metric cards, charts, flow diagram
  applications/       List, table, dialogs for adding, editing, and exporting
  import/             Import dialog and its sections
  ui/                 shadcn/ui primitives
hooks/                useApplications (data + optimistic updates), useImportWizard
lib/
  applications.ts     Domain types and database row mapping
  applications-api.ts Supabase queries
  metrics.ts          Dashboard metrics, trends, and list filtering
  import/             CSV/Excel parsing, column and status guessing, import preview
supabase/migrations/  Database schema and row-level-security policies
```

## Development

```bash
npm install
cp .env.example .env.local   # then add your Supabase URL and publishable key
npm run dev
```

| Script              | What it does                  |
| ------------------- | ----------------------------- |
| `npm run dev`       | Start the dev server on :3000 |
| `npm test`          | Run the unit tests (Vitest)   |
| `npm run lint`      | ESLint                        |
| `npm run typecheck` | TypeScript without emitting   |
| `npm run format`    | Format with Prettier          |
| `npm run build`     | Production build              |

## Supabase setup

1. Create a Supabase project.
2. In the **SQL Editor**, run the files in `supabase/migrations` in filename order. For an existing database, run only the ones you haven't applied.
3. Copy the project URL and publishable key from **Connect → API Keys** into `.env.local`.
4. Under **Authentication → URL Configuration**, set the Site URL to your deployed URL and add it to the Redirect URLs.

Only the publishable key belongs in these variables. Never commit a `service_role` or secret key.

## Deploying to Vercel

Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the project for all environments, then redeploy. The browser talks to Supabase directly with the signed-in session, and the row-level-security policies enforce ownership of every read and write.

## Installing on iPhone

Open the site in Safari, tap **Share → Add to Home Screen**, keep **Open as Web App** on, and tap **Add**.

# JobTrack

A personal job-search dashboard for tracking applications, employer responses, interviews, offers, and rejections.

## Features

- Application, response, interview, and offer metrics
- Eight-week application and response trend
- Conversion flow from application to offer
- Current-outcome breakdown
- Searchable and filterable application table
- Add, edit, and delete workflows
- Browser-local persistence with no account or backend required
- Responsive dark interface

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

Import this GitHub repository into Vercel and keep the detected Next.js defaults. No environment variables are required.

## Data storage

Applications are stored in the browser's `localStorage`. The data is therefore private to that browser and is not synchronized between devices.

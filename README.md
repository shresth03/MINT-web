# SIGINT — Open Source Intel Network

A real-time OSINT social media platform where verified intelligence channels post breaking news, and the community discusses and corroborates events.

## Features

- **Intel Feed** — Multi-source verified stories with AI-synthesised summaries
- **Event Map** — D3.js world map with live region event counts
- **General Feed** — Public discussion with real-time posts and likes
- **Verified Channels** — Application and review system for OSINT analysts
- **Admin Dashboard** — Approve/reject OSINT channel applications
- **User Profiles** — Role-based access (public, osint, admin)
- **Realtime** — Live post updates via Supabase subscriptions

## Tech Stack

- React + Vite
- Tailwind CSS v4
- D3.js (world map)
- React Router v6
- Supabase (PostgreSQL + Auth + Realtime)
- Vercel (deployment)

## Getting Started

1. Clone the repo
2. Install dependencies: `npm install`
3. Create `.env` file with your Supabase credentials:
```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
4. Run locally: `npm run dev`

## Roles

| Role | Access |
|------|--------|
| `public` | Read all content, post in General feed |
| `osint` | Everything above + post Intel Stories |
| `admin` | Everything above + review applications |

## License

MIT

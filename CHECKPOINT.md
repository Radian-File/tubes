# Telkom Pinjam — Checkpoint

## Current Status
Local implementation is complete and validated.

## Completed Phases
- Phase 1 — Project setup: `frontend/`, `backend/`, scripts, env examples, gitignore.
- Phase 2 — Database design: Prisma schema, migration, seed data.
- Phase 3 — Backend setup: Express + TypeScript + Prisma + CORS + error handling.
- Phase 4 — Authentication & role: register, login, me, JWT, role guard.
- Phase 5 — User & area management: admin CRUD user/area.
- Phase 6 — Facility management: admin CRUD facility, role-aware list.
- Phase 7 — Booking: mahasiswa creates booking, payment auto-created.
- Phase 8 — PJ approval: PJ sees area bookings, approve/reject with note.
- Phase 9 — Payment: upload proof, admin verify/reject, local upload + optional Cloudinary.
- Phase 10 — Finalisasi: admin completes booking after payment paid.
- Phase 11 — Frontend layout/routing: React Router, protected routes, dashboard layout.
- Phase 12 — Auth pages: login/register.
- Phase 13 — Mahasiswa pages: dashboard, facilities, detail, booking, history, upload proof.
- Phase 14 — PJ pages: dashboard, pending booking, detail, approval history.
- Phase 15 — Admin pages: dashboard, user/area/facility CRUD, bookings, payments.
- Phase 16 — Local env, README, demo accounts, deployment notes.

## Validation Done
- `cd backend && npm install` succeeded.
- `cd frontend && npm install` succeeded.
- `cd backend && npm run build` succeeded.
- `cd frontend && npm run build` succeeded.
- `cd backend && npx prisma migrate dev --name init` succeeded.
- Prisma created local PostgreSQL database `telkom_pinjam`.
- Prisma seed succeeded.
- Backend health smoke test succeeded: `GET /api/health`.
- Admin login smoke test succeeded.

## Demo Accounts
Password for all seeded demo accounts:

```txt
password123
```

- Admin: `admin@telkompinjam.test`
- Penanggung Jawab: `pj.tokong@telkompinjam.test`
- Mahasiswa: `mahasiswa@telkompinjam.test`

## How to Run Locally

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Open:

```txt
http://localhost:5173
```

## Manual Steps Still Pending / Last Step Only
- GitHub repository creation/push.
- Production PostgreSQL on Supabase/Railway.
- Production migration: `npx prisma migrate deploy`.
- Production seed if needed: `npm run seed`.
- Backend deployment to Render/Railway.
- Frontend deployment to Vercel.
- Production Cloudinary credentials if you decide to use external upload storage.

## If Wi-Fi / Session Disconnects
Resume from this point:
1. Open project folder: `C:\Users\radia\Documents\Coding\tubes_sem4`.
2. Run backend and frontend dev servers.
3. Continue manual QA/testing or final deployment preparation.

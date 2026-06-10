# Telkom Pinjam — Checkpoint

## Current Status
Local implementation is complete and ngrok mode has been synchronized.

## Ngrok Mode Fix
Project sekarang mendukung **1 tunnel ngrok saja untuk frontend**:

```txt
ngrok frontend URL -> Vite localhost:5173 -> proxy /api to backend localhost:5000 -> PostgreSQL lokal
```

Changes:
- `frontend/.env` sekarang memakai `VITE_API_URL="/api"`.
- `frontend/vite.config.ts` proxy:
  - `/api` -> `http://localhost:5000`
  - `/uploads` -> `http://localhost:5000`
- `frontend/vite.config.ts` mengizinkan host `.ngrok-free.app` dan `.ngrok-free.dev`.
- Backend CORS dibuat fleksibel untuk localhost dan domain ngrok.
- Panduan ngrok dibuat di `NGROK_GUIDE.md`.

## How to Run With Ngrok

Terminal 1:

```bash
cd C:\Users\radia\Documents\Coding\tubes_sem4\backend
npm run dev
```

Terminal 2:

```bash
cd C:\Users\radia\Documents\Coding\tubes_sem4\frontend
npm run dev
```

Terminal 3:

```bash
ngrok http 5173
```

Kirim URL ngrok frontend ke teman.

## Completed Phases
- Phase 1 — Project setup.
- Phase 2 — Prisma schema, migration, seed local.
- Phase 3 — Backend Express setup.
- Phase 4 — Auth and role guard.
- Phase 5 — User and area management.
- Phase 6 — Facility management.
- Phase 7 — Booking.
- Phase 8 — PJ approval.
- Phase 9 — Payment.
- Phase 10 — Completion.
- Phase 11-15 — Frontend pages for all roles.
- Phase 16 — README, env, local validation.

## Validation
- Frontend build succeeded after ngrok proxy update.
- Backend TypeScript check succeeded after CORS update.
- Full backend build may fail if backend dev server is currently running because Prisma engine DLL is locked on Windows. Stop backend first, then run `npm run build`.

## Demo Accounts
Password all accounts: `password123`

- Admin: `admin@telkompinjam.test`
- PJ: `pj.tokong@telkompinjam.test`
- Mahasiswa: `mahasiswa@telkompinjam.test`

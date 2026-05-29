# Telkom Pinjam

**Telkom Pinjam** adalah website peminjaman fasilitas kampus Universitas Telkom dengan 3 role utama: mahasiswa, penanggung jawab, dan admin.

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Axios

### Backend
- Node.js
- Express.js
- TypeScript
- Prisma ORM
- JWT Authentication
- Multer upload lokal
- Cloudinary optional jika env diisi

### Database
- PostgreSQL

## Role & Fitur

### Mahasiswa
- Register/login
- Melihat fasilitas
- Membuat booking
- Melihat riwayat booking
- Upload bukti pembayaran setelah disetujui PJ

### Penanggung Jawab
- Login
- Melihat booking sesuai area
- Approve/reject booking
- Memberi catatan approval/rejection

### Admin
- Kelola user
- Kelola area
- Kelola fasilitas
- Melihat semua booking
- Melihat semua payment
- Verify/reject payment
- Finalisasi booking menjadi completed

## Local Setup

> Saat ini setup dibuat local-first. Production deployment, Supabase/Railway migration, Vercel, Render/Railway, dan GitHub push dilakukan terakhir secara manual.

### 1. Siapkan PostgreSQL lokal

Buat database bernama:

```sql
CREATE DATABASE telkom_pinjam;
```

Default `.env` backend memakai:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/telkom_pinjam?schema=public"
```

Jika password/user PostgreSQL berbeda, ubah file `backend/.env`.

### 2. Backend

```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Backend berjalan di:

```txt
http://localhost:5000
```

Health check:

```txt
GET http://localhost:5000/api/health
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend berjalan di:

```txt
http://localhost:5173
```

## Demo Accounts

Password semua akun demo:

```txt
password123
```

| Role | Email |
|---|---|
| Admin | admin@telkompinjam.test |
| Penanggung Jawab | pj.tokong@telkompinjam.test |
| Mahasiswa | mahasiswa@telkompinjam.test |

## API Summary

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Users
- `GET /api/users`
- `POST /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`

### Areas
- `GET /api/areas`
- `POST /api/areas`
- `GET /api/areas/:id`
- `PUT /api/areas/:id`
- `DELETE /api/areas/:id`

### Facilities
- `GET /api/facilities`
- `POST /api/facilities`
- `GET /api/facilities/:id`
- `PUT /api/facilities/:id`
- `DELETE /api/facilities/:id`

### Bookings
- `POST /api/bookings`
- `GET /api/bookings`
- `GET /api/bookings/my`
- `GET /api/bookings/:id`
- `PUT /api/bookings/:id/complete`

### PJ Approval
- `GET /api/pj/bookings`
- `GET /api/pj/bookings/:id`
- `PUT /api/pj/bookings/:id/approve`
- `PUT /api/pj/bookings/:id/reject`

### Payments
- `GET /api/payments`
- `GET /api/payments/my`
- `GET /api/payments/:id`
- `POST /api/payments/:id/upload`
- `PUT /api/payments/:id/verify`
- `PUT /api/payments/:id/reject`

## Deployment Notes — Manual Last Step

### Frontend Vercel
Set env:

```env
VITE_API_URL="https://your-backend-url/api"
```

### Backend Render/Railway
Set env:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="strong_secret"
PORT=5000
FRONTEND_URL="https://your-frontend.vercel.app"
```

Optional Cloudinary:

```env
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
```

Run production migration after DB is ready:

```bash
npx prisma migrate deploy
npm run seed
```

## Checkpoint
Lihat `CHECKPOINT.md` untuk progress terakhir jika koneksi terputus.

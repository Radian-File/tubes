import path from 'path';
import fs from 'fs';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient, UserRole } from '@prisma/client';

dotenv.config();
const prisma = new PrismaClient();
const app = express();
const PORT = Number(process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const cloudinaryConfigured = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const uploadDir = path.resolve(process.cwd(), 'src', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Only image files are allowed')),
});

declare global {
  namespace Express {
    interface UserPayload { id: string; email: string; role: UserRole; areaId?: string | null }
    interface Request { user?: UserPayload }
  }
}

const allowedOrigins = new Set([
  FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

function isAllowedOrigin(origin?: string) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return host.endsWith('.ngrok-free.app') || host.endsWith('.ngrok-free.dev');
  } catch {
    return false;
  }
}

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir));

const ok = (res: Response, message: string, data: unknown = null, code = 200) => res.status(code).json({ success: true, message, data });
const fail = (res: Response, message: string, code = 400, errors: unknown = null) => res.status(code).json({ success: false, message, errors });
const asyncRoute = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);
const safeUser = (user: any) => { const { password, ...rest } = user; return rest; };
const userInclude = { area: true };
const bookingInclude = {
  user: { select: { id: true, name: true, email: true, role: true } },
  facility: { include: { area: true } },
  approvedByPj: { select: { id: true, name: true, email: true } },
  payment: true,
};
const paymentInclude = {
  booking: { include: { user: { select: { id: true, name: true, email: true } }, facility: { include: { area: true } } } },
  verifiedByAdmin: { select: { id: true, name: true, email: true } },
};

function tokenFor(user: any) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, areaId: user.areaId }, JWT_SECRET, { expiresIn: '7d' });
}
function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return fail(res, 'Unauthorized: token is required', 401);
  try {
    req.user = jwt.verify(token, JWT_SECRET) as Express.UserPayload;
    next();
  } catch {
    return fail(res, 'Unauthorized: invalid or expired token', 401);
  }
}
function role(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return fail(res, 'Unauthorized', 401);
    if (!roles.includes(req.user.role)) return fail(res, 'Forbidden: insufficient role access', 403);
    next();
  };
}
function bookingAccessWhere(user: Express.UserPayload) {
  if (user.role === 'admin') return {};
  if (user.role === 'mahasiswa') return { userId: user.id };
  if (user.role === 'penanggung_jawab') return { facility: { areaId: user.areaId || '__none__' } };
  return { id: '__none__' };
}
function paymentAccessWhere(user: Express.UserPayload) {
  if (user.role === 'admin') return {};
  if (user.role === 'mahasiswa') return { booking: { userId: user.id } };
  if (user.role === 'penanggung_jawab') return { booking: { facility: { areaId: user.areaId || '__none__' } } };
  return { id: '__none__' };
}

app.get('/api/health', (_req, res) => ok(res, 'Telkom Pinjam API is running'));

app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return fail(res, 'Name, email, and password are required');
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return fail(res, 'Email already registered', 409);
  const user = await prisma.user.create({ data: { name, email, password: await bcrypt.hash(password, 10), role: 'mahasiswa' }, include: userInclude });
  return ok(res, 'Registration successful', { user: safeUser(user), token: tokenFor(user) }, 201);
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return fail(res, 'Email and password are required');
  const user = await prisma.user.findUnique({ where: { email }, include: userInclude });
  if (!user || !(await bcrypt.compare(password, user.password))) return fail(res, 'Invalid email or password', 401);
  return ok(res, 'Login successful', { user: safeUser(user), token: tokenFor(user) });
}));

app.get('/api/auth/me', auth, asyncRoute(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, include: userInclude });
  if (!user) return fail(res, 'User not found', 404);
  return ok(res, 'Current user retrieved', safeUser(user));
}));

app.get('/api/dashboard', auth, asyncRoute(async (req, res) => {
  const user = req.user!;
  if (user.role === 'admin') {
    const [totalUser, totalArea, totalFacility, paymentWaiting, latestBookings, paymentPending] = await Promise.all([
      prisma.user.count(), prisma.area.count(), prisma.facility.count(), prisma.payment.count({ where: { status: 'waiting_verification' } }),
      prisma.booking.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: bookingInclude }),
      prisma.payment.findMany({ take: 5, where: { status: 'waiting_verification' }, orderBy: { createdAt: 'desc' }, include: paymentInclude }),
    ]);
    return ok(res, 'Admin dashboard retrieved', { stats: { totalUser, totalArea, totalFacility, paymentWaiting }, latestBookings, paymentPending });
  }
  if (user.role === 'penanggung_jawab') {
    const areaId = user.areaId || '__none__';
    const [pending, approved, rejected, totalFacilities, recent] = await Promise.all([
      prisma.booking.count({ where: { status: 'pending', facility: { areaId } } }),
      prisma.booking.count({ where: { status: 'approved_by_pj', facility: { areaId } } }),
      prisma.booking.count({ where: { status: 'rejected_by_pj', facility: { areaId } } }),
      prisma.facility.count({ where: { areaId } }),
      prisma.booking.findMany({ take: 5, where: { facility: { areaId } }, orderBy: { createdAt: 'desc' }, include: bookingInclude }),
    ]);
    return ok(res, 'PJ dashboard retrieved', { stats: { pending, approved, rejected, totalFacilities }, recent });
  }
  const [total, pending, approved, unpaid, recent, facilities] = await Promise.all([
    prisma.booking.count({ where: { userId: user.id } }),
    prisma.booking.count({ where: { userId: user.id, status: 'pending' } }),
    prisma.booking.count({ where: { userId: user.id, status: 'approved_by_pj' } }),
    prisma.payment.count({ where: { booking: { userId: user.id }, status: { in: ['unpaid', 'rejected', 'waiting_verification'] } } }),
    prisma.booking.findMany({ take: 5, where: { userId: user.id }, orderBy: { createdAt: 'desc' }, include: bookingInclude }),
    prisma.facility.findMany({ take: 6, where: { status: 'available' }, include: { area: true }, orderBy: { createdAt: 'desc' } }),
  ]);
  return ok(res, 'Mahasiswa dashboard retrieved', { stats: { total, pending, approved, unpaid }, recent, facilities });
}));

app.get('/api/users', auth, role('admin'), asyncRoute(async (_req, res) => ok(res, 'Users retrieved', (await prisma.user.findMany({ include: userInclude, orderBy: { createdAt: 'desc' } })).map(safeUser))));
app.post('/api/users', auth, role('admin'), asyncRoute(async (req, res) => {
  const { name, email, password, role: userRole, areaId } = req.body;
  if (!name || !email || !password || !userRole) return fail(res, 'Name, email, password, and role are required');
  const user = await prisma.user.create({ data: { name, email, password: await bcrypt.hash(password, 10), role: userRole, areaId: areaId || null }, include: userInclude });
  return ok(res, 'User created', safeUser(user), 201);
}));
app.get('/api/users/:id', auth, role('admin'), asyncRoute(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: String(req.params.id) }, include: userInclude });
  return user ? ok(res, 'User retrieved', safeUser(user)) : fail(res, 'User not found', 404);
}));
app.put('/api/users/:id', auth, role('admin'), asyncRoute(async (req, res) => {
  const { name, email, password, role: userRole, areaId } = req.body;
  const data: any = { name, email, role: userRole, areaId: areaId || null };
  Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
  if (password) data.password = await bcrypt.hash(password, 10);
  const user = await prisma.user.update({ where: { id: String(req.params.id) }, data, include: userInclude });
  return ok(res, 'User updated', safeUser(user));
}));
app.delete('/api/users/:id', auth, role('admin'), asyncRoute(async (req, res) => { await prisma.user.delete({ where: { id: String(req.params.id) } }); return ok(res, 'User deleted'); }));

app.get('/api/areas', auth, asyncRoute(async (_req, res) => ok(res, 'Areas retrieved', await prisma.area.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { facilities: true, users: true } } } }))));
app.post('/api/areas', auth, role('admin'), asyncRoute(async (req, res) => {
  if (!req.body.name) return fail(res, 'Area name is required');
  return ok(res, 'Area created', await prisma.area.create({ data: { name: req.body.name, description: req.body.description } }), 201);
}));
app.get('/api/areas/:id', auth, asyncRoute(async (req, res) => {
  const area = await prisma.area.findUnique({ where: { id: String(req.params.id) }, include: { facilities: true, users: true } });
  return area ? ok(res, 'Area retrieved', area) : fail(res, 'Area not found', 404);
}));
app.put('/api/areas/:id', auth, role('admin'), asyncRoute(async (req, res) => ok(res, 'Area updated', await prisma.area.update({ where: { id: String(req.params.id) }, data: { name: req.body.name, description: req.body.description } }))));
app.delete('/api/areas/:id', auth, role('admin'), asyncRoute(async (req, res) => { await prisma.area.delete({ where: { id: String(req.params.id) } }); return ok(res, 'Area deleted'); }));

app.get('/api/facilities', auth, asyncRoute(async (req, res) => {
  const where: any = {};
  if (req.query.search) where.name = { contains: String(req.query.search), mode: 'insensitive' };
  if (req.query.areaId) where.areaId = String(req.query.areaId);
  if (req.query.status) where.status = String(req.query.status);
  if (req.user?.role === 'penanggung_jawab' && req.user.areaId) where.areaId = req.user.areaId;
  return ok(res, 'Facilities retrieved', await prisma.facility.findMany({ where, include: { area: true }, orderBy: { createdAt: 'desc' } }));
}));
app.post('/api/facilities', auth, role('admin'), asyncRoute(async (req, res) => {
  const { areaId, name, location, capacity, status, description, image } = req.body;
  if (!areaId || !name || !location || !capacity) return fail(res, 'areaId, name, location, and capacity are required');
  const facility = await prisma.facility.create({ data: { areaId, name, location, capacity: Number(capacity), status: status || 'available', description, image }, include: { area: true } });
  return ok(res, 'Facility created', facility, 201);
}));
app.get('/api/facilities/:id', auth, asyncRoute(async (req, res) => {
  const facility = await prisma.facility.findUnique({ where: { id: String(req.params.id) }, include: { area: true } });
  return facility ? ok(res, 'Facility retrieved', facility) : fail(res, 'Facility not found', 404);
}));
app.put('/api/facilities/:id', auth, role('admin'), asyncRoute(async (req, res) => {
  const { areaId, name, location, capacity, status, description, image } = req.body;
  const data: any = { areaId, name, location, capacity: capacity !== undefined ? Number(capacity) : undefined, status, description, image };
  Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
  return ok(res, 'Facility updated', await prisma.facility.update({ where: { id: String(req.params.id) }, data, include: { area: true } }));
}));
app.delete('/api/facilities/:id', auth, role('admin'), asyncRoute(async (req, res) => { await prisma.facility.delete({ where: { id: String(req.params.id) } }); return ok(res, 'Facility deleted'); }));

app.post('/api/bookings', auth, role('mahasiswa'), asyncRoute(async (req, res) => {
  const { facilityId, date, startTime, endTime, purpose, amount } = req.body;
  if (!facilityId || !date || !startTime || !endTime || !purpose) return fail(res, 'facilityId, date, startTime, endTime, and purpose are required');
  const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
  if (!facility) return fail(res, 'Facility not found', 404);
  if (facility.status !== 'available') return fail(res, 'Facility is unavailable', 400);
  const booking = await prisma.booking.create({ data: { userId: req.user!.id, facilityId, date: new Date(date), startTime, endTime, purpose, payment: { create: { amount: Number(amount || 0) } } }, include: bookingInclude });
  return ok(res, 'Booking created', booking, 201);
}));
app.get('/api/bookings', auth, asyncRoute(async (req, res) => ok(res, 'Bookings retrieved', await prisma.booking.findMany({ where: bookingAccessWhere(req.user!), include: bookingInclude, orderBy: { createdAt: 'desc' } }))));
app.get('/api/bookings/my', auth, role('mahasiswa'), asyncRoute(async (req, res) => ok(res, 'My bookings retrieved', await prisma.booking.findMany({ where: { userId: req.user!.id }, include: bookingInclude, orderBy: { createdAt: 'desc' } }))));
app.get('/api/bookings/:id', auth, asyncRoute(async (req, res) => {
  const booking = await prisma.booking.findFirst({ where: { id: String(req.params.id), ...bookingAccessWhere(req.user!) }, include: bookingInclude });
  return booking ? ok(res, 'Booking retrieved', booking) : fail(res, 'Booking not found', 404);
}));
app.put('/api/bookings/:id/complete', auth, role('admin'), asyncRoute(async (req, res) => {
  const booking: any = await prisma.booking.findUnique({ where: { id: String(req.params.id) }, include: { payment: true } });
  if (!booking) return fail(res, 'Booking not found', 404);
  if (booking.status !== 'approved_by_pj') return fail(res, 'Only approved bookings can be completed', 400);
  if (booking.payment?.status !== 'paid') return fail(res, 'Payment must be paid before completing booking', 400);
  return ok(res, 'Booking completed', await prisma.booking.update({ where: { id: booking.id }, data: { status: 'completed', adminNote: req.body.adminNote || null }, include: bookingInclude }));
}));

app.get('/api/pj/bookings', auth, role('penanggung_jawab'), asyncRoute(async (req, res) => {
  const where: any = { facility: { areaId: req.user!.areaId || '__none__' } };
  if (req.query.status) where.status = String(req.query.status);
  return ok(res, 'PJ bookings retrieved', await prisma.booking.findMany({ where, include: bookingInclude, orderBy: { createdAt: 'desc' } }));
}));
app.get('/api/pj/bookings/:id', auth, role('penanggung_jawab'), asyncRoute(async (req, res) => {
  const booking = await prisma.booking.findFirst({ where: { id: String(req.params.id), facility: { areaId: req.user!.areaId || '__none__' } }, include: bookingInclude });
  return booking ? ok(res, 'PJ booking retrieved', booking) : fail(res, 'Booking not found', 404);
}));
app.put('/api/pj/bookings/:id/approve', auth, role('penanggung_jawab'), asyncRoute(async (req, res) => {
  const booking = await prisma.booking.findFirst({ where: { id: String(req.params.id), status: 'pending', facility: { areaId: req.user!.areaId || '__none__' } } });
  if (!booking) return fail(res, 'Pending booking not found for your area', 404);
  return ok(res, 'Booking approved', await prisma.booking.update({ where: { id: booking.id }, data: { status: 'approved_by_pj', pjNote: req.body.pjNote || null, approvedByPjId: req.user!.id }, include: bookingInclude }));
}));
app.put('/api/pj/bookings/:id/reject', auth, role('penanggung_jawab'), asyncRoute(async (req, res) => {
  const booking = await prisma.booking.findFirst({ where: { id: String(req.params.id), status: 'pending', facility: { areaId: req.user!.areaId || '__none__' } } });
  if (!booking) return fail(res, 'Pending booking not found for your area', 404);
  return ok(res, 'Booking rejected', await prisma.booking.update({ where: { id: booking.id }, data: { status: 'rejected_by_pj', pjNote: req.body.pjNote || null, approvedByPjId: req.user!.id }, include: bookingInclude }));
}));

app.get('/api/payments', auth, asyncRoute(async (req, res) => ok(res, 'Payments retrieved', await prisma.payment.findMany({ where: paymentAccessWhere(req.user!), include: paymentInclude, orderBy: { createdAt: 'desc' } }))));
app.get('/api/payments/my', auth, role('mahasiswa'), asyncRoute(async (req, res) => ok(res, 'My payments retrieved', await prisma.payment.findMany({ where: { booking: { userId: req.user!.id } }, include: paymentInclude, orderBy: { createdAt: 'desc' } }))));
app.get('/api/payments/:id', auth, asyncRoute(async (req, res) => {
  const payment = await prisma.payment.findFirst({ where: { id: String(req.params.id), ...paymentAccessWhere(req.user!) }, include: paymentInclude });
  return payment ? ok(res, 'Payment retrieved', payment) : fail(res, 'Payment not found', 404);
}));
app.post('/api/payments/:id/upload', auth, role('mahasiswa'), upload.single('proofImage'), asyncRoute(async (req, res) => {
  const payment: any = await prisma.payment.findFirst({ where: { id: String(req.params.id), booking: { userId: req.user!.id } }, include: { booking: true } });
  if (!payment) return fail(res, 'Payment not found', 404);
  if (payment.booking.status !== 'approved_by_pj') return fail(res, 'Payment proof can only be uploaded after PJ approval', 400);
  if (!req.file) return fail(res, 'Proof image is required');
  let proofImage = `/uploads/${req.file.filename}`;
  if (cloudinaryConfigured) {
    const result = await cloudinary.uploader.upload(req.file.path, { folder: 'telkom-pinjam/payments' });
    proofImage = result.secure_url;
    fs.unlink(req.file.path, () => {});
  }
  return ok(res, 'Payment proof uploaded', await prisma.payment.update({ where: { id: payment.id }, data: { proofImage, status: 'waiting_verification' }, include: paymentInclude }));
}));
app.put('/api/payments/:id/verify', auth, role('admin'), asyncRoute(async (req, res) => {
  const payment = await prisma.payment.findUnique({ where: { id: String(req.params.id) } });
  if (!payment) return fail(res, 'Payment not found', 404);
  if (payment.status !== 'waiting_verification') return fail(res, 'Only waiting verification payments can be verified', 400);
  return ok(res, 'Payment verified', await prisma.payment.update({ where: { id: payment.id }, data: { status: 'paid', adminNote: req.body.adminNote || null, verifiedByAdminId: req.user!.id }, include: paymentInclude }));
}));
app.put('/api/payments/:id/reject', auth, role('admin'), asyncRoute(async (req, res) => {
  const payment = await prisma.payment.findUnique({ where: { id: String(req.params.id) } });
  if (!payment) return fail(res, 'Payment not found', 404);
  if (payment.status !== 'waiting_verification') return fail(res, 'Only waiting verification payments can be rejected', 400);
  return ok(res, 'Payment rejected', await prisma.payment.update({ where: { id: payment.id }, data: { status: 'rejected', adminNote: req.body.adminNote || null, verifiedByAdminId: req.user!.id }, include: paymentInclude }));
}));

app.use((req, res) => fail(res, `Route not found: ${req.method} ${req.originalUrl}`, 404));
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  return fail(res, error.message || 'Internal server error', 500);
});

app.listen(PORT, () => console.log(`Telkom Pinjam API running on http://localhost:${PORT}`));

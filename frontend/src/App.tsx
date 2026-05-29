import axios from 'axios';
import React, { createContext, FormEvent, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';

type Role = 'mahasiswa' | 'penanggung_jawab' | 'admin';
type User = { id: string; name: string; email: string; role: Role; areaId?: string | null; area?: any };
type ApiResponse<T> = { success: boolean; message: string; data: T };

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('telkom_pinjam_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

async function apiGet<T>(url: string) { return (await api.get<ApiResponse<T>>(url)).data.data; }
async function apiPost<T>(url: string, body?: any, config?: any) { return (await api.post<ApiResponse<T>>(url, body, config)).data.data; }
async function apiPut<T>(url: string, body?: any) { return (await api.put<ApiResponse<T>>(url, body)).data.data; }
async function apiDelete<T>(url: string) { return (await api.delete<ApiResponse<T>>(url)).data.data; }
function errMsg(error: any) { return error?.response?.data?.message || error?.message || 'Terjadi kesalahan'; }
function roleHome(role?: Role) { if (role === 'admin') return '/admin/dashboard'; if (role === 'penanggung_jawab') return '/pj/dashboard'; return '/dashboard'; }
function fmtDate(value?: string) { return value ? new Date(value).toLocaleDateString('id-ID') : '-'; }

const AuthContext = createContext<AuthContextValue | null>(null);
function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error('AuthContext missing'); return ctx; }

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState(localStorage.getItem('telkom_pinjam_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    apiGet<User>('/auth/me').then(setUser).catch(() => { localStorage.removeItem('telkom_pinjam_token'); setToken(null); }).finally(() => setLoading(false));
  }, [token]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    loading,
    login: async (email, password) => {
      const data = await apiPost<{ user: User; token: string }>('/auth/login', { email, password });
      localStorage.setItem('telkom_pinjam_token', data.token); setToken(data.token); setUser(data.user); return data.user;
    },
    register: async (name, email, password) => {
      const data = await apiPost<{ user: User; token: string }>('/auth/register', { name, email, password });
      localStorage.setItem('telkom_pinjam_token', data.token); setToken(data.token); setUser(data.user); return data.user;
    },
    logout: () => { localStorage.removeItem('telkom_pinjam_token'); setToken(null); setUser(null); },
  }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function Button({ children, variant = 'primary', className = '', ...props }: any) {
  const styles: any = {
    primary: 'bg-telkom-red text-white hover:bg-telkom-dark',
    secondary: 'bg-white border border-gray-200 text-gray-800 hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-green-600 text-white hover:bg-green-700',
  };
  return <button className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${styles[variant]} ${className}`} {...props}>{children}</button>;
}
function Card({ children, className = '' }: any) { return <div className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>; }
function Field({ label, error, ...props }: any) { return <label className="block"><span className="mb-1 block text-sm font-semibold text-gray-700">{label}</span><input className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-telkom-red focus:ring-2 focus:ring-red-100" {...props}/>{error && <span className="text-xs text-red-600">{error}</span>}</label>; }
function TextArea({ label, ...props }: any) { return <label className="block"><span className="mb-1 block text-sm font-semibold text-gray-700">{label}</span><textarea className="min-h-24 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-telkom-red focus:ring-2 focus:ring-red-100" {...props}/></label>; }
function Select({ label, children, ...props }: any) { return <label className="block"><span className="mb-1 block text-sm font-semibold text-gray-700">{label}</span><select className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-telkom-red focus:ring-2 focus:ring-red-100" {...props}>{children}</select></label>; }
function Badge({ value }: { value?: string }) {
  const v = value || '-';
  const styles: Record<string,string> = {
    available: 'bg-green-100 text-green-700', unavailable: 'bg-gray-100 text-gray-700', pending: 'bg-yellow-100 text-yellow-800', approved_by_pj: 'bg-blue-100 text-blue-700', rejected_by_pj: 'bg-red-100 text-red-700', completed: 'bg-green-100 text-green-700', unpaid: 'bg-gray-100 text-gray-700', waiting_verification: 'bg-orange-100 text-orange-700', paid: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', admin: 'bg-purple-100 text-purple-700', mahasiswa: 'bg-blue-100 text-blue-700', penanggung_jawab: 'bg-orange-100 text-orange-700'
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${styles[v] || 'bg-gray-100 text-gray-700'}`}>{v.replaceAll('_', ' ')}</span>;
}
function Empty({ text = 'Belum ada data' }: { text?: string }) { return <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">{text}</div>; }
function Loading() { return <div className="p-8 text-center text-gray-500">Loading...</div>; }
function Alert({ text, type = 'error' }: { text?: string; type?: 'error'|'success' }) { if (!text) return null; return <div className={`rounded-lg p-3 text-sm ${type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{text}</div>; }
function StatCard({ label, value }: any) { return <Card><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-3xl font-extrabold text-gray-900">{value ?? 0}</p></Card>; }
function PageTitle({ title, subtitle, action }: any) { return <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h1 className="text-2xl font-extrabold text-gray-900">{title}</h1>{subtitle && <p className="text-gray-500">{subtitle}</p>}</div>{action}</div>; }

function AuthLayout({ children, title, subtitle }: any) {
  return <div className="grid min-h-screen bg-white md:grid-cols-2">
    <div className="hidden flex-col justify-center bg-gradient-to-br from-telkom-dark to-telkom-red p-12 text-white md:flex">
      <div className="mb-8 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-3xl">🏫</div>
      <h1 className="text-4xl font-extrabold">Telkom Pinjam</h1>
      <p className="mt-4 max-w-md text-lg text-red-50">Sistem Peminjaman Fasilitas Kampus Universitas Telkom yang clean, cepat, dan mudah digunakan.</p>
    </div>
    <div className="flex items-center justify-center bg-gray-50 p-6"><Card className="w-full max-w-md"><h2 className="text-2xl font-extrabold">{title}</h2><p className="mb-6 text-gray-500">{subtitle}</p>{children}</Card></div>
  </div>;
}
function LoginPage() {
  const { login } = useAuth(); const nav = useNavigate(); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); setError(''); try { const u = await login(email,password); nav(roleHome(u.role)); } catch (err) { setError(errMsg(err)); } finally { setBusy(false); } }
  return <AuthLayout title="Login" subtitle="Masuk sesuai role kamu"><form onSubmit={submit} className="space-y-4"><Alert text={error}/><Field label="Email" type="email" value={email} onChange={(e:any)=>setEmail(e.target.value)} placeholder="admin@telkompinjam.test"/><Field label="Password" type="password" value={password} onChange={(e:any)=>setPassword(e.target.value)} placeholder="password123"/><Button disabled={busy} className="w-full">Login</Button><p className="text-sm text-gray-500">Mahasiswa baru? <Link className="font-semibold text-telkom-red" to="/register">Register</Link></p></form></AuthLayout>;
}
function RegisterPage() {
  const { register } = useAuth(); const nav = useNavigate(); const [form,setForm]=useState({name:'',email:'',password:''}); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); setError(''); try { const u = await register(form.name,form.email,form.password); nav(roleHome(u.role)); } catch (err) { setError(errMsg(err)); } finally { setBusy(false); } }
  return <AuthLayout title="Register Mahasiswa" subtitle="Akun baru otomatis role mahasiswa"><form onSubmit={submit} className="space-y-4"><Alert text={error}/><Field label="Nama" value={form.name} onChange={(e:any)=>setForm({...form,name:e.target.value})}/><Field label="Email" type="email" value={form.email} onChange={(e:any)=>setForm({...form,email:e.target.value})}/><Field label="Password" type="password" value={form.password} onChange={(e:any)=>setForm({...form,password:e.target.value})}/><Button disabled={busy} className="w-full">Register</Button><p className="text-sm text-gray-500">Sudah punya akun? <Link className="font-semibold text-telkom-red" to="/login">Login</Link></p></form></AuthLayout>;
}

function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth(); const nav = useNavigate();
  const menus = user?.role === 'admin' ? [ ['Dashboard','/admin/dashboard'], ['Kelola User','/admin/users'], ['Kelola Area','/admin/areas'], ['Kelola Fasilitas','/admin/facilities'], ['Semua Booking','/admin/bookings'], ['Pembayaran','/admin/payments'] ] : user?.role === 'penanggung_jawab' ? [ ['Dashboard','/pj/dashboard'], ['Booking Pending','/pj/bookings'], ['Riwayat Approval','/pj/history'] ] : [ ['Dashboard','/dashboard'], ['Fasilitas','/facilities'], ['Peminjaman Saya','/bookings'], ['Pembayaran Saya','/payments'] ];
  return <div className="min-h-screen bg-gray-50 md:flex"><aside className="border-r border-gray-200 bg-white p-4 md:fixed md:inset-y-0 md:w-64"><Link to={roleHome(user?.role)} className="mb-6 flex items-center gap-3"><span className="rounded-xl bg-telkom-red p-2 text-white">🏫</span><span><b>Telkom Pinjam</b><small className="block text-gray-500">Campus Dashboard</small></span></Link><nav className="space-y-1">{menus.map((m:any)=><Link key={m[1]} to={m[1]} className="block rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-telkom-soft hover:text-telkom-red">{m[0]}</Link>)}</nav></aside><main className="flex-1 md:ml-64"><header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/90 px-6 py-4 backdrop-blur"><div><p className="font-bold">{user?.name}</p><Badge value={user?.role}/></div><Button variant="secondary" onClick={()=>{logout(); nav('/login');}}>Logout</Button></header><section className="p-6">{children}</section></main></div>;
}
function Protected({ roles, children }: { roles?: Role[]; children: ReactNode }) { const { user, loading } = useAuth(); if (loading) return <Loading/>; if (!user) return <Navigate to="/login"/>; if (roles && !roles.includes(user.role)) return <Navigate to={roleHome(user.role)}/>; return <DashboardLayout>{children}</DashboardLayout>; }
function Guest({ children }: { children: ReactNode }) { const { user, loading } = useAuth(); if (loading) return <Loading/>; if (user) return <Navigate to={roleHome(user.role)}/>; return <>{children}</>; }

function DashboardPage({ role }: { role: Role }) {
  const [data,setData]=useState<any>(null); const [error,setError]=useState('');
  useEffect(()=>{ apiGet<any>('/dashboard').then(setData).catch(e=>setError(errMsg(e))); },[]);
  if (error) return <Alert text={error}/>; if (!data) return <Loading/>;
  const stats = data.stats || {};
  return <><PageTitle title={role === 'admin' ? 'Dashboard Admin' : role === 'penanggung_jawab' ? 'Dashboard Penanggung Jawab' : 'Dashboard Mahasiswa'} subtitle="Ringkasan aktivitas sistem"/><div className="grid gap-4 md:grid-cols-4">{Object.entries(stats).map(([k,v])=><StatCard key={k} label={k.replaceAll('_',' ')} value={v}/>)}</div><Card className="mt-6"><h3 className="mb-3 font-bold">Aktivitas Terbaru</h3>{(data.recent || data.latestBookings || []).length ? <SimpleBookingTable items={data.recent || data.latestBookings}/> : <Empty/>}</Card></>;
}
function SimpleBookingTable({ items }: { items:any[] }) { return <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-gray-500"><th className="p-2">Fasilitas</th><th className="p-2">Tanggal</th><th className="p-2">Status</th><th className="p-2">Payment</th></tr></thead><tbody>{items.map(b=><tr className="border-t" key={b.id}><td className="p-2 font-semibold">{b.facility?.name}</td><td className="p-2">{fmtDate(b.date)}</td><td className="p-2"><Badge value={b.status}/></td><td className="p-2"><Badge value={b.payment?.status}/></td></tr>)}</tbody></table></div>; }

function FacilitiesPage() {
  const [items,setItems]=useState<any[]>([]); const [areas,setAreas]=useState<any[]>([]); const [q,setQ]=useState(''); const [area,setArea]=useState('');
  const load=()=>apiGet<any[]>(`/facilities?search=${encodeURIComponent(q)}&areaId=${area}`).then(setItems);
  useEffect(()=>{ load(); apiGet<any[]>('/areas').then(setAreas); },[]);
  return <><PageTitle title="Daftar Fasilitas" subtitle="Pilih fasilitas kampus yang ingin dipinjam"/><Card className="mb-5 grid gap-3 md:grid-cols-3"><Field label="Search" value={q} onChange={(e:any)=>setQ(e.target.value)} placeholder="Cari fasilitas"/><Select label="Area" value={area} onChange={(e:any)=>setArea(e.target.value)}><option value="">Semua area</option>{areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</Select><div className="flex items-end"><Button onClick={load}>Filter</Button></div></Card>{items.length ? <div className="grid gap-4 md:grid-cols-3">{items.map(f=><Card key={f.id}><div className="mb-3 flex h-32 items-center justify-center rounded-xl bg-telkom-soft text-4xl">🏢</div><h3 className="font-bold">{f.name}</h3><p className="text-sm text-gray-500">{f.area?.name} • {f.location}</p><p className="mt-2 text-sm">Kapasitas: {f.capacity}</p><div className="my-3"><Badge value={f.status}/></div><Link to={`/facilities/${f.id}`}><Button variant="secondary">Detail</Button></Link></Card>)}</div> : <Empty/>}</>;
}
function FacilityDetailPage() {
  const { id } = useParams(); const [item,setItem]=useState<any>(null); const [error,setError]=useState('');
  useEffect(()=>{ apiGet<any>(`/facilities/${id}`).then(setItem).catch(e=>setError(errMsg(e))); },[id]);
  if(error) return <Alert text={error}/>; if(!item) return <Loading/>;
  return <><PageTitle title={item.name} subtitle={`${item.area?.name} • ${item.location}`} action={<Link to={`/facilities/${item.id}/book`}><Button>Pinjam Fasilitas</Button></Link>}/><Card><div className="grid gap-6 md:grid-cols-2"><div className="flex h-72 items-center justify-center rounded-2xl bg-telkom-soft text-7xl">🏢</div><div className="space-y-3"><Badge value={item.status}/><p><b>Kapasitas:</b> {item.capacity}</p><p><b>Deskripsi:</b> {item.description || '-'}</p></div></div></Card></>;
}
function BookingFormPage() {
  const { id } = useParams(); const nav = useNavigate(); const [facility,setFacility]=useState<any>(null); const [form,setForm]=useState({date:'',startTime:'',endTime:'',purpose:'',amount:0}); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  useEffect(()=>{ apiGet<any>(`/facilities/${id}`).then(setFacility); },[id]);
  async function submit(e:FormEvent){ e.preventDefault(); if(!confirm('Ajukan peminjaman fasilitas ini?')) return; setBusy(true); setError(''); try{ await apiPost('/bookings',{...form,facilityId:id}); nav('/bookings'); }catch(err){ setError(errMsg(err)); }finally{ setBusy(false); } }
  return <><PageTitle title="Form Peminjaman" subtitle={facility?.name}/><div className="grid gap-5 md:grid-cols-3"><Card className="md:col-span-2"><form onSubmit={submit} className="space-y-4"><Alert text={error}/><Field label="Tanggal" type="date" value={form.date} onChange={(e:any)=>setForm({...form,date:e.target.value})}/><div className="grid gap-4 md:grid-cols-2"><Field label="Jam Mulai" type="time" value={form.startTime} onChange={(e:any)=>setForm({...form,startTime:e.target.value})}/><Field label="Jam Selesai" type="time" value={form.endTime} onChange={(e:any)=>setForm({...form,endTime:e.target.value})}/></div><Field label="Estimasi Biaya" type="number" value={form.amount} onChange={(e:any)=>setForm({...form,amount:Number(e.target.value)})}/><TextArea label="Keperluan" value={form.purpose} onChange={(e:any)=>setForm({...form,purpose:e.target.value})}/><Button disabled={busy}>Submit Booking</Button></form></Card><Card><h3 className="font-bold">Info Fasilitas</h3><p className="mt-2 text-gray-600">{facility?.location}</p><p>Kapasitas {facility?.capacity}</p><Badge value={facility?.status}/></Card></div></>;
}

function BookingsPage({ pj=false, history=false, admin=false }: any) {
  const [items,setItems]=useState<any[]>([]); const url = pj ? `/pj/bookings${history ? '' : '?status=pending'}` : '/bookings';
  useEffect(()=>{ apiGet<any[]>(url).then(setItems); },[url]);
  const base = pj ? '/pj/bookings' : admin ? '/admin/bookings' : '/bookings';
  return <><PageTitle title={pj ? (history ? 'Riwayat Approval' : 'Booking Pending') : admin ? 'Semua Booking' : 'Peminjaman Saya'} subtitle="Data peminjaman fasilitas"/>{items.length ? <Card><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-gray-500"><th className="p-2">Fasilitas</th><th className="p-2">Mahasiswa</th><th className="p-2">Tanggal</th><th className="p-2">Status</th><th className="p-2">Payment</th><th className="p-2">Aksi</th></tr></thead><tbody>{items.map(b=><tr className="border-t" key={b.id}><td className="p-2 font-semibold">{b.facility?.name}</td><td className="p-2">{b.user?.name}</td><td className="p-2">{fmtDate(b.date)} {b.startTime}-{b.endTime}</td><td className="p-2"><Badge value={b.status}/></td><td className="p-2"><Badge value={b.payment?.status}/></td><td className="p-2"><Link to={`${base}/${b.id}`}><Button variant="secondary">Detail</Button></Link></td></tr>)}</tbody></table></div></Card> : <Empty/>}</>;
}
function BookingDetailPage({ pj=false, admin=false }: any) {
  const { id } = useParams(); const [item,setItem]=useState<any>(null); const [note,setNote]=useState(''); const [file,setFile]=useState<File|null>(null); const [error,setError]=useState(''); const [success,setSuccess]=useState('');
  const load=()=>apiGet<any>(pj ? `/pj/bookings/${id}` : `/bookings/${id}`).then(setItem).catch(e=>setError(errMsg(e)));
  useEffect(()=>{ load(); },[id]);
  async function action(kind:string){ setError(''); setSuccess(''); try{ if(kind==='approve') await apiPut(`/pj/bookings/${id}/approve`,{pjNote:note}); if(kind==='reject') await apiPut(`/pj/bookings/${id}/reject`,{pjNote:note}); if(kind==='complete') await apiPut(`/bookings/${id}/complete`,{adminNote:note}); setSuccess('Aksi berhasil'); load(); }catch(e){ setError(errMsg(e)); } }
  async function uploadProof(e:FormEvent){ e.preventDefault(); if(!file) return setError('Pilih file bukti bayar'); const fd = new FormData(); fd.append('proofImage',file); try{ await apiPost(`/payments/${item.payment.id}/upload`,fd,{headers:{'Content-Type':'multipart/form-data'}}); setSuccess('Bukti pembayaran berhasil diupload'); load(); }catch(err){ setError(errMsg(err)); } }
  if(!item) return <Loading/>;
  return <><PageTitle title="Detail Booking" subtitle={item.facility?.name}/><div className="grid gap-5 md:grid-cols-3"><Card className="md:col-span-2 space-y-3"><Alert text={error}/><Alert text={success} type="success"/><p><b>Mahasiswa:</b> {item.user?.name}</p><p><b>Fasilitas:</b> {item.facility?.name} - {item.facility?.area?.name}</p><p><b>Waktu:</b> {fmtDate(item.date)} {item.startTime}-{item.endTime}</p><p><b>Keperluan:</b> {item.purpose}</p><p><b>Status:</b> <Badge value={item.status}/></p><p><b>Payment:</b> <Badge value={item.payment?.status}/></p><p><b>Catatan PJ:</b> {item.pjNote || '-'}</p><p><b>Catatan Admin:</b> {item.adminNote || item.payment?.adminNote || '-'}</p>{item.payment?.proofImage && <a className="font-semibold text-telkom-red" href={item.payment.proofImage.startsWith('http') ? item.payment.proofImage : `${API_URL.replace('/api','')}${item.payment.proofImage}`} target="_blank">Lihat bukti pembayaran</a>}</Card><Card className="space-y-4"><TextArea label="Catatan" value={note} onChange={(e:any)=>setNote(e.target.value)}/>{pj && item.status==='pending' && <div className="flex gap-2"><Button variant="success" onClick={()=>action('approve')}>Approve</Button><Button variant="danger" onClick={()=>action('reject')}>Reject</Button></div>}{!pj && !admin && item.status==='approved_by_pj' && item.payment?.status !== 'paid' && <form onSubmit={uploadProof} className="space-y-3"><input type="file" accept="image/*" onChange={(e:any)=>setFile(e.target.files?.[0] || null)}/><Button>Upload Bukti Bayar</Button></form>}{admin && item.status==='approved_by_pj' && item.payment?.status==='paid' && <Button onClick={()=>action('complete')}>Complete Booking</Button>}</Card></div></>;
}

function PaymentsPage({ admin=false }: any) { const [items,setItems]=useState<any[]>([]); useEffect(()=>{ apiGet<any[]>(admin?'/payments':'/payments/my').then(setItems); },[admin]); return <><PageTitle title={admin?'Daftar Payment':'Pembayaran Saya'} subtitle="Status pembayaran booking"/>{items.length?<Card><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-gray-500"><th className="p-2">Booking</th><th className="p-2">Mahasiswa</th><th className="p-2">Amount</th><th className="p-2">Status</th><th className="p-2">Aksi</th></tr></thead><tbody>{items.map(p=><tr className="border-t" key={p.id}><td className="p-2">{p.booking?.facility?.name}</td><td className="p-2">{p.booking?.user?.name}</td><td className="p-2">Rp {Number(p.amount||0).toLocaleString('id-ID')}</td><td className="p-2"><Badge value={p.status}/></td><td className="p-2"><Link to={admin?`/admin/payments/${p.id}`:`/bookings/${p.bookingId}`}><Button variant="secondary">Detail</Button></Link></td></tr>)}</tbody></table></div></Card>:<Empty/>}</>; }
function PaymentDetailPage() { const { id }=useParams(); const [item,setItem]=useState<any>(null); const [note,setNote]=useState(''); const [msg,setMsg]=useState(''); const [error,setError]=useState(''); const load=()=>apiGet<any>(`/payments/${id}`).then(setItem); useEffect(()=>{load();},[id]); async function act(kind:string){try{await apiPut(`/payments/${id}/${kind}`,{adminNote:note}); setMsg('Aksi berhasil'); load();}catch(e){setError(errMsg(e));}} if(!item) return <Loading/>; return <><PageTitle title="Detail Payment" subtitle={item.booking?.facility?.name}/><Card className="space-y-3"><Alert text={error}/><Alert text={msg} type="success"/><p><b>Mahasiswa:</b> {item.booking?.user?.name}</p><p><b>Status:</b> <Badge value={item.status}/></p><p><b>Amount:</b> Rp {Number(item.amount||0).toLocaleString('id-ID')}</p>{item.proofImage && <a className="font-semibold text-telkom-red" href={item.proofImage.startsWith('http') ? item.proofImage : `${API_URL.replace('/api','')}${item.proofImage}`} target="_blank">Lihat bukti pembayaran</a>}<TextArea label="Catatan admin" value={note} onChange={(e:any)=>setNote(e.target.value)}/>{item.status==='waiting_verification' && <div className="flex gap-2"><Button variant="success" onClick={()=>act('verify')}>Verify</Button><Button variant="danger" onClick={()=>act('reject')}>Reject</Button></div>}</Card></>; }

function AdminUsersPage(){ const [items,setItems]=useState<any[]>([]); const [areas,setAreas]=useState<any[]>([]); const [form,setForm]=useState<any>({role:'mahasiswa'}); const [error,setError]=useState(''); const load=()=>{apiGet<any[]>('/users').then(setItems); apiGet<any[]>('/areas').then(setAreas);}; useEffect(()=>{ load(); },[]); async function save(e:FormEvent){e.preventDefault(); try{ if(form.id) await apiPut(`/users/${form.id}`,form); else await apiPost('/users',form); setForm({role:'mahasiswa'}); load(); }catch(err){setError(errMsg(err));}} async function del(id:string){ if(confirm('Hapus user?')){await apiDelete(`/users/${id}`); load();}} return <><PageTitle title="Kelola User"/><div className="grid gap-5 md:grid-cols-3"><Card><form onSubmit={save} className="space-y-3"><Alert text={error}/><Field label="Nama" value={form.name||''} onChange={(e:any)=>setForm({...form,name:e.target.value})}/><Field label="Email" value={form.email||''} onChange={(e:any)=>setForm({...form,email:e.target.value})}/><Field label="Password" type="password" placeholder={form.id?'Kosongkan jika tidak diubah':''} value={form.password||''} onChange={(e:any)=>setForm({...form,password:e.target.value})}/><Select label="Role" value={form.role||'mahasiswa'} onChange={(e:any)=>setForm({...form,role:e.target.value})}><option value="mahasiswa">Mahasiswa</option><option value="penanggung_jawab">Penanggung Jawab</option><option value="admin">Admin</option></Select><Select label="Area PJ" value={form.areaId||''} onChange={(e:any)=>setForm({...form,areaId:e.target.value})}><option value="">-</option>{areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</Select><Button>{form.id?'Update':'Tambah'}</Button></form></Card><Card className="md:col-span-2"><List rows={items} cols={['name','email','role']} onEdit={setForm} onDelete={del}/></Card></div></>; }
function AdminAreasPage(){ const [items,setItems]=useState<any[]>([]); const [form,setForm]=useState<any>({}); const load=()=>apiGet<any[]>('/areas').then(setItems); useEffect(()=>{ load(); },[]); async function save(e:FormEvent){e.preventDefault(); form.id?await apiPut(`/areas/${form.id}`,form):await apiPost('/areas',form); setForm({}); load();} async function del(id:string){if(confirm('Hapus area?')){await apiDelete(`/areas/${id}`); load();}} return <><PageTitle title="Kelola Area"/><div className="grid gap-5 md:grid-cols-3"><Card><form onSubmit={save} className="space-y-3"><Field label="Nama Area" value={form.name||''} onChange={(e:any)=>setForm({...form,name:e.target.value})}/><TextArea label="Deskripsi" value={form.description||''} onChange={(e:any)=>setForm({...form,description:e.target.value})}/><Button>{form.id?'Update':'Tambah'}</Button></form></Card><Card className="md:col-span-2"><List rows={items} cols={['name','description']} onEdit={setForm} onDelete={del}/></Card></div></>; }
function AdminFacilitiesPage(){ const [items,setItems]=useState<any[]>([]); const [areas,setAreas]=useState<any[]>([]); const [form,setForm]=useState<any>({status:'available'}); const load=()=>{apiGet<any[]>('/facilities').then(setItems); apiGet<any[]>('/areas').then(setAreas);}; useEffect(()=>{ load(); },[]); async function save(e:FormEvent){e.preventDefault(); form.id?await apiPut(`/facilities/${form.id}`,form):await apiPost('/facilities',form); setForm({status:'available'}); load();} async function del(id:string){if(confirm('Hapus fasilitas?')){await apiDelete(`/facilities/${id}`); load();}} return <><PageTitle title="Kelola Fasilitas"/><div className="grid gap-5 md:grid-cols-3"><Card><form onSubmit={save} className="space-y-3"><Field label="Nama" value={form.name||''} onChange={(e:any)=>setForm({...form,name:e.target.value})}/><Select label="Area" value={form.areaId||''} onChange={(e:any)=>setForm({...form,areaId:e.target.value})}><option value="">Pilih Area</option>{areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</Select><Field label="Lokasi" value={form.location||''} onChange={(e:any)=>setForm({...form,location:e.target.value})}/><Field label="Kapasitas" type="number" value={form.capacity||''} onChange={(e:any)=>setForm({...form,capacity:Number(e.target.value)})}/><Select label="Status" value={form.status||'available'} onChange={(e:any)=>setForm({...form,status:e.target.value})}><option value="available">Available</option><option value="unavailable">Unavailable</option></Select><TextArea label="Deskripsi" value={form.description||''} onChange={(e:any)=>setForm({...form,description:e.target.value})}/><Button>{form.id?'Update':'Tambah'}</Button></form></Card><Card className="md:col-span-2"><List rows={items} cols={['name','location','capacity','status']} onEdit={setForm} onDelete={del}/></Card></div></>; }
function List({ rows, cols, onEdit, onDelete }: any){ return rows.length?<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{cols.map((c:string)=><th className="p-2 text-left text-gray-500" key={c}>{c}</th>)}<th className="p-2">Aksi</th></tr></thead><tbody>{rows.map((r:any)=><tr className="border-t" key={r.id}>{cols.map((c:string)=><td className="p-2" key={c}>{c==='status'||c==='role'?<Badge value={r[c]}/>:String(r[c] ?? '-')}</td>)}<td className="flex gap-2 p-2"><Button variant="secondary" onClick={()=>onEdit(r)}>Edit</Button><Button variant="danger" onClick={()=>onDelete(r.id)}>Delete</Button></td></tr>)}</tbody></table></div>:<Empty/>; }
function NotFound(){ return <PageTitle title="404" subtitle="Halaman tidak ditemukan"/>; }

export default function App() {
  return <AuthProvider><BrowserRouter><Routes>
    <Route path="/login" element={<Guest><LoginPage/></Guest>}/><Route path="/register" element={<Guest><RegisterPage/></Guest>}/>
    <Route path="/" element={<RequireHome/>}/>
    <Route path="/dashboard" element={<Protected roles={['mahasiswa']}><DashboardPage role="mahasiswa"/></Protected>}/>
    <Route path="/facilities" element={<Protected roles={['mahasiswa','penanggung_jawab','admin']}><FacilitiesPage/></Protected>}/>
    <Route path="/facilities/:id" element={<Protected roles={['mahasiswa','penanggung_jawab','admin']}><FacilityDetailPage/></Protected>}/>
    <Route path="/facilities/:id/book" element={<Protected roles={['mahasiswa']}><BookingFormPage/></Protected>}/>
    <Route path="/bookings" element={<Protected roles={['mahasiswa']}><BookingsPage/></Protected>}/>
    <Route path="/bookings/:id" element={<Protected roles={['mahasiswa']}><BookingDetailPage/></Protected>}/>
    <Route path="/payments" element={<Protected roles={['mahasiswa']}><PaymentsPage/></Protected>}/>
    <Route path="/pj/dashboard" element={<Protected roles={['penanggung_jawab']}><DashboardPage role="penanggung_jawab"/></Protected>}/>
    <Route path="/pj/bookings" element={<Protected roles={['penanggung_jawab']}><BookingsPage pj/></Protected>}/>
    <Route path="/pj/bookings/:id" element={<Protected roles={['penanggung_jawab']}><BookingDetailPage pj/></Protected>}/>
    <Route path="/pj/history" element={<Protected roles={['penanggung_jawab']}><BookingsPage pj history/></Protected>}/>
    <Route path="/admin/dashboard" element={<Protected roles={['admin']}><DashboardPage role="admin"/></Protected>}/>
    <Route path="/admin/users" element={<Protected roles={['admin']}><AdminUsersPage/></Protected>}/>
    <Route path="/admin/areas" element={<Protected roles={['admin']}><AdminAreasPage/></Protected>}/>
    <Route path="/admin/facilities" element={<Protected roles={['admin']}><AdminFacilitiesPage/></Protected>}/>
    <Route path="/admin/bookings" element={<Protected roles={['admin']}><BookingsPage admin/></Protected>}/>
    <Route path="/admin/bookings/:id" element={<Protected roles={['admin']}><BookingDetailPage admin/></Protected>}/>
    <Route path="/admin/payments" element={<Protected roles={['admin']}><PaymentsPage admin/></Protected>}/>
    <Route path="/admin/payments/:id" element={<Protected roles={['admin']}><PaymentDetailPage/></Protected>}/>
    <Route path="*" element={<Protected><NotFound/></Protected>}/>
  </Routes></BrowserRouter></AuthProvider>;
}
function RequireHome(){ const {user,loading}=useAuth(); if(loading)return <Loading/>; return <Navigate to={user?roleHome(user.role):'/login'}/>; }

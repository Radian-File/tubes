import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);

  const tokong = await prisma.area.upsert({
    where: { id: 'area-tokong-nanas' },
    update: {},
    create: { id: 'area-tokong-nanas', name: 'Gedung Tokong Nanas', description: 'Area gedung perkuliahan utama.' },
  });
  const damar = await prisma.area.upsert({
    where: { id: 'area-damar' },
    update: {},
    create: { id: 'area-damar', name: 'Gedung Damar', description: 'Area gedung akademik dan aula.' },
  });
  const lapangan = await prisma.area.upsert({
    where: { id: 'area-lapangan' },
    update: {},
    create: { id: 'area-lapangan', name: 'Lapangan Utama', description: 'Area outdoor kampus.' },
  });

  await prisma.user.upsert({
    where: { email: 'admin@telkompinjam.test' },
    update: {},
    create: { name: 'Admin Telkom Pinjam', email: 'admin@telkompinjam.test', password, role: 'admin' },
  });
  await prisma.user.upsert({
    where: { email: 'pj.tokong@telkompinjam.test' },
    update: {},
    create: { name: 'PJ Tokong Nanas', email: 'pj.tokong@telkompinjam.test', password, role: 'penanggung_jawab', areaId: tokong.id },
  });
  await prisma.user.upsert({
    where: { email: 'mahasiswa@telkompinjam.test' },
    update: {},
    create: { name: 'Mahasiswa Dummy', email: 'mahasiswa@telkompinjam.test', password, role: 'mahasiswa' },
  });

  const facilities = [
    { id: 'facility-aula-tokong', areaId: tokong.id, name: 'Aula Tokong Nanas', location: 'Lantai 1 Gedung Tokong Nanas', capacity: 150, description: 'Aula untuk seminar dan kegiatan organisasi.' },
    { id: 'facility-ruang-damar-101', areaId: damar.id, name: 'Ruang Damar 101', location: 'Lantai 1 Gedung Damar', capacity: 60, description: 'Ruang kelas kapasitas sedang.' },
    { id: 'facility-lapangan-utama', areaId: lapangan.id, name: 'Lapangan Utama', location: 'Area outdoor kampus', capacity: 300, description: 'Lapangan untuk kegiatan olahraga dan event outdoor.' },
  ];

  for (const facility of facilities) {
    await prisma.facility.upsert({ where: { id: facility.id }, update: {}, create: facility });
  }

  console.log('Seed completed. Demo password for all accounts: password123');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => prisma.$disconnect());

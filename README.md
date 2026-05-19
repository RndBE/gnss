# Dashboard Pemantauan Penurunan Pesisir

Dashboard monitoring pesisir berbasis GNSS, AWLR/tide station, CCTV, telemetry logger, alarm, dan status risiko rob.

## Status Implementasi

Sudah dibuat:

- Next.js App Router + TypeScript scaffold.
- Tailwind CSS v4 global import.
- Backend MySQL lewat Prisma ORM.
- Prisma schema untuk user, role, area, titik monitoring, perangkat, GNSS reading, water level reading, weather reading, CCTV snapshot, alarm, event, maintenance, report, threshold, dan risk weight.
- Seed data operasional awal.
- Dukungan MySQL eksternal lewat `DATABASE_URL`.
- Docker Compose MySQL lokal opsional.
- Layout dashboard operasional dengan sidebar dan header.
- Navigasi halaman untuk semua menu utama rancangan.
- KPI ringkasan: penurunan maksimum, rata-rata penurunan, muka air, titik aktif, alarm aktif.
- Peta risiko Leaflet untuk marker GNSS, AWLR, dan CCTV.
- Grafik time series GNSS dan muka air laut menggunakan Recharts.
- Panel risiko rob rule-based.
- Alarm terbaru.
- Status perangkat/logger.
- CCTV snapshot placeholder.
- Halaman Peta Risiko.
- Halaman Data GNSS.
- Halaman Data AWLR / Tide.
- Halaman CCTV Monitoring.
- Halaman Analisis Risiko.
- Halaman Alarm & Event.
- Halaman Laporan.
- Halaman Perangkat.
- Halaman Pengaturan.
- Halaman Login/Role dengan API login database.
- API database `GET /api/dashboard/summary`.
- API database `GET /api/map/points`.
- API database `GET /api/gnss/readings`.
- API database `GET /api/water-level/readings`.
- API database `GET /api/cctv/snapshots`.
- API database `GET /api/alarms`.
- API database `POST /api/alarms/resolve`.
- API database `POST /api/alarms/validate`.
- API database `GET /api/alarm-thresholds`.
- API database `POST /api/alarm-thresholds`.
- API database `PUT /api/alarm-thresholds`.
- API database `DELETE /api/alarm-thresholds`.
- API database `GET /api/devices/status`.
- API database `GET /api/loggers/latest`.
- API database `POST /api/reports/generate`.
- API database `GET /api/risk-weights`.
- API database `POST /api/risk-weights`.
- API database `PUT /api/risk-weights`.
- API database `DELETE /api/risk-weights`.
- API database `GET /api/settings/thresholds`.
- API database `PUT /api/settings/thresholds`.
- API database `POST /api/auth/login`.
- Export CSV database `GET /api/reports/daily`.

Sudah diverifikasi:

- `npx prisma validate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

Belum dilakukan:

- Session cookie dan role guard middleware untuk auth.
- MQTT WebSocket / Socket.IO realtime.
- Upload/storage snapshot CCTV nyata.
- Export PDF nyata.
- Background job/report scheduler.
- Notification gateway.
- AI forecast/anomaly/visual detection nyata.

## Struktur Utama

```text
app/
  api/auth/login/route.ts
  api/dashboard/summary/route.ts
  api/map/points/route.ts
  api/gnss/readings/route.ts
  api/water-level/readings/route.ts
  api/cctv/snapshots/route.ts
  api/alarms/route.ts
  api/alarms/resolve/route.ts
  api/devices/status/route.ts
  api/settings/thresholds/route.ts
  api/reports/generate/route.ts
  api/reports/daily/route.ts
  peta-risiko/page.tsx
  gnss/page.tsx
  awlr/page.tsx
  cctv/page.tsx
  analisis-risiko/page.tsx
  alarm/page.tsx
  laporan/page.tsx
  perangkat/page.tsx
  pengaturan/page.tsx
  login/page.tsx
  globals.css
  layout.tsx
  page.tsx
components/
  dashboard/
  ui/
lib/
  backend/
  prisma.ts
  types.ts
  utils.ts
prisma/
  schema.prisma
  seed.js
```

## Setup dengan MySQL Sendiri

Isi `.env` dengan koneksi MySQL milikmu:

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/gnss_dashboard"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Pastikan user MySQL punya izin minimal untuk membuat dan mengubah tabel pada database target:

```sql
CREATE DATABASE IF NOT EXISTS gnss_dashboard;
GRANT ALL PRIVILEGES ON gnss_dashboard.* TO 'USER'@'%';
FLUSH PRIVILEGES;
```

Lalu jalankan:

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Lalu buka `http://localhost:3000`.

## Setup MySQL Lokal Opsional

Gunakan ini hanya kalau belum memakai MySQL sendiri:

```bash
cp .env.example .env
docker compose up -d mysql
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Demo login API:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"operator@gnss.local","password":"operator123"}'
```

## Catatan Operasional

Frontend dan route handler sekarang membaca database MySQL lewat Prisma. Jika `DATABASE_URL` belum aktif atau seed belum dijalankan, halaman akan error karena tidak ada data operasional awal.

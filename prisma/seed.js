/* eslint-disable @typescript-eslint/no-require-imports */
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const now = new Date("2026-05-19T01:30:00.000Z");

function hoursAgo(hours) {
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}

function minutesAgo(minutes) {
  return new Date(now.getTime() - minutes * 60 * 1000);
}

function daysAgo(days) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function buildGnssReadings({
  pointId,
  startElevationM,
  endElevationM,
  startSubsidenceCm,
  endSubsidenceCm,
  startVelocityCmYear,
  endVelocityCmYear,
}) {
  const totalDays = 180;
  const rows = [];

  function readingAt(dayAgo) {
    const progress = (totalDays - dayAgo) / totalDays;
    const seasonal = Math.sin(progress * Math.PI * 6) * 0.08;
    const shortNoise = Math.cos(progress * Math.PI * 13) * 0.03;
    const elevation =
      startElevationM + (endElevationM - startElevationM) * progress;
    const subsidence =
      startSubsidenceCm +
      (endSubsidenceCm - startSubsidenceCm) * progress +
      seasonal;
    const velocity =
      startVelocityCmYear +
      (endVelocityCmYear - startVelocityCmYear) * progress +
      shortNoise;

    return {
      pointId,
      recordedAt: daysAgo(dayAgo),
      elevationM: round(elevation, 3),
      subsidenceCm: round(subsidence, 2),
      velocityCmYear: round(velocity, 2),
    };
  }

  for (let day = totalDays; day >= 7; day -= 7) {
    rows.push(readingAt(day));
  }

  for (let hour = 24; hour >= 0; hour -= 3) {
    rows.push(readingAt(hour / 24));
  }

  return rows;
}

function buildWaterLevelReadings({
  pointId,
  days = 14,
  baseLevelM,
  amplitudeM,
  endLevelM,
  phase = 0,
  waspadaM,
  siagaM,
  awasM,
}) {
  const totalHours = days * 24;
  const rows = [];

  function valueAt(hoursBack) {
    if (hoursBack <= 1) {
      return endLevelM - 0.08 * (hoursBack / 1);
    }

    const elapsed = totalHours - hoursBack;
    const tide =
      baseLevelM +
      amplitudeM * Math.sin((elapsed / 6 + phase) * Math.PI) +
      0.04 * Math.sin((elapsed / 18) * Math.PI);
    return tide;
  }

  function row(recordedAt, hoursBack) {
    return {
      pointId,
      recordedAt,
      waterLevelM: round(valueAt(hoursBack), 2),
      waspadaM,
      siagaM,
      awasM,
    };
  }

  for (let hour = totalHours; hour >= 3; hour -= 3) {
    rows.push(row(hoursAgo(hour), hour));
  }

  for (let minute = 60; minute >= 0; minute -= 5) {
    rows.push(row(minutesAgo(minute), minute / 60));
  }

  return rows;
}

async function main() {
  await prisma.report.deleteMany();
  await prisma.reportTemplate.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.alarm.deleteMany();
  await prisma.event.deleteMany();
  await prisma.cameraSnapshot.deleteMany();
  await prisma.weatherReading.deleteMany();
  await prisma.waterLevelReading.deleteMany();
  await prisma.gnssReading.deleteMany();
  await prisma.pointThreshold.deleteMany();
  await prisma.device.deleteMany();
  await prisma.monitoringPoint.deleteMany();
  await prisma.monitoringArea.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.threshold.deleteMany();
  await prisma.riskWeight.deleteMany();

  const roles = await Promise.all(
    [
      ["Super Admin", "Semua fitur dan pengaturan sistem"],
      ["Admin Instansi", "Monitoring, laporan, pengaturan area"],
      ["Operator", "Monitoring, alarm, catatan event"],
      ["Teknisi", "Status perangkat dan maintenance"],
      ["Viewer", "Dashboard dan laporan terbatas"],
      ["Stakeholder", "Executive summary dan peta risiko"],
    ].map(([name, access]) =>
      prisma.role.create({
        data: { name, access },
      }),
    ),
  );

  await prisma.user.createMany({
    data: [
      {
        name: "Operator Pantura",
        email: "operator@gnss.local",
        passwordHash: bcrypt.hashSync("operator123", 10),
        roleId: roles.find((role) => role.name === "Operator").id,
      },
      {
        name: "Admin Instansi",
        email: "admin@gnss.local",
        passwordHash: bcrypt.hashSync("admin123", 10),
        roleId: roles.find((role) => role.name === "Admin Instansi").id,
      },
    ],
  });

  const pekalongan = await prisma.monitoringArea.create({
    data: {
      name: "Pekalongan Utara",
      city: "Kota Pekalongan",
      province: "Jawa Tengah",
      description: "Area prioritas rob dan penurunan tanah pesisir.",
    },
  });
  const semarang = await prisma.monitoringArea.create({
    data: {
      name: "Semarang Utara",
      city: "Kota Semarang",
      province: "Jawa Tengah",
      description: "Area pelabuhan dan permukiman pesisir.",
    },
  });
  const demak = await prisma.monitoringArea.create({
    data: {
      name: "Sayung",
      city: "Kabupaten Demak",
      province: "Jawa Tengah",
      description: "Area pesisir dengan riwayat rob berulang.",
    },
  });

  const gnssPkl = await prisma.monitoringPoint.create({
    data: {
      code: "gnss-pkl-01",
      name: "GNSS PKL-01",
      type: "GNSS",
      latitude: -6.873,
      longitude: 109.675,
      areaId: pekalongan.id,
      status: "AWAS",
      latestValue: "-8.2 cm/tahun",
      baselineElevationM: 2.14,
      currentElevationM: 1.78,
      totalSubsidenceCm: -36,
      velocityCmYear: -8.2,
      lastUpdate: hoursAgo(0.03),
    },
  });
  const gnssSmg = await prisma.monitoringPoint.create({
    data: {
      code: "gnss-smg-02",
      name: "GNSS SMG-02",
      type: "GNSS",
      latitude: -6.957,
      longitude: 110.421,
      areaId: semarang.id,
      status: "SIAGA",
      latestValue: "-5.1 cm/tahun",
      baselineElevationM: 2.42,
      currentElevationM: 2.19,
      totalSubsidenceCm: -23,
      velocityCmYear: -5.1,
      lastUpdate: hoursAgo(0.06),
    },
  });
  const gnssDmk = await prisma.monitoringPoint.create({
    data: {
      code: "gnss-dmk-03",
      name: "GNSS DMK-03",
      type: "GNSS",
      latitude: -6.887,
      longitude: 110.638,
      areaId: demak.id,
      status: "WASPADA",
      latestValue: "-3.2 cm/tahun",
      baselineElevationM: 1.86,
      currentElevationM: 1.72,
      totalSubsidenceCm: -14,
      velocityCmYear: -3.2,
      lastUpdate: hoursAgo(0.15),
    },
  });
  const awlrPkl = await prisma.monitoringPoint.create({
    data: {
      code: "awlr-pkl-01",
      name: "AWLR PKL-01",
      type: "AWLR",
      latitude: -6.859,
      longitude: 109.671,
      areaId: pekalongan.id,
      status: "SIAGA",
      latestValue: "1.89 m",
      lastUpdate: now,
    },
  });
  const awlrSmg = await prisma.monitoringPoint.create({
    data: {
      code: "awlr-smg-01",
      name: "Tide SMG-01",
      type: "AWLR",
      latitude: -6.948,
      longitude: 110.405,
      areaId: semarang.id,
      status: "WASPADA",
      latestValue: "1.62 m",
      lastUpdate: now,
    },
  });
  const cctvPkl = await prisma.monitoringPoint.create({
    data: {
      code: "cctv-pkl-01",
      name: "CCTV Tanggul PKL",
      type: "CCTV",
      latitude: -6.866,
      longitude: 109.682,
      areaId: pekalongan.id,
      status: "SIAGA",
      latestValue: "Online",
      lastUpdate: hoursAgo(0.1),
    },
  });
  const cctvSmg = await prisma.monitoringPoint.create({
    data: {
      code: "cctv-smg-02",
      name: "CCTV Pelabuhan",
      type: "CCTV",
      latitude: -6.946,
      longitude: 110.421,
      areaId: semarang.id,
      status: "NORMAL",
      latestValue: "Online",
      lastUpdate: hoursAgo(0.2),
    },
  });

  await prisma.gnssReading.createMany({
    data: [
      ...buildGnssReadings({
        pointId: gnssPkl.id,
        startElevationM: 1.94,
        endElevationM: 1.78,
        startSubsidenceCm: -3.6,
        endSubsidenceCm: -8.2,
        startVelocityCmYear: -4.4,
        endVelocityCmYear: -8.2,
      }),
      ...buildGnssReadings({
        pointId: gnssSmg.id,
        startElevationM: 2.34,
        endElevationM: 2.19,
        startSubsidenceCm: -2.4,
        endSubsidenceCm: -5.1,
        startVelocityCmYear: -2.7,
        endVelocityCmYear: -5.1,
      }),
      ...buildGnssReadings({
        pointId: gnssDmk.id,
        startElevationM: 1.83,
        endElevationM: 1.72,
        startSubsidenceCm: -1.3,
        endSubsidenceCm: -3.2,
        startVelocityCmYear: -1.5,
        endVelocityCmYear: -3.2,
      }),
    ],
  });

  await prisma.waterLevelReading.createMany({
    data: [
      ...buildWaterLevelReadings({
        pointId: awlrPkl.id,
        baseLevelM: 1.43,
        amplitudeM: 0.31,
        endLevelM: 1.89,
        phase: 0.15,
        waspadaM: 1.6,
        siagaM: 1.8,
        awasM: 2.0,
      }),
      ...buildWaterLevelReadings({
        pointId: awlrSmg.id,
        baseLevelM: 1.29,
        amplitudeM: 0.25,
        endLevelM: 1.62,
        phase: 0.55,
        waspadaM: 1.55,
        siagaM: 1.75,
        awasM: 1.95,
      }),
    ],
  });

  const deviceCctv = await prisma.device.create({
    data: {
      code: "dev-cctv-slamaran",
      name: "CCTV Tanggul PKL",
      type: "CCTV",
      status: "WEAK",
      battery: 24,
      signal: 38,
      solarCharging: true,
      firmwareVersion: "1.8.0",
      sensorStatus: "Camera tanggul online, battery low",
      lastDataReceived: hoursAgo(0.1),
      pointId: cctvPkl.id,
    },
  });
  const deviceDmk = await prisma.device.create({
    data: {
      code: "dev-gnss-dmk",
      name: "Logger GNSS DMK-03",
      type: "LOGGER",
      status: "MAINTENANCE",
      battery: 55,
      signal: 0,
      solarCharging: false,
      firmwareVersion: "2.1.4",
      sensorStatus: "GNSS maintenance",
      lastDataReceived: hoursAgo(2.3),
      pointId: gnssDmk.id,
    },
  });
  await prisma.device.createMany({
    data: [
      {
        code: "dev-gnss-pkl",
        name: "Logger GNSS PKL-01",
        type: "LOGGER",
        status: "ONLINE",
        battery: 88,
        signal: 78,
        firmwareVersion: "2.1.4",
        sensorStatus: "GNSS aktif",
        lastDataReceived: hoursAgo(0.03),
        pointId: gnssPkl.id,
      },
      {
        code: "dev-gnss-smg",
        name: "Logger GNSS SMG-02",
        type: "LOGGER",
        status: "WEAK",
        battery: 66,
        signal: 61,
        firmwareVersion: "2.1.4",
        sensorStatus: "GNSS aktif, sinyal sedang",
        lastDataReceived: hoursAgo(0.06),
        pointId: gnssSmg.id,
      },
      {
        code: "dev-awlr-pkl",
        name: "Telemetry AWLR PKL-01",
        type: "AWLR",
        status: "ONLINE",
        battery: 72,
        signal: 64,
        firmwareVersion: "1.9.2",
        sensorStatus: "AWLR aktif",
        lastDataReceived: now,
        pointId: awlrPkl.id,
      },
      {
        code: "dev-awlr-smg",
        name: "Telemetry Tide SMG-01",
        type: "AWLR",
        status: "WEAK",
        battery: 68,
        signal: 57,
        firmwareVersion: "1.9.2",
        sensorStatus: "Tide gauge aktif",
        lastDataReceived: now,
        pointId: awlrSmg.id,
      },
      {
        code: "dev-cctv-pelabuhan",
        name: "CCTV Pelabuhan",
        type: "CCTV",
        status: "ONLINE",
        battery: 84,
        signal: 76,
        firmwareVersion: "1.8.0",
        sensorStatus: "Camera pelabuhan online",
        lastDataReceived: hoursAgo(0.2),
        pointId: cctvSmg.id,
      },
    ],
  });

  await prisma.cameraSnapshot.createMany({
    data: [
      {
        pointId: cctvPkl.id,
        capturedAt: hoursAgo(0.1),
        visibility: "Clear",
        status: "SIAGA",
        note: "Area tanggul terlihat normal dengan genangan rendah.",
      },
      {
        pointId: cctvSmg.id,
        capturedAt: hoursAgo(0.2),
        visibility: "Clear",
        status: "NORMAL",
        note: "Pelabuhan terlihat normal.",
      },
    ],
  });

  await prisma.alarm.createMany({
    data: [
      {
        code: "alm-1034",
        type: "Rob Risk Alert",
        areaId: pekalongan.id,
        pointId: gnssPkl.id,
        status: "AWAS",
        state: "OPEN",
        occurredAt: hoursAgo(0.17),
        message: "Kombinasi laju penurunan tinggi dan prediksi pasang malam.",
      },
      {
        code: "alm-1033",
        type: "Water Level Alert",
        areaId: pekalongan.id,
        pointId: awlrPkl.id,
        status: "SIAGA",
        state: "IN_PROGRESS",
        occurredAt: hoursAgo(0.3),
        message: "Muka air bergerak menuju ambang waspada.",
      },
      {
        code: "alm-1032",
        type: "Battery Low",
        areaId: pekalongan.id,
        pointId: cctvPkl.id,
        status: "WASPADA",
        state: "OPEN",
        occurredAt: hoursAgo(0.73),
        message: "Logger CCTV berada di 24 persen baterai.",
      },
    ],
  });

  await prisma.maintenanceLog.createMany({
    data: [
      {
        deviceId: deviceCctv.id,
        technician: "Tim Pekalongan",
        scheduledAt: new Date("2026-05-20T02:00:00.000Z"),
        note: "Cek panel surya dan baterai cadangan.",
        state: "OPEN",
      },
      {
        deviceId: deviceDmk.id,
        technician: "Tim Demak",
        scheduledAt: new Date("2026-05-19T03:00:00.000Z"),
        note: "Kalibrasi antena dan pengecekan koneksi logger.",
        state: "IN_PROGRESS",
      },
    ],
  });

  await prisma.threshold.createMany({
    data: [
      { id: "subsidence", metric: "Laju penurunan tanah", normal: "< 2 cm/tahun", waspada: "2-4 cm/tahun", siaga: "4-7 cm/tahun", awas: "> 7 cm/tahun" },
      { id: "water-level", metric: "Muka air laut", normal: "< 1.40 m", waspada: "1.60 m", siaga: "1.80 m", awas: "2.00 m" },
      { id: "battery", metric: "Baterai logger", normal: "> 60%", waspada: "40-60%", siaga: "25-40%", awas: "< 25%" },
    ],
  });

  await prisma.pointThreshold.createMany({
    data: [
      {
        pointId: gnssPkl.id,
        parameter: "velocity",
        unit: "cm/tahun",
        normal: 2,
        waspada: 4,
        siaga: 7,
        awas: 8,
      },
      {
        pointId: gnssSmg.id,
        parameter: "velocity",
        unit: "cm/tahun",
        normal: 2,
        waspada: 4,
        siaga: 5.5,
        awas: 7,
      },
      {
        pointId: gnssDmk.id,
        parameter: "velocity",
        unit: "cm/tahun",
        normal: 1.5,
        waspada: 3,
        siaga: 5,
        awas: 7,
      },
      {
        pointId: awlrPkl.id,
        parameter: "waterLevel",
        unit: "m",
        normal: 1.4,
        waspada: 1.6,
        siaga: 1.8,
        awas: 2,
      },
      {
        pointId: awlrSmg.id,
        parameter: "waterLevel",
        unit: "m",
        normal: 1.35,
        waspada: 1.55,
        siaga: 1.75,
        awas: 1.95,
      },
    ],
  });

  await prisma.riskWeight.createMany({
    data: [
      { id: "subsidence-rate", metric: "Laju penurunan tanah", weight: 35, source: "GNSS" },
      { id: "water-threshold", metric: "Muka air terhadap ambang", weight: 30, source: "AWLR/Tide" },
      { id: "rob-history", metric: "Riwayat kejadian rob", weight: 15, source: "Event historis" },
      { id: "rainfall", metric: "Curah hujan", weight: 10, source: "Sensor cuaca opsional" },
      { id: "device-status", metric: "Status perangkat", weight: 10, source: "Logger" },
    ],
  });

  await prisma.reportTemplate.createMany({
    data: [
      { id: "daily", name: "Laporan Harian", period: "Harian", audience: "Operator dan teknis lapangan", formats: ["PDF", "CSV", "Excel"] },
      { id: "monthly", name: "Laporan Bulanan", period: "Bulanan", audience: "Pemda, kementerian, stakeholder", formats: ["PDF", "Excel"] },
      { id: "event", name: "Laporan Event", period: "Per kejadian", audience: "Tim respons dan dokumentasi proyek", formats: ["PDF", "PNG", "JSON"] },
      { id: "executive", name: "Executive Summary", period: "Mingguan/Bulanan", audience: "Pimpinan dan stakeholder", formats: ["PDF"] },
    ],
  });

  await prisma.report.create({
    data: {
      templateId: "daily",
      areaName: "Pantura Jawa Tengah",
      status: "READY",
      downloadUrl: "/api/reports/daily",
      generatedAt: now,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

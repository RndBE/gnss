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
  totalDays = 180,
  startElevationM,
  endElevationM,
  startSubsidenceCm,
  endSubsidenceCm,
  startVelocityCmYear,
  endVelocityCmYear,
}) {
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

  for (let day = totalDays; day >= 4; day -= 1) {
    rows.push(readingAt(day));
  }

  for (let hour = 72; hour >= 0; hour -= 1) {
    rows.push(readingAt(hour / 24));
  }

  return rows;
}

function buildWaterLevelReadings({
  pointId,
  days = 180,
  baseLevelM,
  amplitudeM,
  endLevelM,
  phase = 0,
  waspadaM,
  siagaM,
  awasM,
  eventBiasM = 0,
}) {
  const totalHours = days * 24;
  const rows = [];

  function bell(elapsedHours, centerHours, widthHours, heightM) {
    const distance = (elapsedHours - centerHours) / widthHours;

    return heightM * Math.exp(-(distance * distance) / 2);
  }

  function jitter(elapsedHours) {
    return (
      Math.sin(elapsedHours * 0.73 + phase * 11) * 0.009 +
      Math.cos(elapsedHours * 0.19 + phase * 7) * 0.006
    );
  }

  function rawValueAt(elapsedHours) {
    const progress = elapsedHours / totalHours;
    const meanLevel = baseLevelM + eventBiasM * Math.pow(progress, 1.4);
    const springNeap =
      0.82 + 0.18 * Math.sin((elapsedHours / (14.77 * 24) + phase) * Math.PI * 2);
    const semidiurnal =
      amplitudeM *
      springNeap *
      Math.sin((elapsedHours / 12.42 + phase) * Math.PI * 2);
    const diurnalInequality =
      amplitudeM *
      0.24 *
      Math.sin((elapsedHours / 24.84 + phase * 0.6) * Math.PI * 2);
    const coastalSetUp =
      amplitudeM *
      0.12 *
      Math.sin((elapsedHours / (6.8 * 24) + phase * 1.7) * Math.PI * 2);
    const weatherSurge =
      bell(elapsedHours, totalHours * 0.18, 26, amplitudeM * 0.18) +
      bell(elapsedHours, totalHours * 0.46, 42, amplitudeM * 0.24) +
      bell(elapsedHours, totalHours * 0.73, 54, amplitudeM * 0.28) +
      bell(elapsedHours, totalHours - 10, 18, amplitudeM * 0.42);

    return (
      meanLevel +
      semidiurnal +
      diurnalInequality +
      coastalSetUp +
      weatherSurge +
      jitter(elapsedHours)
    );
  }

  const finalCorrection = endLevelM - rawValueAt(totalHours);

  function valueAt(hoursBack) {
    const elapsed = totalHours - hoursBack;
    const progress = elapsed / totalHours;

    return rawValueAt(elapsed) + finalCorrection * Math.pow(progress, 2.6);
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

  for (let day = days; day >= 4; day -= 1) {
    const hoursBack = day * 24;
    rows.push(row(hoursAgo(hoursBack), hoursBack));
  }

  for (let hour = 72; hour > 24; hour -= 1) {
    rows.push(row(hoursAgo(hour), hour));
  }

  for (let minute = 24 * 60; minute >= 0; minute -= 30) {
    rows.push(row(minutesAgo(minute), minute / 60));
  }

  return rows;
}

function buildWeatherReadings({
  pointId,
  rainfallPeakMm,
  temperatureBaseC,
  humidityBasePct,
  windBaseMs,
}) {
  const rows = [];

  for (let hour = 120; hour >= 0; hour -= 3) {
    const cycle = (120 - hour) / 120;
    const rainPulse = Math.max(
      0,
      Math.sin((cycle * 5 + rainfallPeakMm / 10) * Math.PI),
    );

    rows.push({
      pointId,
      recordedAt: hoursAgo(hour),
      rainfallMm: round(rainPulse * rainfallPeakMm, 1),
      temperatureC: round(
        temperatureBaseC + Math.sin(cycle * Math.PI * 8) * 1.8,
        1,
      ),
      humidityPct: round(
        Math.min(96, humidityBasePct + rainPulse * 12 + Math.cos(cycle * 9) * 4),
        1,
      ),
      pressureHpa: round(1009 + Math.cos(cycle * Math.PI * 4) * 3.2, 1),
      windSpeedMs: round(windBaseMs + Math.sin(cycle * Math.PI * 7) * 1.4, 1),
    });
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
      {
        name: "Teknisi Lapangan",
        email: "teknisi@gnss.local",
        passwordHash: bcrypt.hashSync("teknisi123", 10),
        roleId: roles.find((role) => role.name === "Teknisi").id,
      },
      {
        name: "Viewer Stakeholder",
        email: "viewer@gnss.local",
        passwordHash: bcrypt.hashSync("viewer123", 10),
        roleId: roles.find((role) => role.name === "Viewer").id,
      },
      {
        name: "Super Admin",
        email: "superadmin@gnss.local",
        passwordHash: bcrypt.hashSync("superadmin123", 10),
        roleId: roles.find((role) => role.name === "Super Admin").id,
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
  const batang = await prisma.monitoringArea.create({
    data: {
      name: "Batang Roban",
      city: "Kabupaten Batang",
      province: "Jawa Tengah",
      description: "Koridor pesisir industri dan pantai utara Batang.",
    },
  });
  const kendal = await prisma.monitoringArea.create({
    data: {
      name: "Kendal Kaliwungu",
      city: "Kabupaten Kendal",
      province: "Jawa Tengah",
      description: "Area muara dan kawasan industri pesisir Kendal.",
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
  const gnssBtg = await prisma.monitoringPoint.create({
    data: {
      code: "gnss-btg-01",
      name: "GNSS BTG-01",
      type: "GNSS",
      latitude: -6.899,
      longitude: 109.73,
      areaId: batang.id,
      status: "SIAGA",
      latestValue: "-4.6 cm/tahun",
      baselineElevationM: 2.08,
      currentElevationM: 1.89,
      totalSubsidenceCm: -19,
      velocityCmYear: -4.6,
      lastUpdate: hoursAgo(0.08),
    },
  });
  const awlrBtg = await prisma.monitoringPoint.create({
    data: {
      code: "awlr-btg-01",
      name: "AWLR Roban BTG-01",
      type: "AWLR",
      latitude: -6.885,
      longitude: 109.736,
      areaId: batang.id,
      status: "WASPADA",
      latestValue: "1.58 m",
      lastUpdate: hoursAgo(0.02),
    },
  });
  const cctvBtg = await prisma.monitoringPoint.create({
    data: {
      code: "cctv-btg-01",
      name: "CCTV Pantai Roban",
      type: "CCTV",
      latitude: -6.872,
      longitude: 109.744,
      areaId: batang.id,
      status: "NORMAL",
      latestValue: "Online",
      lastUpdate: hoursAgo(0.18),
    },
  });
  const gnssKdl = await prisma.monitoringPoint.create({
    data: {
      code: "gnss-kdl-01",
      name: "GNSS KDL-01",
      type: "GNSS",
      latitude: -6.923,
      longitude: 110.209,
      areaId: kendal.id,
      status: "WASPADA",
      latestValue: "-2.8 cm/tahun",
      baselineElevationM: 2.22,
      currentElevationM: 2.08,
      totalSubsidenceCm: -14,
      velocityCmYear: -2.8,
      lastUpdate: hoursAgo(0.12),
    },
  });
  const awlrKdl = await prisma.monitoringPoint.create({
    data: {
      code: "awlr-kdl-01",
      name: "AWLR KDL-01",
      type: "AWLR",
      latitude: -6.892,
      longitude: 110.191,
      areaId: kendal.id,
      status: "SIAGA",
      latestValue: "1.72 m",
      lastUpdate: hoursAgo(0.04),
    },
  });
  const cctvKdl = await prisma.monitoringPoint.create({
    data: {
      code: "cctv-kdl-01",
      name: "CCTV Kali Bodri",
      type: "CCTV",
      latitude: -6.888,
      longitude: 110.199,
      areaId: kendal.id,
      status: "WASPADA",
      latestValue: "Online",
      lastUpdate: hoursAgo(0.22),
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
      ...buildGnssReadings({
        pointId: gnssBtg.id,
        startElevationM: 2.03,
        endElevationM: 1.89,
        startSubsidenceCm: -1.8,
        endSubsidenceCm: -4.6,
        startVelocityCmYear: -2.1,
        endVelocityCmYear: -4.6,
      }),
      ...buildGnssReadings({
        pointId: gnssKdl.id,
        startElevationM: 2.18,
        endElevationM: 2.08,
        startSubsidenceCm: -1.1,
        endSubsidenceCm: -2.8,
        startVelocityCmYear: -1.2,
        endVelocityCmYear: -2.8,
      }),
    ],
  });

  await prisma.waterLevelReading.createMany({
    data: [
      ...buildWaterLevelReadings({
        pointId: awlrPkl.id,
        baseLevelM: 1.52,
        amplitudeM: 0.19,
        endLevelM: 1.89,
        phase: 0.15,
        eventBiasM: 0.08,
        waspadaM: 1.6,
        siagaM: 1.8,
        awasM: 2.0,
      }),
      ...buildWaterLevelReadings({
        pointId: awlrSmg.id,
        baseLevelM: 1.4,
        amplitudeM: 0.16,
        endLevelM: 1.62,
        phase: 0.55,
        eventBiasM: 0.03,
        waspadaM: 1.55,
        siagaM: 1.75,
        awasM: 1.95,
      }),
      ...buildWaterLevelReadings({
        pointId: awlrBtg.id,
        baseLevelM: 1.34,
        amplitudeM: 0.17,
        endLevelM: 1.58,
        phase: 0.35,
        eventBiasM: 0.04,
        waspadaM: 1.5,
        siagaM: 1.7,
        awasM: 1.9,
      }),
      ...buildWaterLevelReadings({
        pointId: awlrKdl.id,
        baseLevelM: 1.42,
        amplitudeM: 0.18,
        endLevelM: 1.72,
        phase: 0.75,
        eventBiasM: 0.06,
        waspadaM: 1.52,
        siagaM: 1.7,
        awasM: 1.92,
      }),
    ],
  });

  await prisma.weatherReading.createMany({
    data: [
      ...buildWeatherReadings({
        pointId: awlrPkl.id,
        rainfallPeakMm: 16,
        temperatureBaseC: 29.1,
        humidityBasePct: 78,
        windBaseMs: 3.8,
      }),
      ...buildWeatherReadings({
        pointId: awlrSmg.id,
        rainfallPeakMm: 11,
        temperatureBaseC: 30.2,
        humidityBasePct: 74,
        windBaseMs: 4.1,
      }),
      ...buildWeatherReadings({
        pointId: awlrBtg.id,
        rainfallPeakMm: 14,
        temperatureBaseC: 29.5,
        humidityBasePct: 80,
        windBaseMs: 3.4,
      }),
      ...buildWeatherReadings({
        pointId: awlrKdl.id,
        rainfallPeakMm: 19,
        temperatureBaseC: 29.8,
        humidityBasePct: 82,
        windBaseMs: 4.4,
      }),
    ],
  });

  await prisma.device.create({
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
  await prisma.device.create({
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
      {
        code: "dev-gnss-btg",
        name: "Logger GNSS BTG-01",
        type: "LOGGER",
        status: "ONLINE",
        battery: 81,
        signal: 73,
        firmwareVersion: "2.1.5",
        sensorStatus: "GNSS aktif",
        lastDataReceived: hoursAgo(0.08),
        pointId: gnssBtg.id,
      },
      {
        code: "dev-awlr-btg",
        name: "Telemetry AWLR BTG-01",
        type: "AWLR",
        status: "ONLINE",
        battery: 76,
        signal: 69,
        firmwareVersion: "1.9.3",
        sensorStatus: "AWLR aktif",
        lastDataReceived: hoursAgo(0.02),
        pointId: awlrBtg.id,
      },
      {
        code: "dev-cctv-btg",
        name: "CCTV Pantai Roban",
        type: "CCTV",
        status: "ONLINE",
        battery: 79,
        signal: 70,
        firmwareVersion: "1.8.1",
        sensorStatus: "Camera pantai online",
        lastDataReceived: hoursAgo(0.18),
        pointId: cctvBtg.id,
      },
      {
        code: "dev-gnss-kdl",
        name: "Logger GNSS KDL-01",
        type: "LOGGER",
        status: "WEAK",
        battery: 59,
        signal: 48,
        firmwareVersion: "2.1.5",
        sensorStatus: "GNSS aktif, sinyal melemah",
        lastDataReceived: hoursAgo(0.12),
        pointId: gnssKdl.id,
      },
      {
        code: "dev-awlr-kdl",
        name: "Telemetry AWLR KDL-01",
        type: "AWLR",
        status: "ONLINE",
        battery: 83,
        signal: 75,
        firmwareVersion: "1.9.3",
        sensorStatus: "AWLR aktif",
        lastDataReceived: hoursAgo(0.04),
        pointId: awlrKdl.id,
      },
      {
        code: "dev-cctv-kdl",
        name: "CCTV Kali Bodri",
        type: "CCTV",
        status: "WEAK",
        battery: 46,
        signal: 53,
        firmwareVersion: "1.8.1",
        sensorStatus: "Camera online, panel perlu pengecekan",
        lastDataReceived: hoursAgo(0.22),
        pointId: cctvKdl.id,
      },
    ],
  });

  const devices = await prisma.device.findMany();
  const deviceByCode = new Map(devices.map((device) => [device.code, device]));
  const getDeviceId = (code) => {
    const device = deviceByCode.get(code);
    if (!device) {
      throw new Error(`Device ${code} tidak ditemukan setelah seed.`);
    }
    return device.id;
  };

  await prisma.cameraSnapshot.createMany({
    data: [
      {
        pointId: cctvPkl.id,
        capturedAt: hoursAgo(0.1),
        imageUrl: "/dummy_cctv/tanggul-pkl.jpg",
        visibility: "Clear",
        status: "SIAGA",
        note: "Area tanggul terlihat normal dengan genangan rendah.",
      },
      {
        pointId: cctvPkl.id,
        capturedAt: hoursAgo(3),
        imageUrl: "/dummy_cctv/pesisir-pantura.webp",
        visibility: "Low light",
        status: "SIAGA",
        note: "Genangan muncul di sisi akses permukiman saat pasang.",
      },
      {
        pointId: cctvPkl.id,
        capturedAt: hoursAgo(9),
        imageUrl: "/dummy_cctv/tanggul-pkl.jpg",
        visibility: "Rain",
        status: "WASPADA",
        note: "Hujan ringan, permukaan jalan masih dapat dilalui.",
      },
      {
        pointId: cctvSmg.id,
        capturedAt: hoursAgo(0.2),
        imageUrl: "/dummy_cctv/pelabuhan-smg.jpg",
        visibility: "Clear",
        status: "NORMAL",
        note: "Pelabuhan terlihat normal.",
      },
      {
        pointId: cctvSmg.id,
        capturedAt: hoursAgo(4),
        imageUrl: "/dummy_cctv/pelabuhan-smg.jpg",
        visibility: "Clear",
        status: "WASPADA",
        note: "Aktivitas bongkar muat normal, muka air meningkat bertahap.",
      },
      {
        pointId: cctvBtg.id,
        capturedAt: hoursAgo(0.18),
        imageUrl: "/dummy_cctv/pesisir-pantura.webp",
        visibility: "Clear",
        status: "NORMAL",
        note: "Pantai Roban bersih, tidak ada genangan di akses utama.",
      },
      {
        pointId: cctvBtg.id,
        capturedAt: hoursAgo(6),
        imageUrl: "/dummy_cctv/pesisir-pantura.webp",
        visibility: "Rain",
        status: "WASPADA",
        note: "Hujan lokal, drainase masih mengalir.",
      },
      {
        pointId: cctvKdl.id,
        capturedAt: hoursAgo(0.22),
        imageUrl: "/dummy_cctv/tanggul-pkl.jpg",
        visibility: "Clear",
        status: "WASPADA",
        note: "Area muara terpantau ramai dan muka air mendekati ambang awal.",
      },
      {
        pointId: cctvKdl.id,
        capturedAt: hoursAgo(5),
        imageUrl: "/dummy_cctv/pelabuhan-smg.jpg",
        visibility: "Low light",
        status: "SIAGA",
        note: "Pantauan malam menunjukkan genangan tipis di tepi jalan inspeksi.",
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
      {
        code: "alm-1031",
        type: "Water Level Alert",
        areaId: kendal.id,
        pointId: awlrKdl.id,
        status: "SIAGA",
        state: "OPEN",
        occurredAt: hoursAgo(1.15),
        message: "Muka air AWLR Kendal sudah melewati ambang waspada.",
      },
      {
        code: "alm-1030",
        type: "Rob Risk Alert",
        areaId: batang.id,
        pointId: gnssBtg.id,
        status: "SIAGA",
        state: "IN_PROGRESS",
        occurredAt: hoursAgo(1.6),
        message: "Laju penurunan Batang meningkat dan pasang berikutnya masuk jam rawan.",
      },
      {
        code: "alm-1029",
        type: "Signal Weak",
        areaId: kendal.id,
        pointId: gnssKdl.id,
        status: "WASPADA",
        state: "OPEN",
        occurredAt: hoursAgo(2.2),
        message: "Sinyal telemetry GNSS Kendal turun di bawah 50 persen.",
      },
      {
        code: "alm-1028",
        type: "Water Level Alert",
        areaId: semarang.id,
        pointId: awlrSmg.id,
        status: "WASPADA",
        state: "RESOLVED",
        occurredAt: hoursAgo(7.5),
        resolvedAt: hoursAgo(4.8),
        resolutionNote: "Puncak pasang selesai dan muka air turun di bawah ambang.",
        message: "Muka air Tide SMG-01 sempat menyentuh ambang waspada.",
      },
      {
        code: "alm-1027",
        type: "Device Offline",
        areaId: demak.id,
        pointId: gnssDmk.id,
        status: "SIAGA",
        state: "IN_PROGRESS",
        occurredAt: hoursAgo(9),
        message: "Logger GNSS DMK-03 masuk mode maintenance dan belum mengirim data baru.",
      },
      {
        code: "alm-1026",
        type: "Camera Health",
        areaId: kendal.id,
        pointId: cctvKdl.id,
        status: "WASPADA",
        state: "OPEN",
        occurredAt: hoursAgo(11),
        message: "Panel surya CCTV Kali Bodri perlu pengecekan karena baterai turun.",
      },
    ],
  });

  await prisma.event.createMany({
    data: [
      {
        title: "Validasi genangan Pekalongan",
        areaId: pekalongan.id,
        status: "AWAS",
        state: "OPEN",
        occurredAt: hoursAgo(0.45),
        note: "Operator perlu verifikasi lapangan untuk prediksi rob 21.00-23.00.",
      },
      {
        title: "Patroli tanggul Kendal",
        areaId: kendal.id,
        status: "SIAGA",
        state: "IN_PROGRESS",
        occurredAt: hoursAgo(2.4),
        note: "Tim teknis mengecek akses muara dan kondisi panel CCTV.",
      },
      {
        title: "Kenaikan muka air Batang",
        areaId: batang.id,
        status: "WASPADA",
        state: "OPEN",
        occurredAt: hoursAgo(3.1),
        note: "AWLR Roban mendekati ambang siaga saat pasang sore.",
      },
      {
        title: "Pasang Semarang selesai",
        areaId: semarang.id,
        status: "WASPADA",
        state: "RESOLVED",
        occurredAt: hoursAgo(8),
        note: "Muka air turun dan CCTV pelabuhan kembali normal.",
      },
      {
        title: "Kalibrasi GNSS Sayung",
        areaId: demak.id,
        status: "SIAGA",
        state: "IN_PROGRESS",
        occurredAt: hoursAgo(10),
        note: "Maintenance logger dilakukan setelah telemetry tidak stabil.",
      },
    ],
  });

  await prisma.maintenanceLog.createMany({
    data: [
      {
        deviceId: getDeviceId("dev-cctv-slamaran"),
        technician: "Tim Pekalongan",
        scheduledAt: new Date("2026-05-20T02:00:00.000Z"),
        note: "Cek panel surya dan baterai cadangan.",
        state: "OPEN",
      },
      {
        deviceId: getDeviceId("dev-gnss-dmk"),
        technician: "Tim Demak",
        scheduledAt: new Date("2026-05-19T03:00:00.000Z"),
        note: "Kalibrasi antena dan pengecekan koneksi logger.",
        state: "IN_PROGRESS",
      },
      {
        deviceId: getDeviceId("dev-gnss-kdl"),
        technician: "Tim Kendal",
        scheduledAt: new Date("2026-05-20T04:00:00.000Z"),
        note: "Pengecekan modem telemetry dan arah antena GNSS.",
        state: "OPEN",
      },
      {
        deviceId: getDeviceId("dev-awlr-kdl"),
        technician: "Tim Kendal",
        scheduledAt: new Date("2026-05-21T02:30:00.000Z"),
        note: "Kalibrasi sensor pressure dan pembersihan rumah sensor.",
        state: "OPEN",
      },
      {
        deviceId: getDeviceId("dev-awlr-smg"),
        technician: "Tim Semarang",
        scheduledAt: new Date("2026-05-18T08:00:00.000Z"),
        note: "Pengecekan tide gauge setelah event pasang tinggi.",
        state: "RESOLVED",
      },
      {
        deviceId: getDeviceId("dev-cctv-kdl"),
        technician: "Tim Kendal",
        scheduledAt: new Date("2026-05-19T09:00:00.000Z"),
        note: "Cek panel surya dan bersihkan housing kamera.",
        state: "IN_PROGRESS",
      },
      {
        deviceId: getDeviceId("dev-cctv-btg"),
        technician: "Tim Batang",
        scheduledAt: new Date("2026-05-22T02:00:00.000Z"),
        note: "Audit kualitas gambar dan sudut pantau Roban.",
        state: "OPEN",
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
      {
        pointId: gnssBtg.id,
        parameter: "velocity",
        unit: "cm/tahun",
        normal: 1.8,
        waspada: 3.5,
        siaga: 5.5,
        awas: 7,
      },
      {
        pointId: gnssKdl.id,
        parameter: "velocity",
        unit: "cm/tahun",
        normal: 1.5,
        waspada: 3,
        siaga: 5.2,
        awas: 7,
      },
      {
        pointId: awlrBtg.id,
        parameter: "waterLevel",
        unit: "m",
        normal: 1.3,
        waspada: 1.5,
        siaga: 1.7,
        awas: 1.9,
      },
      {
        pointId: awlrKdl.id,
        parameter: "waterLevel",
        unit: "m",
        normal: 1.32,
        waspada: 1.52,
        siaga: 1.7,
        awas: 1.92,
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

  await prisma.report.createMany({
    data: [
      {
        templateId: "daily",
        areaName: "Pantura Jawa Tengah",
        status: "READY",
        downloadUrl: "/api/reports/daily",
        generatedAt: now,
      },
      {
        templateId: "event",
        areaName: "Pekalongan Utara",
        status: "READY",
        downloadUrl: "/api/reports/event?area=pekalongan-utara",
        generatedAt: hoursAgo(1.5),
      },
      {
        templateId: "daily",
        areaName: "Kendal Kaliwungu",
        status: "READY",
        downloadUrl: "/api/reports/daily?area=kendal-kaliwungu",
        generatedAt: hoursAgo(3),
      },
      {
        templateId: "monthly",
        areaName: "Semarang Utara",
        status: "QUEUED",
        downloadUrl: null,
        generatedAt: hoursAgo(6),
      },
      {
        templateId: "executive",
        areaName: "Pantura Jawa Tengah",
        status: "READY",
        downloadUrl: "/api/reports/executive",
        generatedAt: daysAgo(2),
      },
    ],
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

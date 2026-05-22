import type {
  AwlrMonitoringData,
  GnssMonitoringData,
} from "@/lib/types";

export type InsightSeverity = "ok" | "info" | "warning" | "danger";

export type Insight = {
  category: string;
  text: string;
  severity: InsightSeverity;
};

function zScoreAnomalyCount(values: number[]): number {
  if (values.length < 4) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);
  if (stddev === 0) return 0;
  return values.filter((v) => Math.abs((v - mean) / stddev) > 2.5).length;
}

export function generateGnssInsights(data: GnssMonitoringData): Insight[] {
  const { selectedStation, trend, analysis, comparison } = data;
  const insights: Insight[] = [];

  // 1. Penurunan vertikal
  if (trend.length > 0) {
    const latest = trend[trend.length - 1];
    const velocityAbs = Math.abs(latest.velocity);
    const severity: InsightSeverity =
      velocityAbs > 10 ? "danger" : velocityAbs > 6 ? "warning" : "ok";
    const deltaText =
      analysis.deltaFromPrevious && analysis.deltaFromPrevious !== "-"
        ? `, perubahan ${analysis.deltaFromPrevious} dari periode sebelumnya`
        : "";
    insights.push({
      category: "Penurunan Vertikal",
      text: `${selectedStation.name} mencatat laju penurunan ${velocityAbs.toFixed(1)} cm/tahun${deltaText}.`,
      severity,
    });
  }

  // 2. Kualitas sinyal GNSS
  if (trend.length > 0) {
    const avgPdop = trend.reduce((s, t) => s + t.pdop, 0) / trend.length;
    const avgFix = trend.reduce((s, t) => s + t.fixRatio, 0) / trend.length;
    const severity: InsightSeverity =
      avgPdop > 3 ? "warning" : avgPdop > 2 ? "info" : "ok";
    const quality =
      avgPdop < 2 ? "optimal" : avgPdop < 3 ? "cukup baik" : "perlu diperhatikan";
    insights.push({
      category: "Kualitas Sinyal",
      text: `PDOP rata-rata ${avgPdop.toFixed(2)} dan fix ratio ${avgFix.toFixed(1)}% — kualitas pengukuran ${quality}.`,
      severity,
    });
  }

  // 3. Deteksi anomali berbasis z-score
  if (trend.length >= 5) {
    const zValues = trend.map((t) => t.z);
    const anomalyCount = zScoreAnomalyCount(zValues);
    const severity: InsightSeverity =
      anomalyCount > 5 ? "danger" : anomalyCount > 2 ? "warning" : "ok";
    insights.push({
      category: "Anomali Data",
      text:
        anomalyCount > 0
          ? `Terdeteksi ${anomalyCount} pembacaan anomali (z-score > 2.5) dalam rentang ini — perlu verifikasi lapangan.`
          : `Tidak ada pembacaan anomali signifikan — data konsisten dalam rentang ini.`,
      severity,
    });
  }

  // 4. Tren akselerasi/deselerasi penurunan
  if (trend.length >= 6) {
    const half = Math.floor(trend.length / 2);
    const avgFirst =
      trend.slice(0, half).reduce((s, t) => s + t.velocity, 0) / half;
    const avgSecond =
      trend.slice(half).reduce((s, t) => s + t.velocity, 0) /
      (trend.length - half);
    const pct =
      Math.abs(avgFirst) > 0
        ? ((avgSecond - avgFirst) / Math.abs(avgFirst)) * 100
        : 0;

    if (Math.abs(pct) > 10) {
      const direction = pct < 0 ? "mengakselerasi" : "melambat";
      const severity: InsightSeverity = pct < 0 ? "warning" : "ok";
      insights.push({
        category: "Tren Periode",
        text: `Laju penurunan ${direction} sekitar ${Math.abs(pct).toFixed(0)}% pada paruh kedua rentang ini.`,
        severity,
      });
    } else {
      insights.push({
        category: "Tren Periode",
        text: `Laju penurunan relatif stabil sepanjang rentang ini (variasi < 10%).`,
        severity: "ok",
      });
    }
  }

  // 5. Perbandingan antar stasiun
  if (comparison.length > 1) {
    const sorted = [...comparison].sort((a, b) => a.velocity - b.velocity);
    const fastest = sorted[0];
    const isCurrentFastest = fastest.id === selectedStation.id;
    const severity: InsightSeverity = isCurrentFastest ? "warning" : "info";
    insights.push({
      category: "Perbandingan Pos",
      text: isCurrentFastest
        ? `Pos ini mencatat penurunan tercepat di antara ${comparison.length} stasiun aktif.`
        : `${fastest.name} memiliki penurunan tercepat (${Math.abs(fastest.velocity).toFixed(1)} cm/tahun) di antara ${comparison.length} stasiun.`,
      severity,
    });
  }

  return insights;
}

export function generateAwlrInsights(data: AwlrMonitoringData): Insight[] {
  const { selectedStation, trend, analysis, comparison } = data;
  const insights: Insight[] = [];

  // 1. Status muka air terkini
  if (trend.length > 0) {
    const latest = trend[trend.length - 1];
    const statusMap: Record<string, { severity: InsightSeverity; label: string }> = {
      Normal: { severity: "ok", label: "dalam batas normal" },
      Waspada: { severity: "warning", label: "melampaui ambang Waspada" },
      Siaga: { severity: "danger", label: "melampaui ambang Siaga" },
      Awas: { severity: "danger", label: "melampaui ambang Awas" },
    };
    const { severity, label } = statusMap[latest.status] ?? statusMap["Normal"];
    insights.push({
      category: "Muka Air",
      text: `Muka air ${selectedStation.name} saat ini ${latest.waterLevel.toFixed(2)} m — ${label}. Margin menuju Siaga: ${latest.marginSiaga.toFixed(2)} m.`,
      severity,
    });
  }

  // 2. Distribusi pembacaan di atas normal
  if (trend.length > 0) {
    const unsafeCount = trend.filter((t) => t.status !== "Normal").length;
    const pct = (unsafeCount / trend.length) * 100;
    const severity: InsightSeverity =
      pct > 50 ? "danger" : pct > 20 ? "warning" : "ok";
    insights.push({
      category: "Distribusi Status",
      text:
        unsafeCount > 0
          ? `${unsafeCount} dari ${trend.length} pembacaan (${pct.toFixed(0)}%) berada di atas ambang normal dalam rentang ini.`
          : `Seluruh ${trend.length} pembacaan dalam rentang ini berada dalam batas normal.`,
      severity,
    });
  }

  // 3. Tren naik/turun muka air
  if (trend.length >= 4) {
    const third = Math.floor(trend.length / 3);
    const avgRecent =
      trend.slice(-third).reduce((s, t) => s + t.waterLevel, 0) / third;
    const avgOlder =
      trend.slice(0, third).reduce((s, t) => s + t.waterLevel, 0) / third;
    const diff = avgRecent - avgOlder;

    if (Math.abs(diff) > 0.05) {
      const direction = diff > 0 ? "naik" : "turun";
      const severity: InsightSeverity = diff > 0 ? "warning" : "ok";
      insights.push({
        category: "Tren Muka Air",
        text: `Muka air cenderung ${direction} rata-rata ${Math.abs(diff).toFixed(2)} m dibanding awal rentang.`,
        severity,
      });
    } else {
      insights.push({
        category: "Tren Muka Air",
        text: `Muka air relatif stabil sepanjang rentang ini (variasi < 5 cm).`,
        severity: "ok",
      });
    }
  }

  // 4. Perbandingan antar stasiun AWLR
  if (comparison.length > 1) {
    const sorted = [...comparison].sort((a, b) => b.waterLevel - a.waterLevel);
    const highest = sorted[0];
    const isCurrentHighest = highest.id === selectedStation.id;
    const severity: InsightSeverity = isCurrentHighest ? "warning" : "info";
    insights.push({
      category: "Perbandingan Pos",
      text: isCurrentHighest
        ? `Pos ini memiliki muka air tertinggi (${highest.waterLevel.toFixed(2)} m) di antara ${comparison.length} stasiun AWLR.`
        : `${highest.name} memiliki muka air tertinggi saat ini (${highest.waterLevel.toFixed(2)} m) di antara ${comparison.length} stasiun.`,
      severity,
    });
  }

  return insights;
}

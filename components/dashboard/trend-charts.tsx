"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TideDatum, TrendDatum } from "@/lib/types";

type TrendChartsProps = {
  trend: TrendDatum[];
  tide: TideDatum[];
};

export function TrendCharts({ trend, tide }: TrendChartsProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Tren Penurunan Tanah</CardTitle>
            <CardDescription>
              Laju vertikal GNSS dalam cm/tahun
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart
                data={trend}
                margin={{ bottom: 8, left: 0, right: 12, top: 8 }}
              >
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis
                  dataKey="period"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={[-10, 0]}
                />
                <Tooltip
                  contentStyle={{
                    borderColor: "#e2e8f0",
                    borderRadius: 8,
                    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
                  }}
                />
                <Legend />
                <Line
                  dataKey="gnssPkl01"
                  name="PKL-01"
                  stroke="#dc2626"
                  strokeWidth={2}
                  type="monotone"
                />
                <Line
                  dataKey="gnssSmg02"
                  name="SMG-02"
                  stroke="#ea580c"
                  strokeWidth={2}
                  type="monotone"
                />
                <Line
                  dataKey="gnssDmk03"
                  name="DMK-03"
                  stroke="#0f766e"
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Muka Air Laut</CardTitle>
            <CardDescription>
              AWLR real-time terhadap ambang rob
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart
                data={tide}
                margin={{ bottom: 8, left: 0, right: 12, top: 8 }}
              >
                <defs>
                  <linearGradient id="water" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis
                  dataKey="hour"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={[1, 2.1]}
                />
                <Tooltip
                  contentStyle={{
                    borderColor: "#e2e8f0",
                    borderRadius: 8,
                    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
                  }}
                />
                <Legend />
                <Area
                  dataKey="waterLevel"
                  fill="url(#water)"
                  name="Muka air"
                  stroke="#0284c7"
                  strokeWidth={2}
                  type="monotone"
                />
                <Line
                  dataKey="waspada"
                  dot={false}
                  name="Waspada"
                  stroke="#d97706"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  type="monotone"
                />
                <Line
                  dataKey="siaga"
                  dot={false}
                  name="Siaga"
                  stroke="#dc2626"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

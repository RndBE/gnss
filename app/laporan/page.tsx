import { Download } from "lucide-react";

import { AppShell } from "@/components/dashboard/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getDashboardSummary,
  getGeneratedReports,
  getReportTemplates,
} from "@/lib/backend/queries";

export const dynamic = "force-dynamic";

export default async function LaporanPage() {
  const [summary, reportTemplates, generatedReports] = await Promise.all([
    getDashboardSummary(),
    getReportTemplates(),
    getGeneratedReports(),
  ]);

  return (
    <AppShell
      activeArea={summary.activeArea}
      activePath="/laporan"
      title="Laporan"
      updatedAt={summary.updatedAt}
    >
      <div className="grid gap-4">
        <Card className="interactive-card">
          <CardHeader>
            <CardTitle>Template Laporan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {reportTemplates.map((template) => (
              <article className="interactive-card rounded-lg border border-slate-200 p-4" key={template.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">
                      {template.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {template.period} - {template.audience}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {template.formats.map((format) => (
                      <Badge key={format}>{format}</Badge>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </CardContent>
        </Card>

        <Card className="interactive-card">
          <CardHeader>
            <CardTitle>Laporan Tersedia</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead>Template</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>File</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedReports.length > 0 ? (
                  generatedReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium text-slate-950">
                        {report.template}
                      </TableCell>
                      <TableCell>{report.area}</TableCell>
                      <TableCell>{report.status}</TableCell>
                      <TableCell>{report.generatedAt}</TableCell>
                      <TableCell>
                        {report.downloadUrl ? (
                          <a className="inline-flex rounded-sm text-sm font-medium text-slate-950 underline-offset-4 transition-colors hover:text-slate-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={report.downloadUrl}>
                            Unduh
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="text-slate-500" colSpan={5}>
                      Belum ada laporan tersimpan di database.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <a
          className="interactive-tile inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
          href="/api/reports/daily"
        >
          <Download className="interactive-icon size-4" />
          Unduh Laporan Harian CSV
        </a>
      </div>
    </AppShell>
  );
}

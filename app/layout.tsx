import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { Geist } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Dashboard Pemantauan Penurunan Pesisir",
  description:
    "Sistem monitoring GNSS, AWLR, CCTV, telemetry, alarm rob, dan status perangkat pesisir.",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    shortcut: ["/favicon.png"],
    apple: [{ url: "/favicon.png", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={geist.variable}>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}

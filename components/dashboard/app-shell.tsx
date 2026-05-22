import type { CSSProperties, ReactNode } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

type AppShellProps = {
  children: ReactNode
  activeArea?: string
  updatedAt?: string
  activePath?: string
  title?: string
  riskStatus?: string
  contentPadding?: boolean
}

export function AppShell({
  children,
  activePath = "/",
  title = "Dashboard",
  contentPadding = true,
}: AppShellProps) {
  const contentClassName = contentPadding
    ? "flex w-full flex-col gap-3 px-4 py-3 md:gap-4 md:py-4 lg:px-6"
    : "flex flex-col gap-3 py-3 md:gap-4 md:py-4"

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 63)",
          "--header-height": "calc(var(--spacing) * 11)",
        } as CSSProperties
      }
    >
      <AppSidebar activePath={activePath} variant="inset" />
      <SidebarInset>
        <SiteHeader
          title={title}
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className={cn(contentClassName, "motion-fade-in")}>
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

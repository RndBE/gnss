import Image from "next/image"

import logoBeacon from "@/logo_beacon.png"
import { LoginForm } from "@/components/login-form"
import { LoginMonitoringVisual } from "@/components/login-monitoring-visual"
import { Separator } from "@/components/ui/separator"
import { getUserRoles } from "@/lib/backend/queries"

export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const userRoles = await getUserRoles()

  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-2">
      <section className="login-form-side relative flex min-h-svh flex-col gap-4 overflow-hidden p-6 md:p-10">
        <div className="relative flex justify-center gap-2 md:justify-start">
          <div className="flex items-center gap-3 font-medium">
            <Image
              alt="Beacon"
              className="h-8 w-auto object-contain"
              priority
              src={logoBeacon}
            />
            <Separator
              orientation="vertical"
              className="h-5 data-vertical:self-auto"
            />
            <span>Coastal Monitor</span>
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center py-8">
          <div className="login-auth-card w-full max-w-[420px] rounded-lg border bg-background/92 p-6 shadow-sm backdrop-blur">
            <LoginForm />
            
          </div>
        </div>
      </section>

      <LoginMonitoringVisual roles={userRoles} />
    </main>
  )
}

"use client"

import * as React from "react"
import Image from "next/image"
import {
  ActivityIcon,
  BellIcon,
  CameraIcon,
  DatabaseIcon,
  FileChartColumnIcon,
  GaugeIcon,
  MapIcon,
  RadioTowerIcon,
  Settings2Icon,
  WavesIcon,
} from "lucide-react"

import logoBeacon from "@/logo_beacon.png"
import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

function isActive(activePath: string, paths: string[]) {
  return paths.includes(activePath)
}

type SidebarUser = {
  name: string
  email: string
  avatar: string
}

function getData(activePath = "/") {
  return {
    user: {
      name: "Operator Pantura",
      email: "operator@gnss.local",
      avatar: "",
    },
    navMain: [
      {
        title: "Monitoring",
        url: "/",
        icon: <GaugeIcon />,
        isActive: isActive(activePath, [
          "/",
          "/peta-risiko",
          "/analisa-data",
          "/gnss",
          "/awlr",
          "/cctv",
        ]),
        items: [
          {
            title: "Dashboard",
            url: "/",
            isActive: activePath === "/",
          },
          {
            title: "Peta Risiko",
            url: "/peta-risiko",
            isActive: activePath === "/peta-risiko",
          },
          {
            title: "Analisa Data",
            url: "/analisa-data",
            isActive:
              activePath === "/analisa-data" ||
              activePath === "/gnss" ||
              activePath === "/awlr",
          },
          {
            title: "CCTV",
            url: "/cctv",
            isActive: activePath === "/cctv",
          },
        ],
      },
      {
        title: "Sensor",
        url: "/perangkat",
        icon: <RadioTowerIcon />,
        isActive: isActive(activePath, [
          "/perangkat",
          "/data-masuk",
          "/gnss",
          "/awlr",
        ]),
        items: [
          {
            title: "Perangkat Logger",
            url: "/perangkat",
            isActive: activePath === "/perangkat",
          },
          {
            title: "Data Masuk",
            url: "/data-masuk",
            isActive: activePath === "/data-masuk",
          },
        ],
      },
      {
        title: "Operasional",
        url: "/alarm",
        icon: <BellIcon />,
        isActive: isActive(activePath, ["/alarm", "/analisis-risiko"]),
        items: [
          {
            title: "Alarm & Event",
            url: "/alarm",
            isActive: activePath === "/alarm",
          },
          {
            title: "Analisis Risiko",
            url: "/analisis-risiko",
            isActive: activePath === "/analisis-risiko",
          },
        ],
      },
      {
        title: "Administrasi",
        url: "/laporan",
        icon: <Settings2Icon />,
        isActive: isActive(activePath, ["/laporan", "/pengaturan"]),
        items: [
          {
            title: "Laporan",
            url: "/laporan",
            isActive: activePath === "/laporan",
          },
          {
            title: "Pengaturan",
            url: "/pengaturan",
            isActive: activePath === "/pengaturan",
          },
        ],
      },
    ],
    projects: [
      {
        name: "Data Logger",
        url: "/perangkat",
        icon: <DatabaseIcon />,
        isActive: activePath === "/perangkat",
      },
      {
        name: "Muka Air",
        url: "/analisa-data?sensor=awlr",
        icon: <WavesIcon />,
        isActive: activePath === "/awlr",
      },
      {
        name: "Peta Risiko",
        url: "/peta-risiko",
        icon: <MapIcon />,
        isActive: activePath === "/peta-risiko",
      },
      {
        name: "CCTV",
        url: "/cctv",
        icon: <CameraIcon />,
        isActive: activePath === "/cctv",
      },
      {
        name: "Export Laporan",
        url: "/laporan",
        icon: <FileChartColumnIcon />,
        isActive: activePath === "/laporan",
      },
      {
        name: "Analisis Risiko",
        url: "/analisis-risiko",
        icon: <ActivityIcon />,
        isActive: activePath === "/analisis-risiko",
      },
    ],
  }
}

export function AppSidebar({
  activePath = "/",
  ...props
}: React.ComponentProps<typeof Sidebar> & { activePath?: string }) {
  const data = React.useMemo(() => getData(activePath), [activePath])
  const [user, setUser] = React.useState(data.user)

  React.useEffect(() => {
    const storedUser = window.localStorage.getItem("gnss:user")

    if (!storedUser) return

    try {
      const parsed = JSON.parse(storedUser) as Partial<SidebarUser>

      setUser((current) => ({
        ...current,
        name: parsed.name ?? current.name,
        email: parsed.email ?? current.email,
        avatar: parsed.avatar ?? current.avatar,
      }))
    } catch {
      window.localStorage.removeItem("gnss:user")
    }
  }, [])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="py-2 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center justify-center px-4">
          <Image
            alt="Beacon Engineering"
            className="h-auto w-full max-h-7 object-contain"
            priority
            src={logoBeacon}
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects label="Akses Cepat" projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

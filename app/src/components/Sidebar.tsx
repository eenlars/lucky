"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  Wrench,
  BarChart2,
  Boxes,
  Dna,
} from "lucide-react"
import type { ComponentType, SVGProps } from "react"

interface SidebarItem {
  href: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  description?: string
}

const sidebarItems: SidebarItem[] = [
  {
    href: "/",
    label: "Home",
    icon: Home,
    description: "Dashboard overview",
  },
  {
    href: "/edit",
    label: "Editor",
    icon: Wrench,
    description: "Workflow editor",
  },
  {
    href: "/invocations",
    label: "Traces",
    icon: BarChart2,
    description: "View execution traces",
  },
  {
    href: "/structures",
    label: "Structures",
    icon: Boxes,
    description: "Workflow structures",
  },
  {
    href: "/evolution",
    label: "Evolution",
    icon: Dna,
    description: "Evolution tracking",
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar/90 backdrop-blur-sm border-r border-sidebar-border/50 hidden md:block"
      aria-label="Primary sidebar"
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-14 items-center border-b border-sidebar-border/30 px-5">
          <Link
            href="/"
            className="text-base font-semibold text-sidebar-foreground tracking-tight hover:text-sidebar-primary transition-colors"
          >
            Automated Workflows
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2.5 py-3" aria-label="Primary navigation">
          <ul className="space-y-0.5">
            {sidebarItems.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(`${item.href}/`)
              const Icon = item.icon
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-medium",
                      "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background,transparent)]",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-sidebar-border/20"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    )}
                    title={item.description ?? item.label}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-sidebar-primary" aria-hidden="true" />
                    )}
                    
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                    {isActive && (
                      <span className="sr-only">(current)</span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="mt-auto border-t border-sidebar-border/30 px-5 py-3">
          <div className="text-[11px] text-sidebar-foreground/50 font-medium tracking-wide">
            Agentic Workflows
          </div>
        </div>
      </div>
    </aside>
  )
}

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
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useState, useEffect } from "react"
import type { ComponentType, SVGProps } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip"
import { useSidebar } from "@/contexts/SidebarContext"

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
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    description: "Application settings",
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { isCollapsed, setIsCollapsed, isMobile } = useSidebar()

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  const sidebarContent = (
    <div className="flex h-full flex-col relative">
      {/* Header */}
      <div className={cn(
        "flex h-14 items-center border-b border-sidebar-border/30 px-5 transition-all duration-300 ease-out",
        isCollapsed && !isMobile && "px-0 justify-center"
      )}>
        <Link
          href="/"
          className={cn(
            "text-base font-semibold text-sidebar-foreground tracking-tight hover:text-sidebar-primary transition-all duration-300",
            isCollapsed && !isMobile && "opacity-0 w-0 overflow-hidden"
          )}
          onClick={() => setIsMobileOpen(false)}
        >
          Automated Workflows
        </Link>
        {isMobile && (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="ml-auto p-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
            aria-label="Close sidebar"
          >
            <X className="size-5" />
          </button>
        )}
        {isCollapsed && !isMobile && (
          <div className="size-10 flex items-center justify-center">
            <div className="size-2 rounded-full bg-sidebar-primary animate-pulse" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 px-2.5 py-3 transition-all duration-300 ease-out",
        isCollapsed && !isMobile && "px-2"
      )} aria-label="Primary navigation">
        <ul className="space-y-0.5">
          {sidebarItems.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(`${item.href}/`)
            const Icon = item.icon
            
            const linkContent = (
              <Link
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-[13px] font-medium",
                  "transition-all duration-200 ease-out",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background,transparent)]",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                  isCollapsed && !isMobile && "px-2 justify-center"
                )}
                title={item.description ?? item.label}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Active indicator */}
                {isActive && (
                  <div 
                    className={cn(
                      "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-sidebar-primary transition-all duration-300",
                      isCollapsed && !isMobile && "h-3"
                    )} 
                    aria-hidden="true" 
                  />
                )}
                
                <Icon className={cn(
                  "size-4 shrink-0 transition-all duration-200",
                  isActive && "text-sidebar-primary",
                  isCollapsed && !isMobile && "size-5"
                )} aria-hidden="true" />
                <span className={cn(
                  "truncate transition-all duration-300 ease-out",
                  isCollapsed && !isMobile && "w-0 opacity-0 overflow-hidden"
                )}>{item.label}</span>
                {isActive && !isCollapsed && !isMobile && (
                  <span className="sr-only">(current)</span>
                )}
              </Link>
            )
            
            return (
              <li key={item.href}>
                {isCollapsed && !isMobile ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent 
                      side="right" 
                      sideOffset={8}
                      className="bg-background/95 backdrop-blur-sm border-border text-foreground shadow-lg"
                    >
                      <p className="font-medium">{item.label}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  linkContent
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Collapse toggle button - desktop only */}
      {!isMobile && (
        <button
          onClick={toggleCollapse}
          className={cn(
            "absolute -right-3 top-20 z-10",
            "size-6 rounded-full",
            "bg-background border border-border shadow-sm",
            "flex items-center justify-center",
            "text-muted-foreground hover:text-foreground",
            "transition-all duration-200 ease-out hover:scale-110",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="size-3" />
          ) : (
            <ChevronLeft className="size-3" />
          )}
        </button>
      )}

      {/* Footer */}
      <div className={cn(
        "mt-auto border-t border-sidebar-border/30 px-5 py-3 transition-all duration-300",
        isCollapsed && !isMobile && "px-2"
      )}>
        <div className={cn(
          "text-[11px] text-sidebar-foreground/50 font-medium tracking-wide transition-all duration-300",
          isCollapsed && !isMobile && "text-center"
        )}>
          {isCollapsed && !isMobile ? "AAW" : "Agentic Workflows"}
        </div>
        
        {/* Clerk branding */}
        <div className={cn(
          "flex items-center justify-center mt-3 pt-3 border-t border-sidebar-border/20 transition-all duration-300",
          isCollapsed && !isMobile && "px-1"
        )}>
          <a 
            href="https://clerk.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sidebar-foreground/40 hover:text-sidebar-foreground/60 transition-colors text-[10px] font-medium"
            title="Powered by Clerk"
          >
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 200 200" 
              className={cn(
                "transition-all duration-300",
                isCollapsed && !isMobile && "w-4 h-4"
              )}
              aria-hidden="true"
            >
              <path 
                fill="currentColor" 
                d="M114 0H86v86h28c15.464 0 28 12.536 28 28s-12.536 28-28 28H86v58h28c47.128 0 86-38.872 86-86V86c0-47.128-38.872-86-86-86Z"
              />
              <path 
                fill="currentColor" 
                d="M86 200H58c-32.032 0-58-25.968-58-58v-28h28c15.464 0 28-12.536 28-28S43.464 58 28 58H0V30C0 13.432 13.432 0 30 0h28c15.464 0 28 12.536 28 28v172Z"
              />
            </svg>
            {!isCollapsed || isMobile ? (
              <span className="transition-all duration-300">Secured by Clerk</span>
            ) : null}
          </a>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile menu trigger */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className={cn(
          "fixed left-4 top-4 z-50 p-2 rounded-md",
          "bg-background/80 backdrop-blur-sm border border-border",
          "text-foreground hover:bg-accent",
          "transition-all duration-200 hover:scale-105",
          "md:hidden",
          isMobileOpen && "opacity-0 pointer-events-none"
        )}
        aria-label="Open sidebar"
      >
        <Menu className="size-5" />
      </button>

      {/* Mobile sidebar overlay */}
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden animate-in fade-in-0 duration-200"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-sidebar/95 backdrop-blur-sm border-r border-sidebar-border/50",
          "transition-all duration-300 ease-out",
          isMobile ? (
            isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"
          ) : (
            isCollapsed ? "w-16" : "w-64"
          )
        )}
        aria-label="Primary sidebar"
      >
        {sidebarContent}
      </aside>
    </>
  )
}

export function SidebarTrigger() {
  return null
}
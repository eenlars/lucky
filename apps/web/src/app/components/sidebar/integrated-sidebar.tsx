"use client"

import { useSidebar } from "@/contexts/SidebarContext"
import { useFeatureFlag } from "@/lib/feature-flags"
import { cn } from "@/lib/utils"
import { useUser } from "@clerk/nextjs"
import { Code, Dna, Home, Menu, Network, Plug, Settings, Sparkles, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type React from "react"
import { useEffect, useState } from "react"
import { FeedbackButton } from "./feedback-button"
import { UserProfile } from "./user-profile"

// Navigation items with submenu information
interface SubMenuItem {
  type: string
  label: string
  href: string
  enabled?: boolean
}

interface NavItemWithSubmenus {
  type: string
  href: string
  label: string
  icon: React.ReactNode
  description?: string
  enabled?: boolean
  disabled?: boolean
  submenus?: SubMenuItem[]
}

// Legacy interface for compatibility
type NavItemData = NavItemWithSubmenus

// Navigation items with plain language labels
const allNavigationItems: NavItemData[] = [
  {
    type: "home",
    href: "/",
    label: "Home",
    icon: <Home className="w-4 h-4" />,
    description: "Start here",
  },
  {
    type: "editor",
    href: "/edit",
    label: "Create",
    icon: <Sparkles className="w-4 h-4 text-orange-500" />,
    description: "Build workflows",
  },
  {
    type: "workflows",
    href: "/workflows",
    label: "Workflows",
    icon: <Network className="w-4 h-4" />,
    description: "Your workflows",
    submenus: [
      {
        type: "workflows-list",
        label: "Workflows",
        href: "/workflows",
      },
      {
        type: "past-runs",
        label: "Past runs",
        href: "/invocations",
      },
    ],
  },
  {
    type: "connectors",
    href: "/connectors",
    label: "Connectors",
    icon: <Plug className="w-4 h-4" />,
    description: "Manage tools and connectors",
    submenus: [
      {
        type: "connectors-marketplace",
        label: "Connectors",
        href: "/connectors",
      },
      { type: "developer-tools", label: "Developers", href: "/tools" },
    ],
  },
  {
    type: "evolution",
    href: "/evolution",
    label: "Learning",
    icon: <Dna className="w-4 h-4" />,
    description: "Watch improvement",
    enabled: false,
  },
  {
    type: "settings",
    href: "/settings",
    label: "Settings",
    icon: <Settings className="w-4 h-4" />,
    description: "Configure app",
    submenus: [
      { type: "settings-general", label: "General", href: "/settings" },
      { type: "settings-profile", label: "Profile", href: "/profile" },
      { type: "settings-providers", label: "Providers", href: "/settings/providers" },
      { type: "settings-payment", label: "Payment", href: "/payment" },
    ],
  },
  {
    type: "developer",
    href: "/dev",
    label: "Developer",
    icon: <Code className="w-4 h-4" />,
    description: "Store inspector",
    enabled: false,
  },
]

// Filter navigation items based on environment
const navigationItems = allNavigationItems
  .filter(item => {
    // In production, hide items where enabled === false
    if (process.env.NODE_ENV !== "development" && item.enabled === false) {
      return false
    }
    // In production, hide the home icon entirely
    if (process.env.NODE_ENV === "production" && item.type === "home") {
      return false
    }
    return true
  })
  .map(item => ({
    ...item,
    // Also filter submenus in production
    submenus: item.submenus?.filter(submenu => {
      // Hide explicitly disabled submenus
      if (process.env.NODE_ENV !== "development" && submenu.enabled === false) {
        return false
      }
      // Hide Developers and Payment entries in production
      if (process.env.NODE_ENV === "production") {
        if (submenu.type === "developer-tools" || submenu.type === "settings-payment") {
          return false
        }
      }
      return true
    }),
  }))

interface IntegratedNavItemProps {
  item: NavItemData
  isActive: boolean
  isCollapsed: boolean
  onClick: () => void
  openSubmenus: Set<string>
  onToggleSubmenu: (href: string, e: React.MouseEvent) => void
}

function IntegratedNavItem({
  item,
  isActive,
  isCollapsed,
  onClick,
  openSubmenus,
  onToggleSubmenu,
}: IntegratedNavItemProps) {
  const hasSubmenus = item.submenus && item.submenus.length > 0
  const isSubmenuOpen = openSubmenus.has(item.href)

  if (item.disabled) {
    return (
      <div className="group opacity-50 cursor-not-allowed">
        <div className="relative">
          <div
            className={cn(
              "border h-[40px] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ml-[15px] mr-[15px]",
              isActive ? "bg-sidebar-accent border-sidebar-border" : "border-transparent",
              isCollapsed ? "w-[40px]" : "w-[calc(100%-30px)]",
            )}
          />
          <div className="absolute top-0 left-[15px] w-[40px] h-[40px] flex items-center justify-center text-sidebar-foreground/70 pointer-events-none">
            {item.icon}
          </div>
          {!isCollapsed && (
            <div className="absolute top-0 left-[55px] right-[4px] h-[40px] flex items-center pointer-events-none">
              <span className="text-sm font-medium text-[#666]">{item.label}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="group relative">
      {/* Navigation - either Link (no submenus) or button (has submenus) */}
      {hasSubmenus ? (
        <button type="button" className="block w-full cursor-pointer" onClick={e => onToggleSubmenu(item.href, e)}>
          <div className="relative">
            {/* Background div - changes width based on collapsed state */}
            <div
              className={cn(
                "border h-[40px] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ml-[15px] mr-[15px]",
                isActive ? "bg-sidebar-accent border-sidebar-border" : "border-transparent",
                isCollapsed ? "w-[40px]" : "w-[calc(100%-30px)]",
              )}
            />

            {/* Icon - stays at same position */}
            <div
              className={cn(
                "absolute top-0 left-[15px] w-[40px] h-[40px] flex items-center justify-center transition-colors duration-200 pointer-events-none",
                item.type !== "editor" && "text-sidebar-foreground/70 group-hover:text-sidebar-primary",
              )}
            >
              <div
                className={cn(
                  "transition-colors duration-200",
                  item.type !== "editor" && (isActive ? "text-sidebar-primary" : "group-hover:text-sidebar-primary"),
                )}
              >
                {item.icon}
              </div>
            </div>

            {/* Text label with chevron - only shown when expanded */}
            {!isCollapsed && (
              <div className="absolute top-0 left-[55px] right-[15px] h-[40px] flex items-center justify-between pointer-events-none">
                <span
                  className={cn(
                    "text-sm font-medium transition-opacity duration-200 ease-in-out whitespace-nowrap overflow-hidden",
                    isActive ? "text-primary" : "text-[#666] group-hover:text-primary",
                  )}
                >
                  {item.label}
                </span>
                <svg
                  stroke="currentColor"
                  fill="currentColor"
                  strokeWidth="0"
                  viewBox="0 0 24 24"
                  height="16"
                  width="16"
                  xmlns="http://www.w3.org/2000/svg"
                  className={cn(
                    "transition-transform duration-300 ease-out text-[#888] mr-2",
                    isSubmenuOpen && "rotate-180",
                  )}
                >
                  <path fill="none" d="M0 0h24v24H0z" />
                  <path d="M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z" />
                </svg>
              </div>
            )}
          </div>
        </button>
      ) : (
        <Link href={item.href} className="block" onClick={onClick}>
          <div className="relative">
            {/* Background div - changes width based on collapsed state */}
            <div
              className={cn(
                "border h-[40px] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ml-[15px] mr-[15px]",
                isActive ? "bg-sidebar-accent border-sidebar-border" : "border-transparent",
                isCollapsed ? "w-[40px]" : "w-[calc(100%-30px)]",
              )}
            />

            {/* Icon - stays at same position */}
            <div
              className={cn(
                "absolute top-0 left-[15px] w-[40px] h-[40px] flex items-center justify-center transition-colors duration-200 pointer-events-none",
                item.type !== "editor" && "text-sidebar-foreground/70 group-hover:text-sidebar-primary",
              )}
            >
              <div
                className={cn(
                  "transition-colors duration-200",
                  item.type !== "editor" && (isActive ? "text-sidebar-primary" : "group-hover:text-sidebar-primary"),
                )}
              >
                {item.icon}
              </div>
            </div>

            {/* Text label - only shown when expanded */}
            {!isCollapsed && (
              <div className="absolute top-0 left-[55px] right-[15px] h-[40px] flex items-center pointer-events-none">
                <span
                  className={cn(
                    "text-sm font-medium transition-opacity duration-200 ease-in-out whitespace-nowrap overflow-hidden",
                    isActive ? "text-primary" : "text-[#666] group-hover:text-primary",
                  )}
                >
                  {item.label}
                </span>
              </div>
            )}
          </div>
        </Link>
      )}
    </div>
  )
}

export function IntegratedSidebar() {
  const evolutionEnabled = useFeatureFlag("EVOLUTION")
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set())
  const [isHovered, setIsHovered] = useState(false)
  const { isMobile } = useSidebar()
  const { user } = useUser()

  // Get user initials
  const userInitials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user?.emailAddresses[0]?.emailAddress[0]?.toUpperCase() || "AW"

  // Filter navigation items based on feature flags
  const filteredNavigationItems = navigationItems.filter(item => {
    if (item.type === "evolution" && !evolutionEnabled) {
      return false
    }
    return true
  })

  // Auto-expand submenus when on a submenu route
  useEffect(() => {
    filteredNavigationItems.forEach(item => {
      if (item.submenus) {
        const isSubmenuActive = item.submenus.some(
          submenu => pathname === submenu.href || pathname?.startsWith(`${submenu.href}/`),
        )
        if (isSubmenuActive) {
          setOpenSubmenus(prev => {
            if (!prev.has(item.href)) {
              return new Set(prev).add(item.href)
            }
            return prev
          })
        }
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Handle submenu toggle
  const toggleSubmenu = (href: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpenSubmenus(prev => {
      const next = new Set(prev)
      if (next.has(href)) {
        next.delete(href)
      } else {
        next.add(href)
      }
      return next
    })
  }

  // Sidebar is collapsed unless hovered (on desktop)
  const isCollapsed = isMobile ? false : !isHovered

  const handleNavClick = () => {
    setIsMobileOpen(false)
  }

  const sidebarContent = (
    <nav
      className={cn(
        "h-screen flex-shrink-0 flex-col justify-between fixed top-0 pb-4 items-center flex z-50 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] bg-sidebar border-r border-sidebar-border",
        isCollapsed ? "w-[70px]" : "w-[240px]",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo Header */}
      <div
        className={cn(
          "absolute top-0 left-0 h-[70px] flex items-center justify-center bg-sidebar border-b border-sidebar-border transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isCollapsed ? "w-[69px]" : "w-full",
        )}
      >
        <Link
          className="absolute left-[22px] transition-none text-sidebar-foreground hover:text-sidebar-primary"
          href="/"
          onClick={handleNavClick}
        >
          <div className="w-7 h-7 rounded bg-sidebar-primary flex items-center justify-center">
            <span className="text-sidebar-primary-foreground font-bold text-sm">{userInitials}</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex flex-col w-full pt-[70px] flex-1">
        <div className="mt-6 w-full">
          <nav className="w-full">
            <div className="flex flex-col gap-2">
              {filteredNavigationItems.map(item => {
                // Check if any submenu is active
                const isSubmenuActive =
                  item.submenus?.some(
                    submenu => pathname === submenu.href || pathname?.startsWith(`${submenu.href}/`),
                  ) ?? false

                const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`) || isSubmenuActive

                return (
                  <div key={item.href} className="group">
                    <IntegratedNavItem
                      item={item}
                      isActive={isActive}
                      isCollapsed={isCollapsed}
                      onClick={handleNavClick}
                      openSubmenus={openSubmenus}
                      onToggleSubmenu={toggleSubmenu}
                    />

                    {/* Submenu container */}
                    {item.submenus && item.submenus.length > 0 && !isCollapsed && (
                      <div
                        className={cn(
                          "transition-all duration-300 ease-out overflow-hidden",
                          openSubmenus.has(item.href) ? "max-h-[500px]" : "max-h-0",
                        )}
                      >
                        {item.submenus.map((submenu, index) => {
                          const isSubmenuItemActive =
                            pathname === submenu.href || pathname?.startsWith(`${submenu.href}/`)

                          return (
                            <Link
                              key={submenu.href}
                              href={submenu.href}
                              className="block group/child"
                              onClick={handleNavClick}
                            >
                              <div className="relative">
                                <div
                                  className={cn(
                                    "ml-[35px] mr-[15px] h-[32px] flex items-center border-l border-[#DCDAD2] dark:border-[#2C2C2C] pl-3 transition-all duration-200 ease-out",
                                    openSubmenus.has(item.href)
                                      ? "opacity-100 translate-x-0"
                                      : "opacity-0 -translate-x-2",
                                  )}
                                  style={{
                                    transitionDelay: `${index * 20}ms`,
                                  }}
                                >
                                  <span
                                    className={cn(
                                      "text-xs font-medium transition-colors duration-200 whitespace-nowrap overflow-hidden",
                                      isSubmenuItemActive
                                        ? "text-primary"
                                        : "text-[#888] group-hover/child:text-primary",
                                    )}
                                  >
                                    {submenu.label}
                                  </span>
                                </div>
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </nav>
        </div>
      </div>

      {/* Feedback Button */}
      <FeedbackButton />

      {/* User Profile */}
      <UserProfile initials={userInitials} />
    </nav>
  )

  return (
    <>
      {/* Mobile menu trigger */}
      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        className={cn(
          "fixed left-4 top-4 z-50 p-2 rounded-md",
          "bg-background/80 backdrop-blur-sm border border-border",
          "text-foreground hover:bg-accent",
          "transition-all duration-200 hover:scale-105",
          "md:hidden",
          isMobileOpen && "opacity-0 pointer-events-none",
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

      {/* Mobile sidebar */}
      {isMobile && (
        <div
          className={cn(
            "fixed left-0 top-0 z-50 h-screen bg-sidebar/95 backdrop-blur-sm border-r border-sidebar-border/50 transition-transform duration-300 ease-out w-64",
            isMobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-full flex-col">
            {/* Mobile header */}
            <div className="flex h-14 items-center border-b border-sidebar-border/30 px-5">
              <Link
                href="/"
                className="text-base font-semibold text-sidebar-foreground tracking-tight hover:text-sidebar-primary"
                onClick={handleNavClick}
              >
                App Navigation
              </Link>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="ml-auto p-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
                aria-label="Close sidebar"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Mobile navigation */}
            <nav className="flex-1 px-2.5 py-3">
              <ul className="space-y-0.5">
                {filteredNavigationItems.map(item => {
                  const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)

                  return (
                    <li key={item.href}>
                      {item.disabled ? (
                        <div className="flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-sidebar-foreground/50 pointer-events-none">
                          {item.icon}
                          <span>{item.label}</span>
                          <span className="text-xs">(disabled)</span>
                        </div>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={handleNavClick}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-all duration-200",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                          )}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </nav>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      {!isMobile && sidebarContent}
    </>
  )
}

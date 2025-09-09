"use client"

import { cn } from "@/lib/utils"
import { useSidebar } from "@/contexts/SidebarContext"

export default function MainContent({ 
  children,
  hasAuth 
}: {
  children: React.ReactNode
  hasAuth: boolean
}) {
  const { isCollapsed, isMobile } = useSidebar()

  return (
    <main
      className={cn(
        "h-screen overflow-auto transition-all duration-300 ease-out",
        hasAuth && !isMobile && (isCollapsed ? "md:ml-16" : "md:ml-64")
      )}
      id="main-content"
    >
      {children}
    </main>
  )
}
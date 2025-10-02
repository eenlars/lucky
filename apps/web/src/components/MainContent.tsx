"use client"

import { useSidebar } from "@/contexts/SidebarContext"
import { cn } from "@/lib/utils"

export default function MainContent({ children, hasAuth }: { children: React.ReactNode; hasAuth: boolean }) {
  const { isMobile } = useSidebar()

  return (
    <main
      className={cn(
        "h-screen overflow-auto transition-all duration-300 ease-out",
        hasAuth && !isMobile && "md:ml-[70px]",
      )}
      id="main-content"
    >
      {children}
    </main>
  )
}

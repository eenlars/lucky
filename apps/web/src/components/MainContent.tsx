"use client"

import { useSidebar } from "@/contexts/SidebarContext"
import { cn } from "@/lib/utils"
import { useAuth } from "@clerk/nextjs"

export default function MainContent({ children }: { children: React.ReactNode }) {
  const { isMobile } = useSidebar()
  const { isSignedIn } = useAuth()

  return (
    <main
      className={cn(
        "h-screen overflow-auto transition-all duration-300 ease-out",
        isSignedIn && !isMobile && "md:ml-[70px]",
      )}
      id="main-content"
    >
      {children}
    </main>
  )
}

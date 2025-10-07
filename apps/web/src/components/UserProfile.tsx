"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useClerk, useUser } from "@clerk/nextjs"

interface UserProfileProps {
  isCollapsed?: boolean
  isMobile?: boolean
}

export default function UserProfile({ isCollapsed, isMobile }: UserProfileProps) {
  const { user } = useUser()
  const { openUserProfile } = useClerk()

  if (!user) {
    return (
      <div
        className={cn(
          "text-[11px] text-sidebar-foreground/50 font-medium tracking-wide transition-all duration-300",
          isCollapsed && !isMobile && "text-center",
        )}
      >
        {isCollapsed && !isMobile ? "AAW" : "Agentic Workflows"}
      </div>
    )
  }

  const initials =
    user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user.emailAddresses[0]?.emailAddress[0]?.toUpperCase() || "U"

  if (isCollapsed && !isMobile) {
    return (
      <button
        type="button"
        onClick={() => openUserProfile()}
        className="flex justify-center hover:opacity-80 transition-opacity cursor-pointer"
        aria-label="Open user profile"
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => openUserProfile()}
      className="flex items-center gap-3 w-full hover:opacity-80 transition-opacity cursor-pointer"
      aria-label="Open user profile"
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 overflow-hidden text-left">
        <div className="text-[11px] font-medium text-sidebar-foreground truncate">{user.fullName || "User"}</div>
        <div className="text-[10px] text-sidebar-foreground/50 truncate">{user.emailAddresses[0]?.emailAddress}</div>
      </div>
    </button>
  )
}

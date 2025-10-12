"use client"

import { useClerk, useUser } from "@clerk/nextjs"
import React from "react"

interface UserProfileProps {
  initials?: string
}

export function UserProfile({ initials: providedInitials }: UserProfileProps) {
  const { openUserProfile } = useClerk()
  const { user } = useUser()

  // Use provided initials or calculate from user data
  const displayInitials =
    providedInitials ||
    (user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user?.emailAddresses[0]?.emailAddress[0]?.toUpperCase() || "U")

  return (
    <div className="relative h-[32px]">
      <button
        type="button"
        onClick={() => openUserProfile()}
        className="fixed left-[19px] bottom-4 w-[32px] h-[32px]"
        aria-label="Open user profile"
      >
        <div className="relative w-[32px] h-[32px]">
          <div
            className="w-[32px] h-[32px] left-0 overflow-hidden absolute"
            style={{ zIndex: 0, transform: "scale(1)" }}
          >
            <span className="relative flex shrink-0 overflow-hidden w-[32px] h-[32px] rounded-none border border-[#DCDAD2] dark:border-[#2C2C2C] cursor-pointer hover:opacity-80 transition-opacity">
              <span className="flex items-center justify-center bg-accent rounded-none w-[32px] h-[32px]">
                <span className="text-xs">{displayInitials}</span>
              </span>
            </span>
          </div>
        </div>
      </button>
    </div>
  )
}

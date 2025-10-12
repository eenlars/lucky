"use client"

import { useClerk } from "@clerk/nextjs"
import React from "react"

interface UserProfileProps {
  initials?: string
}

export function UserProfile({ initials = "LA" }: UserProfileProps) {
  const { openUserProfile } = useClerk()

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
                <span className="text-xs">{initials}</span>
              </span>
            </span>
          </div>
        </div>
      </button>
    </div>
  )
}

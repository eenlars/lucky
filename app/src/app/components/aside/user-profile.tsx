import React from "react"

interface UserProfileProps {
  initials?: string
  className?: string
}

export function UserProfile({ initials = "LA", className = "" }: UserProfileProps) {
  return (
    <div className="relative h-[32px]">
      <div className="fixed left-[19px] bottom-4 w-[32px] h-[32px]">
        <div className="relative w-[32px] h-[32px]">
          <div
            className="w-[32px] h-[32px] left-0 overflow-hidden absolute"
            style={{ zIndex: 0, transform: "scale(1)" }}
          >
            <span className="relative flex shrink-0 overflow-hidden w-[32px] h-[32px] rounded-none border border-[#DCDAD2] dark:border-[#2C2C2C] cursor-pointer">
              <span className="flex items-center justify-center bg-accent rounded-none w-[32px] h-[32px]">
                <span className="text-xs">{initials}</span>
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

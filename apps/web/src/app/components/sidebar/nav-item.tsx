import Link from "next/link"
import type React from "react"
import { NavIcon } from "./nav-icon"

interface NavItemProps {
  href: string
  icon: React.ReactNode
  isActive?: boolean
  hasSubmenu?: boolean
  children?: React.ReactNode
}

export function NavItem({ href, icon, isActive = false, hasSubmenu = false, children }: NavItemProps) {
  return (
    <div className="group">
      <Link className="group" href={href}>
        <div className="relative">
          <div
            className={`border h-[40px] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ml-[15px] mr-[15px] w-[40px] ${
              isActive ? "bg-[#F2F1EF] dark:bg-secondary border-[#DCDAD2] dark:border-[#2C2C2C]" : "border-transparent"
            }`}
          />
          <div className="absolute top-0 left-[15px] w-[40px] h-[40px] flex items-center justify-center dark:text-[#666666] text-black group-hover:!text-primary pointer-events-none">
            <NavIcon className={isActive ? "dark:!text-white" : ""}>{icon}</NavIcon>
          </div>
        </div>
      </Link>
      {hasSubmenu && (
        <div className="transition-all duration-300 ease-out overflow-hidden max-h-0 group-hover:max-h-[500px]">
          {children}
        </div>
      )}
    </div>
  )
}

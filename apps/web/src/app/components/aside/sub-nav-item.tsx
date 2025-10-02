import type React from "react"

interface SubNavItemProps {
  href: string
  children: React.ReactNode
  delay?: number
  isActive?: boolean
}

export function SubNavItem({ href, children, delay = 0, isActive = false }: SubNavItemProps) {
  return (
    <a className="block group/child" href={href}>
      <div className="relative">
        <div
          className="ml-[35px] mr-[15px] h-[32px] flex items-center border-l border-[#DCDAD2] dark:border-[#2C2C2C] pl-3 transition-all duration-200 ease-out opacity-0 -translate-x-2"
          style={{ transitionDelay: `${delay}ms` }}
        >
          <span
            className={`text-xs font-medium transition-colors duration-200 group-hover/child:text-primary whitespace-nowrap overflow-hidden ${
              isActive ? "text-primary" : "text-[#888]"
            }`}
          >
            {children}
          </span>
        </div>
      </div>
    </a>
  )
}

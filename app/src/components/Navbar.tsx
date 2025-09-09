"use client"

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function Navbar() {
  const pathname = usePathname()

  const navItems = [
    { href: "/", label: "Home", icon: "🏠" },
    { href: "/edit", label: "Editor", icon: "🔧" },
    // Runner removed
    { href: "/invocations", label: "Traces", icon: "📊" },
    { href: "/structures", label: "Structures", icon: "🏗️" },
    { href: "/evolution", label: "Evolution", icon: "🧬" },
  ]

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link
              href="/"
              className="text-xl font-light text-gray-900 tracking-tight"
            >
              Automated Agentic Workflows
            </Link>
          </div>

          <div className="flex items-center space-x-12">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-normal transition-all duration-200 ${
                  pathname === item.href
                    ? "text-black"
                    : "text-gray-400 hover:text-gray-700"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="ml-4">
              <SignedIn>
                <UserButton afterSignOutUrl="/sign-in" />
              </SignedIn>
              <SignedOut>
                <Link href="/sign-in" className="text-sm text-gray-400 hover:text-gray-700">
                  Sign in
                </Link>
              </SignedOut>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

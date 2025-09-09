import Sidebar from "@/components/Sidebar"
import { AppStoreProvider } from "@/react-flow-visualization/store"
import { defaultState } from "@/react-flow-visualization/store/app-store"
import { cn } from "@/lib/utils"
import { ColorMode } from "@xyflow/react"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import NextTopLoader from "nextjs-toploader"
import { Toaster } from "sonner"

import "./globals.css"

export const metadata: Metadata = {
  title: "Automated Agentic Workflows",
  description:
    "Creating workflows that learn the optimal workflow to solve a specific task.",
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: "/favicon.ico",
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get("auth")
  const colorModeCookie = cookieStore.get("colorMode")

  const theme: ColorMode =
    (colorModeCookie?.value === "dark" || colorModeCookie?.value === "light"
      ? colorModeCookie.value
      : null) ??
    (typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light")

  return (
    <AppStoreProvider initialState={{ ...defaultState, colorMode: theme }}>
      <html lang="en" className={theme}>
        <body className="h-screen">
          {/* Skip link for accessibility */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-sidebar-accent focus:px-3 focus:py-2 focus:text-sidebar-accent-foreground"
          >
            Skip to content
          </a>
          <NextTopLoader />
          {authCookie?.value && <Sidebar />}
          <main
            className={cn(
              "h-screen overflow-auto transition-all duration-300 ease-out",
              authCookie?.value ? "ml-0 md:ml-64" : "ml-0"
            )}
            id="main-content"
          >
            {children}
          </main>
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: theme === "dark" ? "#1a1a1a" : "#fff",
                color: theme === "dark" ? "#fff" : "#000",
                border: theme === "dark" ? "1px solid #333" : "1px solid #e5e5e5",
              },
            }}
          />
        </body>
      </html>
    </AppStoreProvider>
  )
}

import { IntegratedAside } from "@/app/components/aside/integrated-aside"
import MainContent from "@/components/MainContent"
import { CredentialStatusBanner } from "@/components/config/CredentialStatusBanner"
import { SidebarProvider } from "@/contexts/SidebarContext"
import { defaultState } from "@/react-flow-visualization/store/app-store"
import { AppStoreProvider } from "@/react-flow-visualization/store/store"
import { ClerkProvider } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import type { ColorMode } from "@xyflow/react"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import NextTopLoader from "nextjs-toploader"
import { Toaster } from "sonner"

import "./globals.css"

export const metadata: Metadata = {
  title: "Automated Agentic Workflows",
  description: "Creating workflows that learn the optimal workflow to solve a specific task.",
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
  const colorModeCookie = cookieStore.get("colorMode")

  // Safely get auth status - handle case where middleware isn't detected in dev
  let userId: string | null = null
  try {
    const authResult = await auth()
    userId = authResult.userId
  } catch (error) {
    // Middleware not detected - this can happen in dev mode
    console.warn("Clerk auth() called without middleware detection:", error)
  }

  // Clerk→IAM sync now handled via webhook; no per-request sync here

  const theme: ColorMode =
    (colorModeCookie?.value === "dark" || colorModeCookie?.value === "light" ? colorModeCookie.value : null) ??
    (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")

  return (
    <ClerkProvider>
      <AppStoreProvider initialState={{ ...defaultState, colorMode: theme }}>
        <html lang="en" className={theme}>
          <body className="h-screen">
            <SidebarProvider>
              {/* Skip link for accessibility */}
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-sidebar-accent focus:px-3 focus:py-2 focus:text-sidebar-accent-foreground"
              >
                Skip to content
              </a>
              <NextTopLoader />
              {userId && <CredentialStatusBanner />}
              {userId && <IntegratedAside />}
              <MainContent hasAuth={!!userId}>{children}</MainContent>
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
            </SidebarProvider>
          </body>
        </html>
      </AppStoreProvider>
    </ClerkProvider>
  )
}

import EnvironmentKeysSettings from "@/components/EnvironmentKeysSettings"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Settings • Environment Keys",
  description: "Manage local API keys and environment variables",
}

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-5xl mx-auto">
          <div className="relative inline-flex mb-4">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl" />
            <h1 className="relative text-4xl font-light tracking-tight text-foreground">Settings</h1>
          </div>
          <p className="text-base text-muted-foreground max-w-2xl">
            Configure your API access and environment variables for seamless workflow integration
          </p>
        </div>
        <EnvironmentKeysSettings />
      </div>
    </div>
  )
}

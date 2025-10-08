import EnvironmentKeysSettings from "@/components/EnvironmentKeysSettings"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Settings • Environment Keys",
  description: "Manage local API keys and environment variables",
}

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground mb-2">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your API keys and environment configuration</p>
      </div>
      <EnvironmentKeysSettings />
    </div>
  )
}

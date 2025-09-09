import type { Metadata } from "next"
import EnvironmentKeysSettings from "@/components/EnvironmentKeysSettings"

export const metadata: Metadata = {
  title: "Settings • Environment Keys",
  description: "Manage local API keys and environment variables",
}

export default function SettingsPage() {
  return (
    <div className="container mx-auto max-w-4xl py-8">
      <EnvironmentKeysSettings />
    </div>
  )
}

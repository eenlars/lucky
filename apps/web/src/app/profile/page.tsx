import PersonalProfileSettings from "@/components/PersonalProfileSettings"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Settings • Profile",
  description: "Configure your personal information for workflow personalization",
}

export default function ProfilePage() {
  return (
    <div className="container mx-auto py-12">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-semibold text-foreground mb-3">Profile</h1>
        <p className="text-base text-muted-foreground">Help workflows provide more relevant results</p>
      </div>
      <PersonalProfileSettings />
    </div>
  )
}

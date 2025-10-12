"use client"

import { Button } from "@/components/ui/button"
import { PROFILE_FIELD_LIMITS } from "@/features/profile/schemas/profile.schema"
import { calculateProfileCompleteness, validateProfileQuality } from "@/features/profile/validators/profile.validator"
import { Label } from "@/features/react-flow-visualization/components/ui/label"
import { Textarea } from "@/features/react-flow-visualization/components/ui/textarea"
import { useProfileStore } from "@/stores/profile.store"
import { useAuth } from "@clerk/nextjs"
import { AlertCircle, Check, Loader2 } from "lucide-react"
import { useEffect } from "react"
import { toast } from "sonner"

export default function PersonalProfileSettings() {
  const { isLoaded, isSignedIn } = useAuth()
  const {
    profile,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    lastSaved,
    loadProfile,
    saveProfile,
    resetProfile,
    updateField,
  } = useProfileStore()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      void loadProfile()
    }
  }, [isLoaded, isSignedIn, loadProfile])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Keyboard shortcut: Cmd/Ctrl + S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        if (hasUnsavedChanges && !isSaving) {
          void handleSave()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsavedChanges, isSaving])

  const handleSave = async () => {
    // Run custom validation after Zod
    const validation = validateProfileQuality(profile)

    // Show errors if validation fails
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error))
      return
    }

    // Show warnings (but still allow save)
    validation.warnings.forEach(warning => toast.warning(warning))

    // Proceed with save
    await saveProfile()
  }

  const completeness = calculateProfileCompleteness(profile)

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <form
      className="mx-auto max-w-2xl space-y-8"
      onSubmit={e => {
        e.preventDefault()
        void handleSave()
      }}
    >
      {/* Profile Completeness Indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-muted-foreground">Profile completeness</span>
          <span className="font-semibold text-foreground">{completeness}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${completeness}%` }} />
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="about" className="text-base font-medium">
              About you
            </Label>
            <span className="text-xs text-muted-foreground">
              {profile.about?.length || 0} / {PROFILE_FIELD_LIMITS.about}
            </span>
          </div>
          <Textarea
            id="about"
            placeholder="e.g., Software engineer with 5 years in AI/ML, currently leading a team at Acme Corp"
            value={profile.about || ""}
            onChange={e => updateField("about", e.target.value)}
            rows={5}
            className="resize-none text-base"
            maxLength={PROFILE_FIELD_LIMITS.about}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="goals" className="text-base font-medium">
              Your goals
            </Label>
            <span className="text-xs text-muted-foreground">
              {profile.goals?.length || 0} / {PROFILE_FIELD_LIMITS.goals}
            </span>
          </div>
          <Textarea
            id="goals"
            placeholder="e.g., Building scalable LLM applications, learning Rust, improving system design skills"
            value={profile.goals || ""}
            onChange={e => updateField("goals", e.target.value)}
            rows={5}
            className="resize-none text-base"
            maxLength={PROFILE_FIELD_LIMITS.goals}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <div className="text-sm text-muted-foreground">
          {lastSaved && !hasUnsavedChanges && (
            <div className="flex items-center gap-2">
              <Check className="size-4 text-green-600" />
              <span>Saved {lastSaved.toLocaleTimeString()}</span>
            </div>
          )}
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="size-4" />
              <span>Unsaved changes</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={resetProfile} disabled={isSaving || !hasUnsavedChanges}>
            Discard
          </Button>
          <Button type="submit" disabled={isSaving || !hasUnsavedChanges} size="lg">
            {isSaving ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Save
                <span className="ml-2 text-xs opacity-60">⌘S</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}

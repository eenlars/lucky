import { type PersonalProfile, personalProfileSchema } from "@/features/profile/schemas/profile.schema"
import { logException } from "@/lib/error-logger"
import { toast } from "sonner"
import { create } from "zustand"

interface ProfileState {
  profile: PersonalProfile
  originalProfile: PersonalProfile
  isLoading: boolean
  isSaving: boolean
  lastSaved: Date | null
  hasUnsavedChanges: boolean

  // Actions
  setProfile: (profile: PersonalProfile) => void
  updateField: <K extends keyof PersonalProfile>(field: K, value: PersonalProfile[K]) => void
  loadProfile: () => Promise<void>
  saveProfile: () => Promise<void>
  resetProfile: () => void
  reset: () => void
}

const initialState = {
  profile: {},
  originalProfile: {},
  isLoading: false,
  isSaving: false,
  lastSaved: null,
  hasUnsavedChanges: false,
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  ...initialState,

  setProfile: profile => {
    set({ profile })
  },

  updateField: (field, value) => {
    const { profile } = get()
    const newProfile = { ...profile, [field]: value }
    set({ profile: newProfile })

    // Check if there are unsaved changes
    const hasChanges = JSON.stringify(newProfile) !== JSON.stringify(get().originalProfile)
    set({ hasUnsavedChanges: hasChanges })
  },

  loadProfile: async () => {
    try {
      set({ isLoading: true })
      const response = await fetch("/api/user/profile")

      if (response.ok) {
        const data = await response.json()
        const loadedProfile = data.profile || {}

        // Validate with Zod
        const validatedProfile = personalProfileSchema.parse(loadedProfile)

        set({
          profile: validatedProfile,
          originalProfile: validatedProfile,
          hasUnsavedChanges: false,
        })
      } else {
        toast.error("Failed to load profile")
      }
    } catch (error) {
      logException(error, {
        location: "/store/profile",
      })
      console.error("Failed to load profile:", error)
      toast.error("Failed to load profile")
    } finally {
      set({ isLoading: false })
    }
  },

  saveProfile: async () => {
    try {
      set({ isSaving: true })
      const { profile } = get()

      // Validate with Zod before sending
      const validatedProfile = personalProfileSchema.parse(profile)

      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: validatedProfile }),
      })

      if (response.ok) {
        const data = await response.json()
        const savedProfile = personalProfileSchema.parse(data.profile || validatedProfile)

        set({
          profile: savedProfile,
          originalProfile: savedProfile,
          lastSaved: new Date(),
          hasUnsavedChanges: false,
        })

        toast.success("Profile saved successfully")
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to save profile")
      }
    } catch (error) {
      logException(error, {
        location: "/store/profile",
      })
      console.error("Failed to save profile:", error)
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error("Network error. Please check your connection and try again.")
      }
    } finally {
      set({ isSaving: false })
    }
  },

  resetProfile: () => {
    const { originalProfile } = get()
    set({
      profile: { ...originalProfile },
      hasUnsavedChanges: false,
    })
  },

  reset: () => {
    set(initialState)
  },
}))

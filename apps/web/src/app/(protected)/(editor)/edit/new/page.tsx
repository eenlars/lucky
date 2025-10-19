import { AppStoreProvider } from "@/features/react-flow-visualization/store/store"
import EditModeSelector from "../components/EditModeSelector"

export default async function NewWorkflow() {
  return (
    <AppStoreProvider>
      <EditModeSelector initialMode="create-new" />
    </AppStoreProvider>
  )
}

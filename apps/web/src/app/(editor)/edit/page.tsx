import { AppStoreProvider } from "@/react-flow-visualization/store"
import EditModeSelector from "./components/EditModeSelector"

export default async function WorkflowBuilder() {
  return (
    <AppStoreProvider>
      <EditModeSelector />
    </AppStoreProvider>
  )
}

import { Play } from "lucide-react"

import { Button } from "@/react-flow-visualization/components/ui/button"
import { useWorkflowRunnerContext } from "@/react-flow-visualization/hooks/workflow-runner-context"

export function AppPopover() {
  const { isRunning, setPromptDialogOpen } = useWorkflowRunnerContext()

  const onClickRun = () => {
    if (isRunning) return
    setPromptDialogOpen(true)
  }

  return (
    <Button
      onClick={onClickRun}
      className="cursor-pointer"
      disabled={isRunning}
    >
      <Play /> Run with Prompt
    </Button>
  )
}

export default AppPopover

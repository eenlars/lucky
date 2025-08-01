import { Pause, Play } from "lucide-react"

import { Button } from "@/react-flow-visualization/components/ui/button"
import { useWorkflowRunner } from "@/react-flow-visualization/hooks/use-workflow-runner"

export function AppPopover() {
  const { logMessages, runWorkflow, stopWorkflow, isRunning } =
    useWorkflowRunner()

  const onClickRun = () => {
    console.log("AppPopover onClickRun called, isRunning:", isRunning)
    if (isRunning) {
      stopWorkflow()
      return
    }

    console.log("About to call runWorkflow()")
    runWorkflow()
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={onClickRun} className="cursor-pointer">
        {isRunning ? (
          <>
            <Pause /> Stop Workflow
          </>
        ) : (
          <>
            <Play /> Run Workflow
          </>
        )}
      </Button>

      {logMessages.length > 0 && (
        <div className="text-xs font-mono space-y-1 p-2 bg-gray-50 rounded border max-h-32 overflow-y-auto">
          {logMessages.map((message, index) => (
            <p key={index} className="break-words">
              {message}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

export default AppPopover

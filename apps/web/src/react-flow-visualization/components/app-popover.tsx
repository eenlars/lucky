import { Play } from "lucide-react"

import { Button } from "@/react-flow-visualization/components/ui/button"
// runner context removed

export function AppPopover() {
  const isRunning = false
  const setPromptDialogOpen = (_: boolean) => {}

  const onClickRun = () => {
    if (isRunning) return
    setPromptDialogOpen(true)
  }

  return (
    <Button onClick={onClickRun} className="cursor-pointer" disabled={isRunning}>
      <Play /> Run
    </Button>
  )
}

export default AppPopover

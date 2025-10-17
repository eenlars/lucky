# Side Panel Template

Generic template for right-side slide-in panels with elastic easing animation.

## Components

- **SidePanelTemplate** - Main container with slide-in animation, backdrop, and focus trap
- **SidePanelHeader** - Header with title, optional icon, status indicator, and action buttons
- **CollapsibleSection** - Collapsible content section with title, badge, and icon support

## Related Hooks

- **useDebouncedUpdate** - (see `@/app/hooks/use-debounced-update`) Shared utility for debounced node updates with automatic cleanup

## Usage

```tsx
import { useState } from "react"
import { SidePanelTemplate, SidePanelHeader, CollapsibleSection } from "@/app/components/templates/side-panel-template"
import { useDebouncedUpdate } from "@/app/hooks/use-debounced-update"

export function MyPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <SidePanelTemplate
      isOpen={isOpen}
      isExpanded={isExpanded}
      onClose={() => setIsOpen(false)}
      onToggleExpanded={() => setIsExpanded(!isExpanded)}
      header={
        <SidePanelHeader
          title="Panel Title"
          icon={<MyIcon />}
          statusIndicator={<StatusDot />}
          isExpanded={isExpanded}
          onClose={() => setIsOpen(false)}
          onToggleExpanded={() => setIsExpanded(!isExpanded)}
        />
      }
      footer={<MyFooter />}
    >
      <CollapsibleSection title="Section 1" defaultOpen={true}>
        <YourContent />
      </CollapsibleSection>

      <CollapsibleSection title="Section 2" badge={5}>
        <MoreContent />
      </CollapsibleSection>
    </SidePanelTemplate>
  )
}
```

## Features

- Elastic easing animation on open/close
- Click backdrop to close
- ESC key to close
- Automatic focus management with focus trap
- Optional expand/collapse toggle (420px / 680px widths)
- Dark mode support

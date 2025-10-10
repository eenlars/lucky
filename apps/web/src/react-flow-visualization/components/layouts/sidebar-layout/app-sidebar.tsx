"use client"

import { Command } from "lucide-react"
import type { ComponentProps } from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/react-flow-visualization/components/ui/sidebar"
import { useAppStore } from "@/react-flow-visualization/store/store"
import { useShallow } from "zustand/react/shallow"

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  const { toggleSidebar } = useSidebar()
  const { chatMessages } = useAppStore(
    useShallow(state => ({
      chatMessages: state.chatMessages,
    })),
  )

  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader className="py-0">
        <div className="flex gap-2 px-1 h-14 items-center border-b border-sidebar-border">
          <div className="flex aspect-square size-5 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Command className="size-3" onClick={() => toggleSidebar()} />
          </div>
          <span className="flex-1 truncate font-semibold group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0">
            Workflow Chat
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-0">
        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 group-data-[collapsible=icon]:hidden">
          {chatMessages.length === 0 ? (
            <div className="text-sm text-sidebar-foreground/50 text-center mt-8">
              Run a workflow to see results here
            </div>
          ) : (
            chatMessages.map(message => (
              <div
                key={message.id}
                className={`p-3 text-sm border ${
                  message.type === "error"
                    ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
                    : message.type === "result"
                      ? "bg-green-500/10 border-green-500/20 text-sidebar-foreground"
                      : "bg-sidebar-accent border-sidebar-border text-sidebar-foreground/80"
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{message.text}</div>
              </div>
            ))
          )}
        </div>
        {/* Chat Input Area */}
        <div className="border-t border-sidebar-border p-3 group-data-[collapsible=icon]:hidden">
          <textarea
            placeholder="Type a message..."
            className="w-full min-h-[100px] px-3 py-2 bg-sidebar-accent border border-sidebar-border text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-sidebar-primary"
            readOnly
          />
        </div>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

import { AppSidebar } from "@/features/react-flow-visualization/components/layouts/sidebar-layout/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/features/react-flow-visualization/components/ui/breadcrumb"
import { Separator } from "@/features/react-flow-visualization/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/features/react-flow-visualization/components/ui/sidebar"

export default function SidebarLayout({
  children,
  title,
  right,
  showToggle = true,
}: {
  children: React.ReactNode
  title?: string
  right?: React.ReactNode
  showToggle?: boolean
}) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <header className="fixed top-0 left-0 right-0 z-20 flex h-14 shrink-0 items-center gap-2 justify-between bg-background border-b border-sidebar-border md:pl-[70px]">
        <div className="flex flex-1 items-center gap-2 px-3">
          {showToggle ? <SidebarTrigger /> : null}
          {showToggle ? <Separator orientation="vertical" className="mr-2 h-4" /> : null}
          {title && (
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="line-clamp-1">{title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )}
        </div>
        {right ? <div className="px-3">{right}</div> : null}
      </header>
      <SidebarInset className="pt-14">
        <main className="flex flex-1 flex-col overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}

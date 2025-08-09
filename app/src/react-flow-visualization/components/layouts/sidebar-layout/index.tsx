import { AppNavbar } from "@/react-flow-visualization/components/layouts/sidebar-layout/app-navbar"
import { AppSidebar } from "@/react-flow-visualization/components/layouts/sidebar-layout/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/react-flow-visualization/components/ui/breadcrumb"
import { Separator } from "@/react-flow-visualization/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/react-flow-visualization/components/ui/sidebar"

export default function SidebarLayout({
  children,
  title,
}: {
  children: React.ReactNode
  title?: string
}) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            {title && (
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage className="line-clamp-1">
                      {title}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            )}
          </div>
          <div className="ml-auto px-3">
            <AppNavbar />
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}

// src/components/owner/OwnerLayout.tsx
// Matches Lesson 23 section 23.8.5. The shell every owner page renders
// inside: SidebarProvider + OwnerSidebar + SidebarInset. The sticky
// header hosts the SidebarTrigger and the route-aware HeaderBreadcrumbs.
import { Outlet } from "react-router-dom";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { OwnerSidebar } from "./OwnerSidebar";
import { HeaderBreadcrumbs } from "./HeaderBreadcrumbs";

function OwnerLayout() {
  return (
    <SidebarProvider>
      <OwnerSidebar />
      <SidebarInset>
        <header className="bg-background sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <HeaderBreadcrumbs homeUrl="/owner/dashboard" />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default OwnerLayout;

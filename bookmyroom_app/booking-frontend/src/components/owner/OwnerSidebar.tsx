// src/components/owner/OwnerSidebar.tsx
// Matches Lesson 23 section 23.8.2. Adapted from the sidebar-07 block's
// app-sidebar.tsx -- header brand row + nav content + user footer + rail.
import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { OwnerNavMain } from "./OwnerNavMain";
import { OwnerNavUser } from "./OwnerNavUser";

export function OwnerSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link to="/owner/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Building2 className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">BookMyRoom</span>
                  <span className="truncate text-xs">Owner Portal</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <OwnerNavMain />
      </SidebarContent>

      <SidebarFooter>
        <OwnerNavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

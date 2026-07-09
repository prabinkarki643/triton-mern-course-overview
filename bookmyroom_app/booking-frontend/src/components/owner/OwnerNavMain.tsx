// src/components/owner/OwnerNavMain.tsx
// Matches Lesson 23 section 23.8.3. Dashboard (flat), Rooms (collapsible),
// Bookings (flat). Active state comes from useLocation so hard refreshes
// on any owner URL show the correct highlight + auto-open group.
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  CalendarCheck,
  ChevronRight,
  Home,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  exact?: boolean;
  items?: { title: string; url: string }[];
};

const navMain: NavItem[] = [
  {
    title: "Dashboard",
    url: "/owner/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    title: "Rooms",
    url: "/owner/rooms",
    icon: Home,
    items: [
      { title: "Rooms List", url: "/owner/rooms" },
      { title: "Create Room", url: "/owner/rooms/new" },
    ],
  },
  {
    title: "Bookings",
    url: "/owner/bookings",
    icon: CalendarCheck,
  },
];

export function OwnerNavMain() {
  const { pathname } = useLocation();

  const isItemActive = (item: NavItem): boolean =>
    item.exact ? pathname === item.url : pathname.startsWith(item.url);

  const isChildActive = (item: NavItem): boolean =>
    item.items?.some(
      (sub) => pathname === sub.url || pathname.startsWith(sub.url + "/")
    ) ?? false;

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navMain.map((item) => [item.title, isChildActive(item)]))
  );

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      navMain.forEach((item) => {
        if (isChildActive(item)) next[item.title] = true;
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <SidebarGroup>
      <SidebarMenu>
        {navMain.map((item) =>
          (item.items || []).length > 0 ? (
            <Collapsible
              key={item.title}
              asChild
              open={openGroups[item.title] ?? false}
              onOpenChange={(open) =>
                setOpenGroups((prev) => ({ ...prev, [item.title]: open }))
              }
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isChildActive(item)}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === subItem.url}
                        >
                          <Link to={subItem.url}>
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={isItemActive(item)}
              >
                <Link to={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}

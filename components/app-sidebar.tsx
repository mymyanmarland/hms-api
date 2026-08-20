"use client";

import * as React from "react";

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  ShieldUserIcon,
  ShieldCheckIcon,
  UserIcon,
  CommandIcon,
} from "lucide-react"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "User Management",
      url: "/dashboard/users",
      icon: <UserIcon />,
    },
    {
      title: "Admin Management",
      url: "/dashboard/admins",
      icon: <ShieldUserIcon />,
    },
    {
      title: "Roles & Permissions",
      url: "/dashboard/roles",
      icon: <ShieldCheckIcon />,
    },
  ],
}

// Default user data while loading
const defaultUser = {
  name: "Loading...",
  email: "",
  avatar: "",
};

export function AppSidebar({ userData, ...props }: React.ComponentProps<typeof Sidebar> & { userData?: { name: string; email: string; avatar: string } }) {
  const user = userData || defaultUser;

  // Generate initials from name
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="#">
                <CommandIcon className="size-5!" />
                <span className="text-base font-semibold">HMS Admin</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} initials={initials} />
      </SidebarFooter>
    </Sidebar>
  )
}

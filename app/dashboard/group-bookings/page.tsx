import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getSidebarUserData, requireAdmin } from "@/lib/admin-auth";
import { GroupBookingsList } from "./_components/group-bookings-list";

export default async function GroupBookingsPage() {
  const actor = await requireAdmin();
  const userData = await getSidebarUserData();
  if (!actor || !userData) {
    redirect("/login");
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" userData={userData} />
      <SidebarInset>
        <SiteHeader pageTitle="Group Bookings" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <GroupBookingsList />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

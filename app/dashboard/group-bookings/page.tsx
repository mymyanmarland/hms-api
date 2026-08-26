import { GroupBookingsList } from "./_components/group-bookings-list";
import { BackButton } from "@/components/back-button";

export default function GroupBookingsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3">
        <BackButton href="/dashboard" label="Back to Dashboard" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Group Bookings</h1>
          <p className="text-sm text-muted-foreground">
            Manage block reservations for corporate events, weddings, and tour groups
          </p>
        </div>
      </div>

      <GroupBookingsList />
    </div>
  );
}

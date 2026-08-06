import { Skeleton } from "@/components/ui/skeleton";

export default function AdminsLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-9 w-36" />
      </div>
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
import { cn } from "@/lib/utils";

export function CustomSkeleton() {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      <div className="h-4 w-full bg-[#3333CC]/10 rounded" />
      <div className="h-4 w-full bg-[#3333CC]/10 rounded" />
    </div>
  );
}

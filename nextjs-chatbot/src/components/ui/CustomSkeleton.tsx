import { cn } from "@/lib/utils"

export function CustomSkeleton() {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      <div className="h-4 w-3/4 bg-[#3333CC]/10 rounded" />
      <div className="h-4 w-1/2 bg-[#3333CC]/10 rounded" />
      <div className="h-4 w-5/6 bg-[#3333CC]/10 rounded" />
    </div>
  )
}


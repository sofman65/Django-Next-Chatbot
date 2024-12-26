import { cn } from "@/lib/utils"

export function CustomSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className={cn(
          "h-4 w-24 animate-pulse rounded-md",
          "bg-[#3333CC]/20"
        )} />
        <div className={cn(
          "h-4 w-32 animate-pulse rounded-md",
          "bg-[#3333CC]/20"
        )} />
      </div>
      <div className="flex gap-2">
        <div className={cn(
          "h-4 w-48 animate-pulse rounded-md",
          "bg-[#3333CC]/20"
        )} />
        <div className={cn(
          "h-4 w-20 animate-pulse rounded-md",
          "bg-[#3333CC]/20"
        )} />
      </div>
    </div>
  )
}


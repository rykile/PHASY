import React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function ThreadSkeleton() {
  return (
    <div className="p-4 border-b border-border">
      <Skeleton className="h-4 w-2/3 mb-2" />
      <Skeleton className="h-3 w-1/3 mb-3" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

export function CommentSkeleton() {
  return (
    <div className="p-4 border-b border-border flex gap-3">
      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
      <div className="flex-1">
        <Skeleton className="h-3 w-1/4 mb-2" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

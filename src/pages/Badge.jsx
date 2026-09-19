import React from "react";
import { BADGE_STYLES, STATUS_META, getOfficialBadgeConfig } from "@/lib/community";
import { cn } from "@/lib/utils";

export default function Badge({ badge, color, className }) {
  if (!badge) return null;
  const official = getOfficialBadgeConfig();
  const c = color || (badge === official.label ? official.color : null);
  if (c) {
    return (
      <span style={{ color: c, borderColor: c, backgroundColor: c + "1a" }} className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border", className)}>
        {badge}
      </span>
    );
  }
  const style = BADGE_STYLES[badge] || { bg: "bg-blue-50 text-blue-700 border-blue-200" };
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border", style.bg, className)}>
      {badge}
    </span>
  );
}

export function StatusBadge({ status, className }) {
  const meta = STATUS_META[status];
  if (!meta || !meta.label) return null;
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border", meta.cls, className)}>
      {meta.label}
    </span>
  );
}

import React from "react";
import { Link } from "react-router-dom";
import Badge, { StatusBadge } from "@/components/Badge";
import { formatJST, relativeTime } from "@/lib/community";
import { MessageSquare, Eye, Heart, Pin } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ThreadCard({ thread, showCategory = true }) {
  if (!thread) return null;
  const to = `/thread/${thread.id}`;
  return (
    <Link to={to} className={cn("block p-4 border-b border-border hover:bg-muted/40 transition", thread.status === "pinned" && "bg-amber-50/40 dark:bg-amber-950/10")}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {thread.status === "pinned" && <Pin className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
            <span className="text-[11px] font-mono text-muted-foreground">スレッド #{thread.thread_number}</span>
            <StatusBadge status={thread.status} />
            {showCategory && thread.category_name && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{thread.category_name}</span>
            )}
          </div>
          <h3 className="font-medium text-[15px] leading-snug mb-1.5 line-clamp-2">{thread.title}</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              {thread.author_icon ? <img src={thread.author_icon} alt="" className="w-4 h-4 rounded-full" /> : <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[9px]">{(thread.author_name || "?").charAt(0)}</span>}
              <span className="truncate max-w-24">{thread.author_name}</span>
              {thread.author_badge && <Badge badge={thread.author_badge} />}
            </span>
            <span>{relativeTime(thread.updated_date || thread.created_date)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground shrink-0">
          <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {thread.comment_count || 0}</span>
          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {thread.view_count || 0}</span>
          <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {thread.like_count || 0}</span>
        </div>
      </div>
    </Link>
  );
}

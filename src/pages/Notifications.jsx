import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMember } from "@/lib/MemberContext";
import { formatJST } from "@/lib/community";
import { Bell, CheckCheck, Reply, Heart, UserPlus, Megaphone, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = { reply: Reply, like: Heart, follow: UserPlus, announcement: Megaphone, maintenance: Wrench, follow_post: UserPlus, thread_update: Reply, report_result: CheckCheck, appeal_result: CheckCheck, operator_reply: Reply, terms_change: Megaphone };

export default function Notifications() {
  const { member } = useMember();
  const [items, setItems] = useState(null);

  const load = () => {
    if (!member) return;
    base44.entities.Notification.filter({ user_id: member.id }, "-created_date", 100).then(setItems).catch(() => setItems([]));
  };
  useEffect(load, [member?.id]);

  const markAll = async () => {
    if (!member) return;
    await base44.entities.Notification.updateMany({ user_id: member.id, is_read: false }, { $set: { is_read: true } });
    load();
  };

  if (!member) return null;
  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-3">
        <h1 className="font-bold flex items-center gap-2"><Bell className="w-5 h-5" /> 通知</h1>
        {items && items.some((n) => !n.is_read) && <button onClick={markAll} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><CheckCheck className="w-4 h-4" /> すべて既読</button>}
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {items === null ? <div className="p-8 text-center text-sm text-muted-foreground">読み込み中...</div> :
          items.length === 0 ? <div className="p-12 text-center text-sm text-muted-foreground">通知はありません</div> :
          items.map((n) => {
            const Icon = ICONS[n.type] || Bell;
            const content = (
              <div className={cn("flex items-start gap-3 p-3 border-b border-border last:border-0 hover:bg-muted/40", !n.is_read && "bg-orange-50/30")}>
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-orange-500" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{n.title}</div>
                  {n.body && <div className="text-xs text-muted-foreground line-clamp-1">{n.body}</div>}
                  <div className="text-[11px] text-muted-foreground mt-0.5">{formatJST(n.created_date)}</div>
                </div>
                {!n.is_read && <span className="w-2 h-2 rounded-full bg-orange-500 mt-2 shrink-0" />}
              </div>
            );
            return n.link ? <Link key={n.id} to={n.link} onClick={() => base44.entities.Notification.update(n.id, { is_read: true })}>{content}</Link> : <div key={n.id}>{content}</div>;
          })}
      </div>
    </div>
  );
}

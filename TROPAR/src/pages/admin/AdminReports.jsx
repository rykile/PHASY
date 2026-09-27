import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMember } from "@/lib/MemberContext";
import { auditLog } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, EyeOff } from "lucide-react";

const REASON_LABELS = { spam: "スパム", troll: "荒らし", inappropriate: "不適切", impersonation: "なりすまし", ad: "宣伝", other: "その他" };

export default function AdminReports() {
  const { member } = useMember();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await base44.entities.Report.filter({ status: "received" }, "-created_date", 100);
      setReports(list);
    } catch (e) {
      setError(e.message || "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const hideTarget = async (r) => {
    setBusy(r.id);
    try {
      if (r.target_type === "thread") await base44.entities.Thread.update(r.target_id, { status: "hidden", is_hidden_auto: true });
      else if (r.target_type === "comment") await base44.entities.Comment.update(r.target_id, { is_deleted: true, is_hidden_auto: true });
      else if (r.target_type === "news_comment") await base44.entities.NewsComment.update(r.target_id, { is_deleted: true });
      await base44.entities.Report.update(r.id, { status: "auto_hidden" });
      await auditLog({ actor_id: member.id, actor_name: member.display_name, action: "thread_hide", target_type: r.target_type, target_id: r.target_id, detail: "通報により非表示" });
      await load();
    } catch (e) { alert(e.message); }
    setBusy(null);
  };

  const resolve = async (r, status) => {
    setBusy(r.id);
    try {
      await base44.entities.Report.update(r.id, { status });
      await auditLog({ actor_id: member.id, actor_name: member.display_name, action: status === "resolved" ? "report_resolve" : "report_dismiss", target_type: "report", target_id: r.id, detail: r.target_type });
      await load();
    } catch (e) { alert(e.message); }
    setBusy(null);
  };

  if (loading) return <div className="text-muted-foreground">読み込み中...</div>;
  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">通報管理</h1>
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          {error}
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={load}>再読み込み</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">通報管理</h1>
      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">未処理の通報はありません</p>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{r.target_type} <span className="text-muted-foreground">/ {REASON_LABELS[r.reason] || r.reason}</span></div>
                  <div className="text-xs text-muted-foreground mt-1">対象ID: {r.target_id}</div>
                  {r.detail && <div className="text-sm mt-2 line-clamp-2">{r.detail}</div>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="destructive" onClick={() => hideTarget(r)} disabled={busy === r.id}>
                    {busy === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><EyeOff className="w-3 h-3" /> 非表示</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => resolve(r, "resolved")} disabled={busy === r.id}>
                    <Check className="w-3 h-3" /> 対応済
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => resolve(r, "dismissed")} disabled={busy === r.id}>
                    <X className="w-3 h-3" /> 却下
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

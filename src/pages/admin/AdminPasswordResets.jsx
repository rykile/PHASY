import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMember } from "@/lib/MemberContext";
import { auditLog } from "@/lib/admin";
import { getMemberByUsername, formatJST } from "@/lib/community";
import { hashPassword, generateSalt, DEFAULT_ITERATIONS } from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X, Loader2, RefreshCw } from "lucide-react";

export default function AdminPasswordResets() {
  const { member: me } = useMember();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [tempPw, setTempPw] = useState({});
  const [result, setResult] = useState({});

  const load = async () => {
    setLoading(true);
    const list = await base44.entities.PasswordResetRequest.list("-created_date", 100);
    setRequests(list || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const genPw = () => {
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    return Array.from(arr).map((b) => (b % 36).toString(36)).join("") + "A1";
  };

  const approve = async (r) => {
    setBusy(r.id);
    try {
      const m = await getMemberByUsername(r.username);
      if (!m) { setResult({ ...result, [r.id]: "ユーザーが見つかりません" }); setBusy(null); return; }
      const tp = (tempPw[r.id] || "").trim() || genPw();
      if (tp.length < 8) { setResult({ ...result, [r.id]: "一時パスワードは8文字以上にしてください" }); setBusy(null); return; }
      const salt = generateSalt();
      const hash = await hashPassword(tp, salt, DEFAULT_ITERATIONS);
      await base44.entities.Member.update(m.id, {
        password_hash: hash, password_salt: salt, password_iterations: DEFAULT_ITERATIONS,
        password_updated_at: new Date().toISOString(), must_reset_password: true,
      });
      const all = await base44.entities.Session.filter({ member_id: m.id, is_valid: true }, "-created_at", 100);
      for (const s of (all || [])) await base44.entities.Session.update(s.id, { is_valid: false, invalidated_reason: "admin" });
      await base44.entities.PasswordResetRequest.update(r.id, {
        status: "approved", handled_by_name: me.display_name, handled_at: new Date().toISOString(),
        method: "temp_password", detail: "一時パスワード発行",
      });
      await auditLog({ actor_id: me.id, actor_name: me.display_name, action: "password_reset_approve", target_type: "user", target_id: m.id, detail: r.username });
      setResult({ ...result, [r.id]: `承認済み。一時パスワード: ${tp} （安全な経路で本人に伝達してください）` });
      await load();
    } catch (e) { setResult({ ...result, [r.id]: e.message }); }
    setBusy(null);
  };

  const reject = async (r) => {
    setBusy(r.id);
    try {
      await base44.entities.PasswordResetRequest.update(r.id, {
        status: "rejected", handled_by_name: me.display_name, handled_at: new Date().toISOString(),
      });
      await auditLog({ actor_id: me.id, actor_name: me.display_name, action: "password_reset_reject", target_type: "user", target_id: r.member_id, detail: r.username });
      await load();
    } catch (e) {}
    setBusy(null);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">パスワード再設定申請</h1>
      <p className="text-xs text-muted-foreground">承認すると一時パスワードを発行できます。ユーザーは一時パスワードでログイン後、新しいパスワードの設定が求められます。既存パスワードを閲覧することはできません。</p>
      {loading ? <div className="text-muted-foreground">読み込み中...</div> : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">申請はありません</p>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm">@{r.username}</span>
                  <span className={"ml-2 text-xs px-1.5 py-0.5 rounded " + (r.status === "pending" ? "bg-amber-50 text-amber-700" : r.status === "approved" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>{r.status}</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatJST(r.requested_at)}</span>
              </div>
              {r.identity_note && <p className="text-xs text-muted-foreground">本人確認: {r.identity_note}</p>}
              {r.status === "pending" ? (
                <div className="space-y-2">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 max-w-xs space-y-1">
                      <Label className="text-xs">一時パスワード（空欄で自動生成）</Label>
                      <Input value={tempPw[r.id] || ""} onChange={(e) => setTempPw({ ...tempPw, [r.id]: e.target.value })} placeholder="空欄で自動生成" />
                    </div>
                    <Button size="sm" variant="outline" type="button" onClick={() => setTempPw({ ...tempPw, [r.id]: genPw() })}><RefreshCw className="w-3 h-3" /> 生成</Button>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approve(r)} disabled={busy === r.id}>{busy === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} 承認・発行</Button>
                    <Button size="sm" variant="outline" onClick={() => reject(r)} disabled={busy === r.id}><X className="w-3 h-3" /> 却下</Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">処理: {r.method || r.status} / 担当: {r.handled_by_name || "-"} / {formatJST(r.handled_at)}</p>
              )}
              {result[r.id] && <p className="text-xs text-orange-700 bg-orange-50 p-2 rounded break-all">{result[r.id]}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMember } from "@/lib/MemberContext";
import { auditLog } from "@/lib/admin";
import { getOfficialBadgeConfig } from "@/lib/community";
import Badge from "@/components/Badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Lock, Unlock, Star, LogOut, Ban, RotateCcw } from "lucide-react";

export default function AdminUsers() {
  const { member: me } = useMember();
  const [members, setMembers] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    setLoading(true);
    const list = await base44.entities.Member.list("-created_date", 200);
    setMembers(list);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = members.filter((m) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (m.username || "").toLowerCase().includes(s) || (m.display_name || "").toLowerCase().includes(s);
  });

  const toggleLock = async (m) => {
    setBusy(m.id);
    try {
      const next = !m.is_locked;
      await base44.entities.Member.update(m.id, { is_locked: next, locked_until: null, lock_reason: next ? "管理者によるロック" : "" });
      await auditLog({ actor_id: me.id, actor_name: me.display_name, action: next ? "user_lock" : "user_unlock", target_type: "user", target_id: m.id, detail: m.username });
      await load();
    } catch (e) { alert(e.message); }
    setBusy(null);
  };

  const changeRole = async (m, role) => {
    setBusy(m.id);
    try {
      await base44.entities.Member.update(m.id, { role });
      // invalidate sessions on role change
      const all = await base44.entities.Session.filter({ member_id: m.id, is_valid: true }, "-created_at", 100);
      for (const s of (all || [])) await base44.entities.Session.update(s.id, { is_valid: false, invalidated_reason: "role_change" });
      await auditLog({ actor_id: me.id, actor_name: me.display_name, action: "role_change", target_type: "user", target_id: m.id, detail: `${m.username} → ${role}` });
      await load();
    } catch (e) { alert(e.message); }
    setBusy(null);
  };

  const toggleOfficial = async (m) => {
    setBusy(m.id);
    try {
      const next = !m.is_official;
      const cfg = getOfficialBadgeConfig();
      await base44.entities.Member.update(m.id, { is_official: next, official_badge: next ? cfg.label : "", official_badge_color: next ? cfg.color : "" });
      await auditLog({ actor_id: me.id, actor_name: me.display_name, action: next ? "official_grant" : "official_remove", target_type: "user", target_id: m.id, detail: m.username });
      await load();
    } catch (e) { alert(e.message); }
    setBusy(null);
  };

  const forceLogout = async (m) => {
    if (!confirm(`${m.display_name} のすべてのセッションを無効化しますか？`)) return;
    setBusy(m.id);
    try {
      const all = await base44.entities.Session.filter({ member_id: m.id, is_valid: true }, "-created_at", 100);
      for (const s of (all || [])) await base44.entities.Session.update(s.id, { is_valid: false, invalidated_reason: "admin" });
      await auditLog({ actor_id: me.id, actor_name: me.display_name, action: "force_logout", target_type: "user", target_id: m.id, detail: m.username });
      await load();
    } catch (e) { alert(e.message); }
    setBusy(null);
  };

  const toggleSuspend = async (m) => {
    setBusy(m.id);
    try {
      const next = m.account_status === "suspended" ? "active" : "suspended";
      await base44.entities.Member.update(m.id, { account_status: next });
      if (next === "suspended") {
        const all = await base44.entities.Session.filter({ member_id: m.id, is_valid: true }, "-created_at", 100);
        for (const s of (all || [])) await base44.entities.Session.update(s.id, { is_valid: false, invalidated_reason: "admin" });
      }
      await auditLog({ actor_id: me.id, actor_name: me.display_name, action: next === "suspended" ? "account_suspend" : "account_unsuspend", target_type: "user", target_id: m.id, detail: m.username });
      await load();
    } catch (e) { alert(e.message); }
    setBusy(null);
  };

  if (loading) return <div className="text-muted-foreground">読み込み中...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">ユーザー管理</h1>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ユーザー名で検索" className="pl-9" />
      </div>
      <div className="space-y-2">
        {filtered.map((m) => (
          <div key={m.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">{m.display_name}</span>
                  <span className="text-xs text-muted-foreground">@{m.username}</span>
                  {m.is_official && <Badge badge={m.official_badge} color={m.official_badge_color} />}
                  {m.is_locked && <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">投稿ロック</span>}
                  {m.account_status === "suspended" && <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">停止中</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">役割: {m.role} / 投稿 {m.post_count || 0} / 状態 {m.account_status || "active"}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant={m.is_locked ? "outline" : "destructive"} onClick={() => toggleLock(m)} disabled={busy === m.id || m.id === me.id}>
                {m.is_locked ? <><Unlock className="w-3 h-3" />投稿ロック解除</> : <><Lock className="w-3 h-3" />投稿ロック</>}
              </Button>
              <Button size="sm" variant="outline" onClick={() => toggleOfficial(m)} disabled={busy === m.id}>
                <Star className="w-3 h-3" /> {m.is_official ? "公式解除" : "公式付与"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => forceLogout(m)} disabled={busy === m.id || m.id === me.id}>
                <LogOut className="w-3 h-3" /> 強制ログアウト
              </Button>
              <Button size="sm" variant={m.account_status === "suspended" ? "outline" : "destructive"} onClick={() => toggleSuspend(m)} disabled={busy === m.id || m.id === me.id}>
                {m.account_status === "suspended" ? <><RotateCcw className="w-3 h-3" />停止解除</> : <><Ban className="w-3 h-3" />停止</>}
              </Button>
              <select
                value={m.role}
                onChange={(e) => changeRole(m, e.target.value)}
                disabled={busy === m.id || m.id === me.id}
                className="h-8 rounded-md border border-input bg-transparent text-xs px-2"
              >
                <option value="user">user</option>
                <option value="subadmin">副管理者</option>
                <option value="admin">管理者</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

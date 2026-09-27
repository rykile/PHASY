import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMember } from "@/lib/MemberContext";
import { auditLog } from "@/lib/admin";
import { getMemberByUsername, getSiteSettings, setOfficialBadgeConfig, invalidateSiteSettings } from "@/lib/community";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Badge from "@/components/Badge";
import { Star, StarOff, Save } from "lucide-react";

const PRESET_COLORS = ["#2563eb", "#0ea5e9", "#16a34a", "#ea580c", "#9333ea", "#e11d48", "#64748b"];

export default function AdminOfficial() {
  const { member: me } = useMember();
  const [settings, setSettings] = useState(null);
  const [label, setLabel] = useState("認証済み");
  const [color, setColor] = useState("#2563eb");
  const [officials, setOfficials] = useState([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const s = await getSiteSettings();
    setSettings(s);
    if (s) { setLabel(s.official_badge_label || "認証済み"); setColor(s.official_badge_color || "#2563eb"); }
    const list = await base44.entities.Member.filter({ is_official: true }, "-created_date", 200);
    setOfficials(list || []);
  };
  useEffect(() => { load(); }, []);

  const saveConfig = async () => {
    setBusy(true);
    try {
      if (settings && settings.id) {
        await base44.entities.SiteSettings.update(settings.id, { official_badge_label: label, official_badge_color: color });
      } else {
        const created = await base44.entities.SiteSettings.create({ site_name: "Base44コミュニティ", official_badge_label: label, official_badge_color: color });
        setSettings(created);
      }
      invalidateSiteSettings();
      setOfficialBadgeConfig({ label, color });
      await auditLog({ actor_id: me.id, actor_name: me.display_name, action: "official_badge_config", target_type: "settings", detail: `${label} / ${color}` });
      setMsg("保存しました");
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  };

  const grant = async () => {
    const uname = q.trim().replace(/^@/, "");
    if (!uname) return;
    setBusy(true);
    try {
      const m = await getMemberByUsername(uname);
      if (!m) { setMsg("ユーザーが見つかりません"); setBusy(false); return; }
      await base44.entities.Member.update(m.id, { is_official: true, official_badge: label, official_badge_color: color });
      await auditLog({ actor_id: me.id, actor_name: me.display_name, action: "official_grant", target_type: "user", target_id: m.id, detail: `${m.username} / ${label}` });
      setQ(""); setMsg("付与しました");
      await load();
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  };

  const remove = async (m) => {
    setBusy(true);
    try {
      await base44.entities.Member.update(m.id, { is_official: false, official_badge: "", official_badge_color: "" });
      await auditLog({ actor_id: me.id, actor_name: me.display_name, action: "official_remove", target_type: "user", target_id: m.id, detail: m.username });
      await load();
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">公式認証管理</h1>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-semibold text-sm">バッジの見た目</h2>
        <div className="flex items-center gap-3">
          <Badge badge={label} color={color} />
          <span className="text-xs text-muted-foreground">プレビュー</span>
        </div>
        <div className="space-y-1.5">
          <Label>バッジラベル</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={12} className="max-w-xs" />
        </div>
        <div className="space-y-1.5">
          <Label>バッジカラー</Label>
          <div className="flex flex-wrap gap-2 items-center">
            {PRESET_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} className={"w-7 h-7 rounded-full border-2 " + (color === c ? "border-foreground" : "border-transparent")} style={{ backgroundColor: c }} />
            ))}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-8 p-0 border border-border rounded cursor-pointer" />
          </div>
        </div>
        {msg && <div className="text-sm text-muted-foreground">{msg}</div>}
        <Button onClick={saveConfig} disabled={busy}><Save className="w-4 h-4 mr-2" /> 設定を保存</Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-semibold text-sm">公式認証を付与</h2>
        <div className="flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ユーザー名で検索" className="max-w-sm" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); grant(); } }} />
          <Button onClick={grant} disabled={busy}><Star className="w-4 h-4 mr-2" /> 付与</Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-semibold text-sm">公式認証ユーザー ({officials.length})</h2>
        <div className="space-y-2">
          {officials.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-sm truncate">{m.display_name}</span>
                <span className="text-xs text-muted-foreground">@{m.username}</span>
                <Badge badge={m.official_badge || label} color={m.official_badge_color || color} />
              </div>
              <Button size="sm" variant="outline" onClick={() => remove(m)} disabled={busy}><StarOff className="w-3 h-3" /> 解除</Button>
            </div>
          ))}
          {officials.length === 0 && <p className="text-sm text-muted-foreground">公式認証ユーザーはいません</p>}
        </div>
      </div>
    </div>
  );
}

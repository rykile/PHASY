import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMember } from "@/lib/MemberContext";
import { auditLog, getMaintenanceConfig, invalidateMaintenance } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wrench, CalendarClock, Trash2 } from "lucide-react";
import { MAINTENANCE_FEATURES, jstInputToISO } from "@/lib/scheduling";
import { formatJSTAdmin } from "@/lib/community";

const STATE_OPTS = [
  { value: "normal", label: "通常" },
  { value: "read_only", label: "読み取り専用" },
  { value: "stopped", label: "停止" },
];

const SCHED_LABEL = { scheduled: "予約済", active: "実行中", completed: "終了", cancelled: "キャンセル" };
function SCHED_STYLE(s) {
  return {
    scheduled: "bg-amber-50 text-amber-700 border-amber-200",
    active: "bg-orange-50 text-orange-700 border-orange-200",
    completed: "bg-zinc-100 text-zinc-600 border-zinc-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
  }[s] || "bg-muted border-border";
}

export default function AdminMaintenance() {
  const { member } = useMember();
  const [config, setConfig] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [featureStates, setFeatureStates] = useState({});
  const [saving, setSaving] = useState(false);

  // schedule form
  const [sTitle, setSTitle] = useState("");
  const [sMsg, setSMsg] = useState("");
  const [sStart, setSStart] = useState("");
  const [sEnd, setSEnd] = useState("");
  const [sFeatures, setSFeatures] = useState([]);
  const [sBusy, setSBusy] = useState(false);

  const load = async () => {
    let c = await getMaintenanceConfig();
    if (!c) {
      c = await base44.entities.MaintenanceConfig.create({
        is_maintenance: false,
        title: "メンテナンス中",
        message: "現在メンテナンス中です。しばらくお待ちください。",
        feature_states: {},
      });
      invalidateMaintenance();
    }
    setConfig(c);
    setTitle(c.title || "メンテナンス中");
    setMessage(c.message || "");
    setFeatureStates(c.feature_states || {});
    const list = await base44.entities.MaintenanceSchedule.list("-start_at", 50);
    setSchedules(list || []);
  };
  useEffect(() => { load(); }, []);

  const saveManual = async (isOn) => {
    setSaving(true);
    try {
      await base44.entities.MaintenanceConfig.update(config.id, {
        is_maintenance: isOn,
        title,
        message,
        updated_by_name: member?.display_name,
      });
      await auditLog({
        actor_id: member?.id,
        actor_name: member?.display_name,
        action: "maintenance_update",
        target_type: "maintenance",
        detail: `メンテナンス=${isOn}`,
      });
      invalidateMaintenance();
      await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const saveFeatures = async () => {
    setSaving(true);
    try {
      await base44.entities.MaintenanceConfig.update(config.id, {
        feature_states: featureStates,
        updated_by_name: member?.display_name,
      });
      await auditLog({
        actor_id: member?.id,
        actor_name: member?.display_name,
        action: "maintenance_update",
        target_type: "maintenance",
        detail: "機能別停止設定更新",
      });
      invalidateMaintenance();
      await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const createSchedule = async (e) => {
    e.preventDefault();
    if (!sTitle.trim() || !sStart || !sEnd) {
      alert("タイトル・開始・終了日時を入力してください");
      return;
    }
    const startIso = jstInputToISO(sStart);
    const endIso = jstInputToISO(sEnd);
    if (!startIso || !endIso || new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      alert("終了日時は開始日時より後にしてください");
      return;
    }
    setSBusy(true);
    try {
      await base44.entities.MaintenanceSchedule.create({
        title: sTitle.trim(),
        message: sMsg,
        start_at: startIso,
        end_at: endIso,
        target_features: sFeatures,
        status: "scheduled",
        created_by_name: member?.display_name || "",
      });
      await auditLog({
        actor_id: member?.id,
        actor_name: member?.display_name,
        action: "maintenance_schedule",
        target_type: "maintenance",
        detail: `予約: ${sTitle.trim()}`,
      });
      setSTitle(""); setSMsg(""); setSStart(""); setSEnd(""); setSFeatures([]);
      await load();
    } catch (e) { alert(e.message); }
    setSBusy(false);
  };

  const cancelSchedule = async (s) => {
    await base44.entities.MaintenanceSchedule.update(s.id, { status: "cancelled" });
    await auditLog({
      actor_id: member?.id,
      actor_name: member?.display_name,
      action: "maintenance_schedule_cancel",
      target_type: "maintenance",
      target_id: s.id,
      detail: s.title,
    });
    await load();
  };

  const deleteSchedule = async (s) => {
    await base44.entities.MaintenanceSchedule.delete(s.id);
    await load();
  };

  const toggleFeature = (key) => {
    setSFeatures((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  if (!config) return <div className="text-muted-foreground">読み込み中...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-bold">メンテナンス設定</h1>

      <div className={"rounded-xl border p-4 " + (config.is_maintenance ? "border-orange-300 bg-orange-50" : "border-border bg-card")}>
        <div className="flex items-center gap-2">
          <Wrench className={"w-5 h-5 " + (config.is_maintenance ? "text-orange-600" : "text-muted-foreground")} />
          <span className="font-semibold">{config.is_maintenance ? "メンテナンス中" : "通常運用中"}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">手動でサイト全体メンテナンスを開始／終了します。</p>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label>タイトル</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>メッセージ</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => saveManual(true)} disabled={saving || config.is_maintenance}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "メンテナンスを開始"}
          </Button>
          <Button variant="outline" onClick={() => saveManual(false)} disabled={saving || !config.is_maintenance}>
            メンテナンスを終了
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold text-sm mb-1">機能単位の停止設定</h2>
        <p className="text-xs text-muted-foreground mb-3">
          サイト全体メンテナンス中でなくても、特定機能を停止・読み取り専用にできます。
        </p>
        <div className="space-y-2">
          {MAINTENANCE_FEATURES.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/60 last:border-0">
              <span className="text-sm">{f.label}</span>
              <select
                value={featureStates[f.key] || "normal"}
                onChange={(e) => setFeatureStates((p) => ({ ...p, [f.key]: e.target.value }))}
                className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
              >
                {STATE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
        </div>
        <Button className="mt-3" onClick={saveFeatures} disabled={saving}>機能設定を保存</Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold text-sm mb-1 flex items-center gap-1.5">
          <CalendarClock className="w-4 h-4" />予約メンテナンス
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          日時を指定して自動でメンテナンスを開始・終了します（JST基準）。
        </p>
        <form onSubmit={createSchedule} className="space-y-2 mb-4 rounded-lg border border-border/70 p-3 bg-muted/20">
          <Input value={sTitle} onChange={(e) => setSTitle(e.target.value)} placeholder="スケジュールタイトル" />
          <Textarea value={sMsg} onChange={(e) => setSMsg(e.target.value)} placeholder="ユーザー向けメッセージ" rows={2} />
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">開始(JST)</Label>
              <input
                type="datetime-local"
                value={sStart}
                onChange={(e) => setSStart(e.target.value)}
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">終了(JST)</Label>
              <input
                type="datetime-local"
                value={sEnd}
                onChange={(e) => setSEnd(e.target.value)}
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {MAINTENANCE_FEATURES.map((f) => (
              <label key={f.key} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={sFeatures.includes(f.key)}
                  onChange={() => toggleFeature(f.key)}
                />
                {f.label}
              </label>
            ))}
          </div>
          <Button type="submit" disabled={sBusy}>
            {sBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "予約を作成"}
          </Button>
        </form>
        <div className="space-y-2">
          {schedules.length === 0 && <div className="text-sm text-muted-foreground">予約はありません</div>}
          {schedules.map((s) => (
            <div key={s.id} className="rounded-lg border border-border/70 p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{s.title}</span>
                  <span className={"text-[11px] px-1.5 py-0.5 rounded border " + SCHED_STYLE(s.status)}>
                    {SCHED_LABEL[s.status]}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {formatJSTAdmin(s.start_at)} 〜 {formatJSTAdmin(s.end_at)}
                </div>
                {s.target_features?.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    対象: {s.target_features
                      .map((k) => MAINTENANCE_FEATURES.find((f) => f.key === k)?.label || k)
                      .join("・")}
                  </div>
                )}
                {s.message && <p className="text-xs mt-1 line-clamp-2">{s.message}</p>}
              </div>
              <div className="flex gap-1.5 shrink-0">
                {(s.status === "scheduled" || s.status === "active") && (
                  <Button size="sm" variant="outline" onClick={() => cancelSchedule(s)}>キャンセル</Button>
                )}
                {(s.status === "completed" || s.status === "cancelled") && (
                  <Button size="sm" variant="ghost" onClick={() => deleteSchedule(s)}>
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

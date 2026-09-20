import React, { useState, useEffect } from "react";
import { useMember } from "@/lib/MemberContext";
import { useCustomAuth } from "@/lib/CustomAuthContext";
import { base44 } from "@/api/base44Client";
import { getMemberByUsername, setUserTimezone, formatUserDate, TIMEZONES, PRIVACY_OPTIONS, tzLabel } from "@/lib/community";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Moon, Sun, Lock, Globe } from "lucide-react";

const PRIVACY_FIELDS = [
  { key: "privacy_profile", label: "プロフィール" },
  { key: "privacy_posts", label: "投稿一覧" },
  { key: "privacy_following", label: "フォロー中一覧" },
  { key: "privacy_followers", label: "フォロワー一覧" },
];

export default function Settings() {
  const { member, refresh } = useMember();
  const { changePassword } = useCustomAuth();
  const [displayName, setDisplayName] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [bio, setBio] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  const [timezone, setTimezone] = useState("Asia/Tokyo");
  const [tzSaving, setTzSaving] = useState(false);

  const [privacy, setPrivacy] = useState({});
  const [privacySaving, setPrivacySaving] = useState(false);

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confPw, setConfPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwOk, setPwOk] = useState(false);

  useEffect(() => {
    if (member) {
      setDisplayName(member.display_name || "");
      setIconUrl(member.icon_url || "");
      setBio(member.bio || "");
      setUsername(member.username || "");
      setTimezone(member.timezone || "Asia/Tokyo");
      setPrivacy({
        privacy_profile: member.privacy_profile || "public",
        privacy_posts: member.privacy_posts || "public",
        privacy_following: member.privacy_following || "public",
        privacy_followers: member.privacy_followers || "public",
      });
    }
  }, [member]);

  const save = async () => {
    setError(""); setOk(false);
    const uname = username.trim().replace(/^@/, "");
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(uname)) { setError("ユーザー名は3〜20文字の半角英数字・_ で入力してください"); return; }
    if (!displayName.trim()) { setError("表示名を入力してください"); return; }
    setSaving(true);
    try {
      if (uname !== member.username) {
        const existing = await getMemberByUsername(uname);
        if (existing && existing.id !== member.id) { setError("このユーザー名は既に使われています"); setSaving(false); return; }
      }
      await base44.entities.Member.update(member.id, {
        display_name: displayName.trim(), icon_url: iconUrl.trim(), bio: bio.trim(), username: uname,
      });
      await refresh();
      setOk(true);
    } catch (e) { setError(e.message || "保存に失敗しました"); }
    setSaving(false);
  };

  const setTheme = async (theme) => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
    if (member) await base44.entities.Member.update(member.id, { theme });
  };

  const saveTimezone = async () => {
    if (!TIMEZONES.some((t) => t.value === timezone)) return; // invalid tz is not saved
    setTzSaving(true);
    try {
      await base44.entities.Member.update(member.id, { timezone });
      setUserTimezone(timezone);
      await refresh();
    } catch (e) {}
    setTzSaving(false);
  };

  const savePrivacy = async () => {
    setPrivacySaving(true);
    try {
      await base44.entities.Member.update(member.id, privacy);
      await refresh();
    } catch (e) {}
    setPrivacySaving(false);
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setPwError(""); setPwOk(false);
    if (newPw !== confPw) { setPwError("新しいパスワードが一致しません"); return; }
    setPwSaving(true);
    const res = await changePassword(curPw, newPw);
    setPwSaving(false);
    if (!res.ok) setPwError(res.error);
    else { setPwOk(true); setCurPw(""); setNewPw(""); setConfPw(""); }
  };

  if (!member) return null;

  return (
    <div className="max-w-xl mx-auto w-full">
      <h1 className="font-bold text-lg mb-4">設定</h1>
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-sm">プロフィール</h2>
        {member.is_official && (
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
            あなたは公式認証ユーザーです。
          </div>
        )}
        {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        {ok && <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm">保存しました</div>}
        <div className="space-y-1.5">
          <Label>ユーザー名</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} />
        </div>
        <div className="space-y-1.5">
          <Label>表示名</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={30} />
        </div>
        <div className="space-y-1.5">
          <Label>アイコン画像URL</Label>
          <Input value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div className="space-y-1.5">
          <Label>自己紹介</Label>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={200} />
        </div>
        <Button onClick={save} disabled={saving} className="w-full h-10">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} 保存
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 mt-4 space-y-3">
        <h2 className="font-semibold text-sm flex items-center gap-1.5"><Globe className="w-4 h-4 text-orange-500" /> 日時・タイムゾーン設定</h2>
        <p className="text-xs text-muted-foreground">現在の設定: {tzLabel(timezone)}</p>
        <select
          value={timezone}
          onChange={(e) => { setTimezone(e.target.value); setUserTimezone(e.target.value); }}
          className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          {TIMEZONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <div className="text-xs text-muted-foreground">
          現在時刻の表示: <span className="font-mono text-foreground">{formatUserDate(new Date().toISOString(), timezone)}</span>
          <span className="ml-1">(タイムゾーンを変更すると表示が変わります。保存すると全画面に反映されます)</span>
        </div>
        <p className="text-xs text-muted-foreground">
          実時間（DB上の投稿日時など）は変更されません。変わるのは表示のみです。サービス全体の予約処理はJST基準で動作します。
        </p>
        <Button onClick={saveTimezone} disabled={tzSaving} className="w-full h-10">
          {tzSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} 標準時を保存
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 mt-4 space-y-3">
        <h2 className="font-semibold text-sm">プライバシー設定</h2>
        {PRIVACY_FIELDS.map((f) => (
          <div key={f.key} className="flex items-center justify-between gap-3">
            <Label className="text-sm">{f.label}</Label>
            <select
              value={privacy[f.key] || "public"}
              onChange={(e) => setPrivacy((p) => ({ ...p, [f.key]: e.target.value }))}
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              {PRIVACY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ))}
        <Button onClick={savePrivacy} disabled={privacySaving} className="w-full h-10">
          {privacySaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} プライバシー設定を保存
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 mt-4 space-y-3">
        <h2 className="font-semibold text-sm">テーマ</h2>
        <div className="flex gap-2">
          <button onClick={() => setTheme("light")} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-border hover:bg-muted text-sm"><Sun className="w-4 h-4" /> ライト</button>
          <button onClick={() => setTheme("dark")} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-border hover:bg-muted text-sm"><Moon className="w-4 h-4" /> ダーク</button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 mt-4 space-y-3">
        <h2 className="font-semibold text-sm">パスワード変更</h2>
        <p className="text-xs text-muted-foreground">現在のパスワードと新しいパスワードを入力してください。変更後、他のログインセッションは無効化されます。</p>
        {pwError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{pwError}</div>}
        {pwOk && <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm">パスワードを変更しました</div>}
        <form onSubmit={submitPassword} className="space-y-3">
          <div className="space-y-1.5">
            <Label>現在のパスワード</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} className="pl-9 h-10" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>新しいパスワード</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="pl-9 h-10" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>新しいパスワード（確認）</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="password" value={confPw} onChange={(e) => setConfPw(e.target.value)} className="pl-9 h-10" required />
            </div>
          </div>
          <Button type="submit" disabled={pwSaving} className="w-full h-10">
            {pwSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />} パスワードを変更
          </Button>
        </form>
      </div>
    </div>
  );

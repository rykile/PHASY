import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCustomAuth } from "@/lib/CustomAuthContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Lock, Loader2, User, Image as ImageIcon } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Register() {
  const { register } = useCustomAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [termsVersion, setTermsVersion] = useState("");
  const returnTo = safeReturnTo();

  useEffect(() => {
    base44.entities.Terms.list("-effective_date", 1).then((t) => { if (t && t[0]) setTermsVersion(t[0].version); }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("パスワードが一致しません"); return; }
    if (!agree) { setError("利用規約への同意が必要です"); return; }
    setLoading(true);
    try {
      const res = await register({ username, display_name: displayName, password, icon_url: iconUrl, terms_version: termsVersion });
      if (!res.ok) setError(res.error);
      else navigate(returnTo);
    } finally { setLoading(false); }
  };

  return (
    <AuthLayout
      icon={UserPlus}
      title="アカウントを作成"
      subtitle="コミュニティに参加しましょう"
      footer={
        <>
          すでにアカウントをお持ちですか？{" "}
          <Link to={"/login" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")} className="text-primary font-medium hover:underline">ログイン</Link>
        </>
      }
    >
      {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">ユーザー名（ログインID）</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="username" autoComplete="username" autoFocus placeholder="yamada_taro" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-10 h-12" maxLength={20} required />
          </div>
          <p className="text-xs text-muted-foreground">半角英数字・_ で3〜20文字。重複できません。</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="display">表示名</Label>
          <Input id="display" placeholder="山田太郎" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-12" maxLength={30} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="icon">アイコン画像URL（任意）</Label>
          <div className="relative">
            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="icon" placeholder="https://..." value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} className="pl-10 h-12" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">パスワード</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="password" type="password" autoComplete="new-password" placeholder="8文字以上" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">パスワード（確認）</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="confirm" type="password" autoComplete="new-password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
          <span>利用規約およびプライバシーポリシーに同意する</span>
        </label>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />作成中...</>) : "アカウント作成"}
        </Button>
      </form>
    </AuthLayout>
  );
}

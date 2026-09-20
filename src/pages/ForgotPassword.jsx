import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getMemberByUsername } from "@/lib/community";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { KeyRound, ArrowLeft, Loader2, User } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function ForgotPassword() {
  const [username, setUsername] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const uname = (username || "").trim().replace(/^@/, "");
    if (!uname) { setError("ユーザー名を入力してください"); return; }
    setLoading(true);
    try {
      const m = await getMemberByUsername(uname);
      await base44.entities.PasswordResetRequest.create({
        member_id: m ? m.id : "",
        username: uname,
        identity_note: note.trim(),
        status: "pending",
        requested_at: new Date().toISOString(),
      });
      setSent(true);
    } catch (err) {
      setError("申請の送信に失敗しました");
    } finally { setLoading(false); }
  };

  return (
    <AuthLayout
      icon={KeyRound}
      title="パスワード再設定申請"
      subtitle="運営が本人確認の上で再設定を行います"
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline">
          <ArrowLeft className="w-3 h-3 inline mr-1" />ログインへ戻る
        </Link>
      }
    >
      {sent ? (
        <div className="text-sm text-center space-y-2">
          <p className="font-medium">再設定申請を受け付けました。</p>
          <p className="text-muted-foreground">運営が確認の上、再設定を行います。お手続きには時間がかかる場合があります。</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="username">ユーザー名</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input id="username" autoFocus placeholder="yamada_taro" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-10 h-12" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">本人確認情報</Label>
            <Textarea id="note" placeholder="本人確認のための情報（登録時の表示名、アイコンの特徴など）" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
            {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />送信中...</>) : "再設定を申請"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

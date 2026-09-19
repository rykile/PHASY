import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMember } from "@/lib/MemberContext";
import { nextThreadNumber } from "@/lib/community";
import { getNgWords, checkNgWords } from "@/lib/admin";
import RichTextEditor from "@/components/RichTextEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function NewThread() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { member } = useMember();
  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    base44.entities.Category.filter({ is_hidden: false, kind: "board" }, "sort_order", 50).then(setCategories).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!member) { setError("プロフィール設定を完了してください"); return; }
    if (!title.trim()) { setError("タイトルを入力してください"); return; }
    if (!body.trim() || body.trim() === "<p><br></p>") { setError("本文を入力してください"); return; }
    if (!categoryId) { setError("カテゴリーを選択してください"); return; }
    try {
      const ng = await getNgWords();
      const chk = checkNgWords(title + " " + body, ng);
      if (!chk.ok) { setError(`NGワードが含まれています: ${chk.hits.join(", ")}`); return; }
    } catch (e) {}
    setLoading(true);
    try {
      const cat = categories.find((c) => c.id === categoryId);
      const num = await nextThreadNumber();
      const thread = await base44.entities.Thread.create({
        thread_number: num,
        title: title.trim(),
        body,
        category_id: categoryId,
        category_name: cat?.name || "",
        author_id: member.id,
        author_name: member.display_name,
        author_icon: member.icon_url,
        author_badge: member.is_official ? member.official_badge : "",
        status: "normal",
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        view_count: 0, like_count: 0, comment_count: 0,
        is_deleted: false, report_count: 0, is_hidden_auto: false,
      });
      await base44.entities.Member.update(member.id, { post_count: (member.post_count || 0) + 1 });
      navigate(`/thread/${thread.id}`);
    } catch (err) {
      setError(err.message || "作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      <Link to="/board" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"><ArrowLeft className="w-4 h-4" /> 掲示板に戻る</Link>
      <div className="rounded-xl border border-border bg-card p-5">
        <h1 className="text-lg font-bold mb-4">新しいスレッドを作成</h1>
        {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>カテゴリー</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button type="button" key={c.id} onClick={() => setCategoryId(c.id)} className={"px-3 py-1.5 rounded-lg text-sm border " + (categoryId === c.id ? "bg-orange-600 text-white border-orange-600" : "border-border hover:bg-muted")}>
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title">タイトル</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="スレッドのタイトル" />
          </div>
          <div className="space-y-1.5">
            <Label>本文</Label>
            <RichTextEditor value={body} onChange={setBody} minHeight={200} placeholder="スレッドの本文を入力..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tags">タグ（カンマ区切り、任意）</Label>
            <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="初心者, 質問" />
          </div>
          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 作成中...</> : "スレッドを作成"}
          </Button>
        </form>
      </div>
    </div>
  );
}

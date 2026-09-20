import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMember } from "@/lib/MemberContext";
import { auditLog, invalidateNgWords } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2 } from "lucide-react";

export default function AdminNgWords() {
  const { member } = useMember();
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [word, setWord] = useState("");
  const [kind, setKind] = useState("word");
  const [isRegex, setIsRegex] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const list = await base44.entities.NgWord.list("-created_date", 300);
    setWords(list);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!word.trim()) return;
    setBusy(true);
    try {
      await base44.entities.NgWord.create({ word: word.trim(), kind, is_regex: isRegex, replacement: "***", is_active: true, created_by_name: member.display_name });
      await auditLog({ actor_id: member.id, actor_name: member.display_name, action: "ngword_add", target_type: "ngword", detail: word.trim() });
      invalidateNgWords();
      setWord(""); setIsRegex(false);
      await load();
    } catch (e) { alert(e.message); }
    setBusy(false);
  };

  const remove = async (w) => {
    try {
      await base44.entities.NgWord.delete(w.id);
      await auditLog({ actor_id: member.id, actor_name: member.display_name, action: "ngword_remove", target_type: "ngword", target_id: w.id, detail: w.word });
      invalidateNgWords();
      await load();
    } catch (e) { alert(e.message); }
  };

  const toggle = async (w) => {
    try {
      await base44.entities.NgWord.update(w.id, { is_active: !w.is_active });
      invalidateNgWords();
      await load();
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">NGワード・URL制限</h1>
      <form onSubmit={add} className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex gap-2">
          <Input value={word} onChange={(e) => setWord(e.target.value)} placeholder="規制する語句またはURL" />
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-2 text-sm">
            <option value="word">語句</option>
            <option value="url">URL</option>
          </select>
          <Button type="submit" disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" />追加</>}</Button>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isRegex} onChange={(e) => setIsRegex(e.target.checked)} />
          正規表現として扱う
        </label>
      </form>
      {loading ? <div className="text-muted-foreground">読み込み中...</div> : (
        <div className="space-y-1.5">
          {words.length === 0 && <p className="text-sm text-muted-foreground">登録されていません</p>}
          {words.map((w) => (
            <div key={w.id} className="rounded-lg border border-border bg-card p-3 flex items-center justify-between">
              <div className="min-w-0">
                <span className="text-sm font-mono break-all">{w.word}</span>
                <span className="text-xs text-muted-foreground ml-2">{w.kind}{w.is_regex ? " / 正規表現" : ""}</span>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => toggle(w)} className={"text-xs px-2 py-1 rounded border " + (w.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-muted text-muted-foreground border-border")}>
                  {w.is_active ? "有効" : "無効"}
                </button>
                <Button size="sm" variant="ghost" onClick={() => remove(w)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

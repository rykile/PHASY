import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import ThreadCard from "@/components/ThreadCard";
import { ThreadSkeleton } from "@/components/Skeleton";
import { Plus, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const SORTS = [
  { key: "new", label: "新しい順" },
  { key: "old", label: "古い順" },
  { key: "comments", label: "コメント数順" },
  { key: "views", label: "閲覧数順" },
  { key: "likes", label: "いいね数順" },
  { key: "hot", label: "急上昇" },
];

export default function Board() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const sort = params.get("sort") || "new";
  const cat = params.get("cat") || "";

  useEffect(() => {
    base44.entities.Category.filter({ is_hidden: false, kind: "board" }, "sort_order", 50).then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const list = await base44.entities.Thread.filter({ is_deleted: false }, "-created_date", 200);
        let visible = (list || []).filter((t) => t.status !== "hidden" && !t.is_hidden_auto);
        if (cat) {
          const c = categories.find((x) => x.slug === cat);
          if (c) visible = visible.filter((t) => t.category_id === c.id);
        }
        visible = sortThreads(visible, sort);
        setThreads(visible);
      } catch (e) {}
      setLoading(false);
    })();
  }, [cat, sort, categories]);

  const setSort = (s) => { const next = new URLSearchParams(params); next.set("sort", s); setParams(next); };
  const setCat = (slug) => { const next = new URLSearchParams(params); if (slug) next.set("cat", slug); else next.delete("cat"); setParams(next); };

  return (
    <div className="lg:flex lg:gap-6 w-full">
      <aside className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-28">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">カテゴリー</h3>
          <div className="space-y-0.5">
            <CatItem active={!cat} onClick={() => setCat("")} label="すべて" icon="✨" />
            {categories.map((c) => (
              <CatItem key={c.id} active={cat === c.slug} onClick={() => setCat(c.slug)} label={c.name} icon={c.icon || "📂"} />
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <h1 className="font-bold text-base">掲示板{cat ? ` · ${categories.find((c) => c.slug === cat)?.name || ""}` : ""}</h1>
            <Link to="/thread/new" className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700">
              <Plus className="w-4 h-4" /> スレッド作成
            </Link>
          </div>
          {/* Mobile category chips */}
          <div className="lg:hidden flex gap-1.5 overflow-x-auto px-3 py-2 border-b border-border">
            <Chip active={!cat} onClick={() => setCat("")}>すべて</Chip>
            {categories.map((c) => <Chip key={c.id} active={cat === c.slug} onClick={() => setCat(c.slug)}>{c.icon} {c.name}</Chip>)}
          </div>
          {/* Sort bar */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-border overflow-x-auto">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            {SORTS.map((s) => (
              <button key={s.key} onClick={() => setSort(s.key)} className={cn("px-2.5 py-1 rounded-full text-xs whitespace-nowrap", sort === s.key ? "bg-foreground text-background font-medium" : "text-muted-foreground hover:bg-muted")}>
                {s.label}
              </button>
            ))}
          </div>
          {loading ? Array.from({ length: 8 }).map((_, i) => <ThreadSkeleton key={i} />) :
            threads.length ? threads.map((t) => <ThreadCard key={t.id} thread={t} showCategory />) :
              <div className="p-12 text-center text-sm text-muted-foreground">スレッドがありません。最初のスレッドを作成してみましょう。</div>}
        </div>
      </main>
    </div>
  );
}

function sortThreads(list, sort) {
  const arr = [...list];
  switch (sort) {
    case "old": return arr.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    case "comments": return arr.sort((a, b) => (b.comment_count || 0) - (a.comment_count || 0));
    case "views": return arr.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    case "likes": return arr.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
    case "hot": {
      const score = (t) => {
        const ageHrs = Math.max(1, (Date.now() - new Date(t.updated_date || t.created_date).getTime()) / 3600000);
        return ((t.comment_count || 0) * 5 + (t.like_count || 0) * 3 + (t.view_count || 0) * 0.5) / Math.pow(ageHrs, 0.7);
      };
      return arr.sort((a, b) => score(b) - score(a));
    }
    default: return arr.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }
}

function CatItem({ active, onClick, label, icon }) {
  return (
    <button onClick={onClick} className={cn("w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-left", active ? "bg-muted font-medium" : "hover:bg-muted")}>
      <span>{icon}</span> {label}
    </button>
  );
}
function Chip({ active, onClick, children }) {
  return <button onClick={onClick} className={cn("px-3 py-1 rounded-full text-xs whitespace-nowrap border", active ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground")}>{children}</button>;
}

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { formatJST } from "@/lib/community";
import { Skeleton } from "@/components/Skeleton";
import { Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";

export default function News() {
  const [news, setNews] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cat, setCat] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Category.filter({ is_hidden: false, kind: "news" }, "sort_order", 50).then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const list = await base44.entities.News.filter({ is_published: true, is_deleted: false }, "-published_date", 100);
      let visible = list || [];
      if (cat) visible = visible.filter((n) => n.category_name === cat);
      setNews(visible);
      setLoading(false);
    })();
  }, [cat]);

  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-orange-500" />
          <h1 className="font-bold">ニュース</h1>
        </div>
        <div className="flex gap-1.5 px-3 py-2 border-b border-border overflow-x-auto">
          <Chip active={!cat} onClick={() => setCat("")}>すべて</Chip>
          {categories.map((c) => <Chip key={c.id} active={cat === c.name} onClick={() => setCat(c.name)}>{c.icon} {c.name}</Chip>)}
        </div>
        {loading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 m-3" />) :
          news.length ? news.map((n) => (
            <Link key={n.id} to={`/news/${n.id}`} className="flex gap-3 p-4 border-b border-border hover:bg-muted/40">
              {n.thumbnail && <img src={n.thumbnail} alt="" className="w-24 h-16 rounded-lg object-cover shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono text-muted-foreground">ニュース #{n.news_number}</span>
                  {n.category_name && <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{n.category_name}</span>}
                  {n.is_official && <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">公式</span>}
                </div>
                <h3 className="font-medium text-sm line-clamp-2">{n.title}</h3>
                <div className="text-xs text-muted-foreground mt-1">{formatJST(n.published_date || n.created_date)} · 💬 {n.comment_count || 0} · 👁 {n.view_count || 0}</div>
              </div>
            </Link>
          )) : <div className="p-12 text-center text-sm text-muted-foreground">ニュースがありません</div>}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return <button onClick={onClick} className={cn("px-3 py-1 rounded-full text-xs whitespace-nowrap border", active ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground")}>{children}</button>;
}

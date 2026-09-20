import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import ThreadCard from "@/components/ThreadCard";
import { ThreadSkeleton } from "@/components/Skeleton";
import { isAnnouncementVisible } from "@/lib/scheduling";
import { Search as SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SCOPES = [
  { key: "all", label: "全体" },
  { key: "threads", label: "スレッド" },
  { key: "comments", label: "コメント" },
  { key: "news", label: "ニュース" },
  { key: "announcements", label: "お知らせ" },
  { key: "users", label: "ユーザー" },
];

export default function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const scope = params.get("scope") || "all";
  const [input, setInput] = useState(q);
  const [results, setResults] = useState({ threads: [], comments: [], news: [], announcements: [], users: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => { setInput(q); }, [q]);

  useEffect(() => {
    if (!q.trim()) return;
    (async () => {
      setLoading(true);
      const kw = q.trim();
      const lower = kw.toLowerCase();
      // Number search: "#2364" and bare "2364" are the same number query
      const isHash = /^#(\d+)$/.test(kw);
      const isBare = /^\d+$/.test(kw);
      const numQuery = isHash ? Number(kw.slice(1)) : (isBare ? Number(kw) : null);
      const isNo = /^no\.?(\d+)$/i.test(kw);
      const noNum = isNo ? Number(kw.replace(/^no\.?/i, "")) : (numQuery !== null ? numQuery : null);
      try {
        const [threads, comments, news, anns, users] = await Promise.all([
          base44.entities.Thread.filter({ is_deleted: false }, "-created_date", 300),
          base44.entities.Comment.filter({ is_deleted: false }, "-created_date", 300),
          base44.entities.News.filter({ is_published: true, is_deleted: false }, "-created_date", 100),
          base44.entities.Announcement.filter({ status: "published", is_active: true }, "-announcement_number", 100),
          base44.entities.Member.list("-created_date", 200),
        ]);
        const now = Date.now();

        let tRes = (threads || []).filter((t) => t.status !== "hidden");
        let nRes = news || [];
        let aRes = (anns || []).filter((a) => isAnnouncementVisible(a, now));
        if (numQuery !== null) {
          tRes = tRes.filter((t) => t.thread_number === numQuery);
          nRes = nRes.filter((n) => n.news_number === numQuery);
          aRes = aRes.filter((a) => a.announcement_number === numQuery);
        } else if (!isNo) {
          tRes = tRes.filter((t) => (t.title || "").toLowerCase().includes(lower) || (t.body || "").toLowerCase().includes(lower) || (t.tags || []).some((tg) => tg.toLowerCase().includes(lower)));
          nRes = nRes.filter((n) => (n.title || "").toLowerCase().includes(lower) || (n.body || "").toLowerCase().includes(lower));
          aRes = aRes.filter((a) => (a.title || "").toLowerCase().includes(lower) || (a.body || "").toLowerCase().includes(lower));
        } else {
          tRes = []; nRes = []; aRes = [];
        }

        let cRes = (comments || []).filter((c) => !c.is_deleted);
        if (noNum !== null) {
          cRes = cRes.filter((c) => c.comment_number === noNum);
        } else if (numQuery === null) {
          cRes = cRes.filter((c) => (c.body || "").toLowerCase().includes(lower) || (c.author_name || "").toLowerCase().includes(lower));
        } else {
          cRes = [];
        }

        const uRes = numQuery === null && !isNo
          ? (users || []).filter((u) => (u.username || "").toLowerCase().includes(lower) || (u.display_name || "").toLowerCase().includes(lower))
          : [];

        setResults({ threads: tRes, comments: cRes, news: nRes, announcements: aRes, users: uRes });
      } catch (e) {}
      setLoading(false);
    })();
  }, [q, scope]);

  const run = (e) => { e.preventDefault(); setParams({ q: input.trim(), scope }); };
  const setScope = (s) => { const next = new URLSearchParams(params); next.set("scope", s); setParams(next); };
  const show = (key) => scope === "all" || scope === key;
  const empty = results.threads.length === 0 && results.comments.length === 0 && results.news.length === 0 && results.announcements.length === 0 && results.users.length === 0;

  return (
    <div className="max-w-3xl mx-auto w-full">
      <form onSubmit={run} className="relative mb-3">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="キーワード、#番号、No.番号 で検索（2364 でも番号検索）" className="w-full h-11 pl-11 pr-4 rounded-xl bg-card border border-border text-sm outline-none focus:border-orange-400" />
      </form>
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {SCOPES.map((s) => (
          <button key={s.key} onClick={() => setScope(s.key)} className={cn("px-3 py-1 rounded-full text-xs border", scope === s.key ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground")}>{s.label}</button>
        ))}
      </div>

      {!q.trim() ? <div className="p-12 text-center text-sm text-muted-foreground">検索キーワードを入力してください</div> :
        loading ? <ThreadSkeleton /> : (
          <div className="space-y-4">
            {show("threads") && results.threads.length > 0 && (
              <Section title={`スレッド (${results.threads.length})`}>
                {results.threads.slice(0, 20).map((t) => <ThreadCard key={t.id} thread={t} />)}
              </Section>
            )}
            {show("news") && results.news.length > 0 && (
              <Section title={`ニュース (${results.news.length})`}>
                {results.news.slice(0, 20).map((n) => (
                  <Link key={n.id} to={`/news/${n.id}`} className="block p-3 border-b border-border hover:bg-muted/40">
                    <div className="text-xs font-mono text-muted-foreground">ニュース #{n.news_number}</div>
                    <div className="text-sm font-medium">{n.title}</div>
                  </Link>
                ))}
              </Section>
            )}
            {show("announcements") && results.announcements.length > 0 && (
              <Section title={`お知らせ (${results.announcements.length})`}>
                {results.announcements.slice(0, 20).map((a) => (
                  <Link key={a.id} to={`/announcements/${a.announcement_number}`} className="block p-3 border-b border-border hover:bg-muted/40">
                    <div className="text-xs font-mono text-muted-foreground">お知らせ #{a.announcement_number}</div>
                    <div className="text-sm font-medium">{a.title}</div>
                  </Link>
                ))}
              </Section>
            )}
            {show("comments") && results.comments.length > 0 && (
              <Section title={`コメント (${results.comments.length})`}>
                {results.comments.slice(0, 30).map((c) => (
                  <Link key={c.id} to={`/thread/${c.thread_id}#no-${c.comment_number}`} className="block p-3 border-b border-border hover:bg-muted/40">
                    <div className="text-xs text-muted-foreground">No.{c.comment_number} · {c.author_name}</div>
                    <div className="text-sm line-clamp-2" dangerouslySetInnerHTML={{ __html: (c.body || "").replace(/<[^>]+>/g, "") }} />
                  </Link>
                ))}
              </Section>
            )}
            {show("users") && results.users.length > 0 && (
              <Section title={`ユーザー (${results.users.length})`}>
                {results.users.slice(0, 20).map((u) => (
                  <Link key={u.id} to={`/u/${u.username}`} className="flex items-center gap-3 p-3 border-b border-border hover:bg-muted/40">
                    <div className="w-8 h-8 rounded-full bg-muted overflow-hidden">{u.icon_url ? <img src={u.icon_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold">{(u.display_name || "?").charAt(0)}</div>}</div>
                    <div><div className="text-sm font-medium">{u.display_name}</div><div className="text-xs text-muted-foreground">@{u.username}</div></div>
                  </Link>
                ))}
              </Section>
            )}
            {empty && (
              <div className="p-12 text-center text-sm text-muted-foreground">「{q}」に一致する結果が見つかりませんでした</div>
            )}
          </div>
        )}
    </div>
  );
}

function Section({ title, children }) {
  return <div className="rounded-xl border border-border bg-card overflow-hidden"><div className="px-4 py-2 border-b border-border text-sm font-semibold">{title}</div>{children}</div>;
}

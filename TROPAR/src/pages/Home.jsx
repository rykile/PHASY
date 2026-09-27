import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getSiteSettings, trendingScore, formatJST } from "@/lib/community";
import ThreadCard from "@/components/ThreadCard";
import { ThreadSkeleton } from "@/components/Skeleton";
import Badge from "@/components/Badge";
import { Flame, Sparkles, MessageSquare, Heart, Newspaper, Megaphone, ChevronRight } from "lucide-react";

export default function Home() {
  const [settings, setSettings] = useState(null);
  const [hot, setHot] = useState([]);
  const [recent, setRecent] = useState([]);
  const [popular, setPopular] = useState([]);
  const [news, setNews] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const s = await getSiteSettings(); setSettings(s);
      try {
        const [threads, newsList, ann, cats] = await Promise.all([
          base44.entities.Thread.filter({ is_deleted: false }, "-created_date", 60),
          base44.entities.News.filter({ is_published: true, is_deleted: false }, "-published_date", 5),
          base44.entities.Announcement.filter({ status: "published", is_active: true }, "-announcement_number", 5),
          base44.entities.Category.filter({ is_hidden: false, kind: "board" }, "sort_order", 50),
        ]);
        const visible = (threads || []).filter((t) => t.status !== "hidden" && !t.is_hidden_auto);
        const sortedHot = [...visible].sort((a, b) => trendingScore(b) - trendingScore(a)).slice(0, 5);
        setHot(sortedHot);
        setRecent((visible || []).slice(0, 8));
        setPopular([...visible].sort((a, b) => (b.like_count || 0) - (a.like_count || 0)).slice(0, 5));
        setNews(newsList || []);
        setAnnouncements(ann || []);
        setCategories(cats || []);
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  return (
    <div className="lg:flex lg:gap-6 w-full">
      {/* Sidebar categories */}
      <aside className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-28">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">カテゴリー</h3>
          <div className="space-y-0.5">
            <Link to="/board" className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm hover:bg-muted font-medium">
              <Sparkles className="w-4 h-4 text-orange-500" /> すべて
            </Link>
            {categories.map((c) => (
              <Link key={c.id} to={`/board?cat=${c.slug}`} className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm hover:bg-muted">
                <span>{c.icon || "📂"}</span> {c.name}
              </Link>
            ))}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 space-y-6">
        {/* Hero */}
        <div className="rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg,#ea580c,#f97316)" }}>
          <h1 className="text-2xl font-bold mb-1">{settings?.catchphrase || "掲示板 × SNS × ニュース × コミュニティ"}</h1>
          <p className="text-white/90 text-sm">{settings?.site_description || "みんなで語り合う、日本語コミュニティサービス。"}</p>
          <div className="flex gap-2 mt-4">
            <Link to="/board" className="px-4 py-2 rounded-lg bg-white text-orange-600 text-sm font-medium hover:bg-white/90">{settings?.board_name || "掲示板"}へ</Link>
            <Link to="/news" className="px-4 py-2 rounded-lg bg-white/20 text-white text-sm font-medium hover:bg-white/30">{settings?.news_name || "ニュース"}</Link>
          </div>
        </div>

        {/* Announcements */}
        {announcements.length > 0 && (
          <section className="rounded-xl border border-border bg-card overflow-hidden">
            {announcements.map((a) => (
              <Link key={a.id} to={`/announcements/${a.announcement_number}`} className="flex items-start gap-3 p-3 border-b border-border last:border-0 hover:bg-muted/40">
                <Megaphone className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">#{a.announcement_number}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">{typeLabel(a.type)}</span>
                    <span className="text-sm font-medium">{a.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{a.body}</p>
                </div>
              </Link>
            ))}
          </section>
        )}

        {/* Hot threads */}
        <Section title="🔥 急上昇スレッド" to="/board?sort=hot" icon={Flame}>
          {loading ? <>{Array.from({ length: 3 }).map((_, i) => <ThreadSkeleton key={i} />)}</> :
            hot.length ? hot.map((t) => <ThreadCard key={t.id} thread={t} />) : <EmptyState text="まだスレッドがありません" />}
        </Section>

        <div className="grid lg:grid-cols-2 gap-6">
          <Section title="🆕 新着スレッド" to="/board" icon={Sparkles}>
            {loading ? <>{Array.from({ length: 3 }).map((_, i) => <ThreadSkeleton key={i} />)}</> :
              recent.length ? recent.slice(0, 5).map((t) => <ThreadCard key={t.id} thread={t} />) : <EmptyState text="まだスレッドがありません" />}
          </Section>
          <Section title="❤️ 人気スレッド" to="/board?sort=popular" icon={Heart}>
            {loading ? <>{Array.from({ length: 3 }).map((_, i) => <ThreadSkeleton key={i} />)}</> :
              popular.length ? popular.map((t) => <ThreadCard key={t.id} thread={t} />) : <EmptyState text="まだスレッドがありません" />}
          </Section>
        </div>

        {/* News */}
        <Section title="📰 最新ニュース" to="/news" icon={Newspaper}>
          {news.length ? news.map((n) => (
            <Link key={n.id} to={`/news/${n.id}`} className="flex gap-3 p-3 border-b border-border hover:bg-muted/40">
              {n.thumbnail && <img src={n.thumbnail} alt="" className="w-20 h-14 rounded-lg object-cover shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-mono text-muted-foreground">ニュース #{n.news_number}</div>
                <h4 className="font-medium text-sm line-clamp-2">{n.title}</h4>
                <div className="text-xs text-muted-foreground mt-0.5">{formatJST(n.published_date || n.created_date)} · 💬 {n.comment_count || 0}</div>
              </div>
            </Link>
          )) : <EmptyState text="まだニュースがありません" />}
        </Section>
      </main>
    </div>
  );
}

function Section({ title, to, icon: Icon, children }) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <h2 className="font-semibold text-sm flex items-center gap-1.5"><Icon className="w-4 h-4" /> {title}</h2>
        <Link to={to} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5">もっと見る <ChevronRight className="w-3 h-3" /></Link>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text }) {
  return <div className="p-8 text-center text-sm text-muted-foreground">{text}</div>;
}

function typeLabel(t) {
  return { normal: "通常", important: "重要", urgent: "緊急", maintenance: "メンテ", terms_change: "規約変更" }[t] || "お知らせ";
}

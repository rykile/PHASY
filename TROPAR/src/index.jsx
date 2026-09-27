import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  getSiteSettings,
  trendingScore,
  formatJST,
} from "@/lib/community";
import ThreadCard from "@/components/ThreadCard";
import { ThreadSkeleton } from "@/components/Skeleton";
import {
  Flame,
  Sparkles,
  Heart,
  Newspaper,
  Megaphone,
  ChevronRight,
} from "lucide-react";

export default function Home() {
  const [settings, setSettings] = useState(null);
  const [hot, setHot] = useState([]);
  const [recent, setRecent] = useState([]);
  const [popular, setPopular] = useState([]);
  const [news, setNews] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHomeData() {
      setLoading(true);
      setError(null);

      try {
        // サイト設定
        const siteSettings = await getSiteSettings();

        // 各種データを並列取得
        const [threads, newsList, announcementList, categoryList] =
          await Promise.all([
            base44.entities.Thread.filter(
              { is_deleted: false },
              "-created_date",
              60
            ),

            base44.entities.News.filter(
              {
                is_published: true,
                is_deleted: false,
              },
              "-published_date",
              5
            ),

            base44.entities.Announcement.filter(
              { is_active: true },
              "-created_date",
              3
            ),

            base44.entities.Category.filter(
              {
                is_hidden: false,
                kind: "board",
              },
              "sort_order",
              50
            ),
          ]);

        // ページを離れていた場合はStateを更新しない
        if (cancelled) return;

        // 表示可能なスレッドだけに絞り込む
        const visibleThreads = (threads || []).filter(
          (thread) =>
            thread.status !== "hidden" &&
            !thread.is_hidden_auto
        );

        // 急上昇
        const sortedHot = [...visibleThreads]
          .sort(
            (a, b) => trendingScore(b) - trendingScore(a)
          )
          .slice(0, 5);

        // 新着
        const sortedRecent = visibleThreads.slice(0, 8);

        // 人気
        const sortedPopular = [...visibleThreads]
          .sort(
            (a, b) =>
              (b.like_count || 0) - (a.like_count || 0)
          )
          .slice(0, 5);

        // Stateへ反映
        setSettings(siteSettings);
        setHot(sortedHot);
        setRecent(sortedRecent);
        setPopular(sortedPopular);
        setNews(newsList || []);
        setAnnouncements(announcementList || []);
        setCategories(categoryList || []);
      } catch (e) {
        console.error("TROPAR Home data loading error:", e);

        if (!cancelled) {
          setError(
            "データの読み込みに失敗しました。時間をおいて再度お試しください。"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHomeData();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="lg:flex lg:gap-6 w-full">
      {/* Sidebar categories */}
      <aside className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-28">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            カテゴリー
          </h3>

          <div className="space-y-0.5">
            <Link
              to="/board"
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm hover:bg-muted font-medium"
            >
              <Sparkles className="w-4 h-4 text-orange-500" />
              すべて
            </Link>

            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/board?cat=${category.slug}`}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm hover:bg-muted"
              >
                <span>{category.icon || "📂"}</span>
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 space-y-6">
        {/* Hero */}
        <div
          className="rounded-2xl p-6 text-white"
          style={{
            background:
              "linear-gradient(135deg,#ea580c,#f97316)",
          }}
        >
          <h1 className="text-2xl font-bold mb-1">
            {settings?.catchphrase ||
              "掲示板 × SNS × ニュース × コミュニティ"}
          </h1>

          <p className="text-white/90 text-sm">
            {settings?.site_description ||
              "みんなで語り合う、日本語コミュニティサービス。"}
          </p>

          <div className="flex gap-2 mt-4">
            <Link
              to="/board"
              className="px-4 py-2 rounded-lg bg-white text-orange-600 text-sm font-medium hover:bg-white/90"
            >
              {settings?.board_name || "掲示板"}へ
            </Link>

            <Link
              to="/news"
              className="px-4 py-2 rounded-lg bg-white/20 text-white text-sm font-medium hover:bg-white/30"
            >
              {settings?.news_name || "ニュース"}
            </Link>
          </div>
        </div>

        {/* Error */}
        {error && (
          <section className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </section>
        )}

        {/* Announcements */}
        {announcements.length > 0 && (
          <section className="rounded-xl border border-border bg-card overflow-hidden">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="flex items-start gap-3 p-3 border-b border-border last:border-0"
              >
                <Megaphone className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
                      {typeLabel(announcement.type)}
                    </span>

                    <span className="text-sm font-medium">
                      {announcement.title}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {announcement.body}
                  </p>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Hot threads */}
        <Section
          title="🔥 急上昇スレッド"
          to="/board?sort=hot"
          icon={Flame}
        >
          {loading ? (
            <>
              {Array.from({ length: 3 }).map((_, index) => (
                <ThreadSkeleton key={index} />
              ))}
            </>
          ) : hot.length > 0 ? (
            hot.map((thread) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
              />
            ))
          ) : (
            <EmptyState text="まだスレッドがありません" />
          )}
        </Section>

        {/* Recent / Popular */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Section
            title="🆕 新着スレッド"
            to="/board"
            icon={Sparkles}
          >
            {loading ? (
              <>
                {Array.from({ length: 3 }).map((_, index) => (
                  <ThreadSkeleton key={index} />
                ))}
              </>
            ) : recent.length > 0 ? (
              recent
                .slice(0, 5)
                .map((thread) => (
                  <ThreadCard
                    key={thread.id}
                    thread={thread}
                  />
                ))
            ) : (
              <EmptyState text="まだスレッドがありません" />
            )}
          </Section>

          <Section
            title="❤️ 人気スレッド"
            to="/board?sort=popular"
            icon={Heart}
          >
            {loading ? (
              <>
                {Array.from({ length: 3 }).map((_, index) => (
                  <ThreadSkeleton key={index} />
                ))}
              </>
            ) : popular.length > 0 ? (
              popular.map((thread) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                />
              ))
            ) : (
              <EmptyState text="まだスレッドがありません" />
            )}
          </Section>
        </div>

        {/* News */}
        <Section
          title="📰 最新ニュース"
          to="/news"
          icon={Newspaper}
        >
          {news.length > 0 ? (
            news.map((item) => (
              <Link
                key={item.id}
                to={`/news/${item.id}`}
                className="flex gap-3 p-3 border-b border-border hover:bg-muted/40"
              >
                {item.thumbnail && (
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="w-20 h-14 rounded-lg object-cover shrink-0"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-mono text-muted-foreground">
                    ニュース #{item.news_number}
                  </div>

                  <h4 className="font-medium text-sm line-clamp-2">
                    {item.title}
                  </h4>

                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatJST(
                      item.published_date ||
                        item.created_date
                    )}
                    {" · "}
                    💬 {item.comment_count || 0}
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <EmptyState text="まだニュースがありません" />
          )}
        </Section>
      </main>
    </div>
  );
}

/**
 * 共通セクション
 */
function Section({
  title,
  to,
  icon: Icon,
  children,
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <h2 className="font-semibold text-sm flex items-center gap-1.5">
          <Icon className="w-4 h-4" />
          {title}
        </h2>

        <Link
          to={to}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
        >
          もっと見る
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {children}
    </section>
  );
}

/**
 * データが存在しない場合
 */
function EmptyState({ text }) {
  return (
    <div className="p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

/**
 * お知らせ種別の表示名
 */
function typeLabel(type) {
  return (
    {
      normal: "通常",
      important: "重要",
      urgent: "緊急",
      maintenance: "メンテ",
      terms_change: "規約変更",
    }[type] || "お知らせ"
  );
}

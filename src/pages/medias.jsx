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
  const [error, setError] = useState(null);

  // ニュースカテゴリー取得
  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const list = await base44.entities.Category.filter(
          {
            is_hidden: false,
            kind: "news",
          },
          "sort_order",
          50
        );

        if (!cancelled) {
          setCategories(list || []);
        }
      } catch (e) {
        console.error(
          "TROPAR News category loading error:",
          e
        );

        if (!cancelled) {
          setCategories([]);
        }
      }
    }

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  // ニュース取得
  useEffect(() => {
    let cancelled = false;

    async function loadNews() {
      setLoading(true);
      setError(null);

      try {
        const list = await base44.entities.News.filter(
          {
            is_published: true,
            is_deleted: false,
          },
          "-published_date",
          100
        );

        if (cancelled) return;

        let visibleNews = list || [];

        // カテゴリーで絞り込み
        if (cat) {
          visibleNews = visibleNews.filter(
            (item) => item.category_name === cat
          );
        }

        setNews(visibleNews);
      } catch (e) {
        console.error(
          "TROPAR News loading error:",
          e
        );

        if (!cancelled) {
          setNews([]);
          setError(
            "ニュースの読み込みに失敗しました。時間をおいて再度お試しください。"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadNews();

    return () => {
      cancelled = true;
    };
  }, [cat]);

  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-orange-500" />
          <h1 className="font-bold">ニュース</h1>
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 px-3 py-2 border-b border-border overflow-x-auto">
          <Chip
            active={!cat}
            onClick={() => setCat("")}
          >
            すべて
          </Chip>

          {categories.map((category) => (
            <Chip
              key={category.id}
              active={cat === category.name}
              onClick={() => setCat(category.name)}
            >
              {category.icon} {category.name}
            </Chip>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 border-b border-border bg-red-50">
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* News list */}
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-20 m-3"
            />
          ))
        ) : news.length > 0 ? (
          news.map((item) => (
            <Link
              key={item.id}
              to={`/news/${item.id}`}
              className="flex gap-3 p-4 border-b border-border hover:bg-muted/40"
            >
              {item.thumbnail && (
                <img
                  src={item.thumbnail}
                  alt=""
                  className="w-24 h-16 rounded-lg object-cover shrink-0"
                />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    ニュース #{item.news_number}
                  </span>

                  {item.category_name && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {item.category_name}
                    </span>
                  )}

                  {item.is_official && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      公式
                    </span>
                  )}
                </div>

                <h3 className="font-medium text-sm line-clamp-2">
                  {item.title}
                </h3>

                <div className="text-xs text-muted-foreground mt-1">
                  {formatJST(
                    item.published_date ||
                      item.created_date
                  )}
                  {" · "}
                  💬 {item.comment_count || 0}
                  {" · "}
                  👁 {item.view_count || 0}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="p-12 text-center text-sm text-muted-foreground">
            ニュースがありません
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-full text-xs whitespace-nowrap border",
        active
          ? "bg-foreground text-background border-foreground"
          : "border-border text-muted-foreground"
      )}
    >
      {children}
    </button>
  );
}

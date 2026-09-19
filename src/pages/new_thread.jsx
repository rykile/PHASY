import React, { useEffect, useState } from "react";
import {
  useNavigate,
  useSearchParams,
  Link,
} from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMember } from "@/lib/MemberContext";
import { nextThreadNumber } from "@/lib/community";
import {
  getNgWords,
  checkNgWords,
} from "@/lib/admin";
import RichTextEditor from "@/components/RichTextEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Loader2,
} from "lucide-react";

export default function NewThread() {
  const [, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { member } = useMember();

  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] =
    useState(true);
  const [error, setError] = useState("");

  // カテゴリー取得
  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      setCategoriesLoading(true);

      try {
        const list =
          await base44.entities.Category.filter(
            {
              is_hidden: false,
              kind: "board",
            },
            "sort_order",
            50
          );

        if (!cancelled) {
          setCategories(list || []);
        }
      } catch (e) {
        console.error(
          "TROPAR category loading error:",
          e
        );

        if (!cancelled) {
          setCategories([]);
          setError(
            "カテゴリーの読み込みに失敗しました。"
          );
        }
      } finally {
        if (!cancelled) {
          setCategoriesLoading(false);
        }
      }
    }

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError("");

    // メンバー確認
    if (!member) {
      setError(
        "プロフィール設定を完了してください"
      );
      return;
    }

    // タイトル確認
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError("タイトルを入力してください");
      return;
    }

    // 本文確認
    const trimmedBody = body.trim();

    if (
      !trimmedBody ||
      trimmedBody === "<p><br></p>"
    ) {
      setError("本文を入力してください");
      return;
    }

    // カテゴリー確認
    if (!categoryId) {
      setError("カテゴリーを選択してください");
      return;
    }

    // NGワード確認
    try {
      const ngWords = await getNgWords();

      const checkResult = checkNgWords(
        `${trimmedTitle} ${trimmedBody}`,
        ngWords
      );

      if (!checkResult.ok) {
        setError(
          `NGワードが含まれています: ${checkResult.hits.join(
            ", "
          )}`
        );
        return;
      }
    } catch (e) {
      console.error(
        "TROPAR NG word check error:",
        e
      );

      setError(
        "投稿内容の確認に失敗しました。もう一度お試しください。"
      );
      return;
    }

    setLoading(true);

    try {
      const category = categories.find(
        (item) => item.id === categoryId
      );

      const threadNumber =
        await nextThreadNumber();

      const normalizedTags = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const thread =
        await base44.entities.Thread.create({
          thread_number: threadNumber,
          title: trimmedTitle,
          body: body,
          category_id: categoryId,
          category_name: category?.name || "",

          author_id: member.id,
          author_name: member.display_name,
          author_icon: member.icon_url,

          author_badge: member.is_official
            ? member.official_badge
            : "",

          status: "normal",
          tags: normalizedTags,

          view_count: 0,
          like_count: 0,
          comment_count: 0,

          is_deleted: false,
          report_count: 0,
          is_hidden_auto: false,
        });

      // 投稿数を更新
      await base44.entities.Member.update(
        member.id,
        {
          post_count:
            (member.post_count || 0) + 1,
        }
      );

      // 作成したスレッドへ移動
      navigate(`/thread/${thread.id}`);
    } catch (err) {
      console.error(
        "TROPAR thread creation error:",
        err
      );

      setError(
        err?.message ||
          "スレッドの作成に失敗しました。もう一度お試しください。"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      {/* 戻る */}
      <Link
        to="/board"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="w-4 h-4" />
        掲示板に戻る
      </Link>

      <div className="rounded-xl border border-border bg-card p-5">
        <h1 className="text-lg font-bold mb-4">
          新しいスレッドを作成
        </h1>

        {/* エラー */}
        {error && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
          >
            {error}
          </div>
        )}

        <form
          onSubmit={submit}
          className="space-y-4"
        >
          {/* カテゴリー */}
          <div className="space-y-1.5">
            <Label>カテゴリー</Label>

            {categoriesLoading ? (
              <p className="text-sm text-muted-foreground">
                カテゴリーを読み込んでいます...
              </p>
            ) : categories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    type="button"
                    key={category.id}
                    onClick={() =>
                      setCategoryId(category.id)
                    }
                    className={
                      "px-3 py-1.5 rounded-lg text-sm border " +
                      (categoryId === category.id
                        ? "bg-orange-600 text-white border-orange-600"
                        : "border-border hover:bg-muted")
                    }
                  >
                    {category.icon}{" "}
                    {category.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                選択できるカテゴリーがありません。
              </p>
            )}
          </div>

          {/* タイトル */}
          <div className="space-y-1.5">
            <Label htmlFor="title">
              タイトル
            </Label>

            <Input
              id="title"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              maxLength={100}
              placeholder="スレッドのタイトル"
              disabled={loading}
            />
          </div>

          {/* 本文 */}
          <div className="space-y-1.5">
            <Label>本文</Label>

            <RichTextEditor
              value={body}
              onChange={setBody}
              minHeight={200}
              placeholder="スレッドの本文を入力..."
            />
          </div>

          {/* タグ */}
          <div className="space-y-1.5">
            <Label htmlFor="tags">
              タグ（カンマ区切り、任意）
            </Label>

            <Input
              id="tags"
              value={tags}
              onChange={(e) =>
                setTags(e.target.value)
              }
              placeholder="初心者, 質問"
              disabled={loading}
            />
          </div>

          {/* 作成 */}
          <Button
            type="submit"
            className="w-full h-11"
            disabled={
              loading || categoriesLoading
            }
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                作成中...
              </>
            ) : (
              "スレッドを作成"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

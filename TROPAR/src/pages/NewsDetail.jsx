import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMember } from "@/lib/MemberContext";
import { formatJST, nextNewsCommentNumber, nextThreadNumber, softDelete, canDeleteContent } from "@/lib/community";
import DeleteDialog from "@/components/DeleteDialog";
import ShareButton from "@/components/ShareButton";
import RichTextEditor from "@/components/RichTextEditor";
import CommentItem from "@/components/CommentItem";
import ReportDialog from "@/components/ReportDialog";
import { CommentSkeleton, Skeleton } from "@/components/Skeleton";
import { ArrowLeft, Eye, MessageSquare, Send, Loader2, MessageCirclePlus, Trash2 } from "lucide-react";

export default function NewsDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { member } = useMember();
  const [news, setNews] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const n = await base44.entities.News.get(id);
        setNews(n);
        if (n && !n.is_deleted) base44.entities.News.update(id, { view_count: (n.view_count || 0) + 1 });
        const cs = await base44.entities.NewsComment.filter({ news_id: id }, "comment_number", 500);
        setComments(cs || []);
      } catch (e) {}
      setLoading(false);
    })();
  }, [id]);

  const postComment = async () => {
    if (!member) { navigate("/login"); return; }
    if (!body.trim() || body.trim() === "<p><br></p>") return;
    setPosting(true);
    try {
      const num = await nextNewsCommentNumber(id);
      const c = await base44.entities.NewsComment.create({
        news_id: id, comment_number: num, body,
        author_id: member.id, author_name: member.display_name, author_icon: member.icon_url,
        author_badge: member.is_official ? member.official_badge : "",
        like_count: 0, is_deleted: false, report_count: 0,
      });
      setComments((p) => [...p, c]);
      setBody("");
      await base44.entities.News.update(id, { comment_count: (news.comment_count || 0) + 1 });
      setNews((p) => ({ ...p, comment_count: (p.comment_count || 0) + 1 }));
    } catch (e) {}
    setPosting(false);
  };

  const createThreadFromNews = async () => {
    if (!member) { navigate("/login"); return; }
    const num = await nextThreadNumber();
    const t = await base44.entities.Thread.create({
      thread_number: num,
      title: `【ニュース#${news.news_number}】${news.title}`,
      body: `<p>📰 関連ニュース: <a href="/news/${news.id}">ニュース #${news.news_number}</a></p><p>${news.body}</p>`,
      category_id: "", category_name: "ニュース",
      author_id: member.id, author_name: member.display_name, author_icon: member.icon_url,
      author_badge: member.is_official ? member.official_badge : "",
      status: "normal", tags: ["ニュース"], related_news_id: news.id, related_news_number: news.news_number,
      view_count: 0, like_count: 0, comment_count: 0, is_deleted: false, report_count: 0, is_hidden_auto: false,
    });
    navigate(`/thread/${t.id}`);
  };

  const submitReport = async (reason, detail) => {
    if (!member || !reportTarget) return;
    await base44.entities.Report.create({ reporter_id: member.id, target_type: reportTarget.id === news.id ? "news" : "news_comment", target_id: reportTarget.id, reason, detail, status: "received" });
  };

  const confirmDelete = async (reason) => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await softDelete(deleteTarget.id === news.id ? "news" : "news_comment", deleteTarget.id, member, reason);
      if (deleteTarget.id === news.id) { setNews((p) => ({ ...p, is_deleted: true })); }
      else { setComments((prev) => prev.map((x) => x.id === deleteTarget.id ? { ...x, is_deleted: true } : x)); }
      setDeleteTarget(null);
    } catch (e) {}
    setDeleteBusy(false);
  };

  if (loading) return <div className="max-w-3xl mx-auto"><Skeleton className="h-40 rounded-xl" /></div>;
  if (!news) return <div className="p-12 text-center text-muted-foreground">ニュースが見つかりません。</div>;
  if (news.is_deleted) return <div className="p-12 text-center text-muted-foreground">このニュースは削除されています。</div>;

  return (
    <div className="max-w-3xl mx-auto w-full">
      <Link to="/news" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"><ArrowLeft className="w-4 h-4" /> ニュース一覧に戻る</Link>
      <article className="rounded-xl border border-border bg-card overflow-hidden">
        {news.thumbnail && <img src={news.thumbnail} alt="" className="w-full h-48 object-cover" />}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">ニュース #{news.news_number}</span>
            {news.category_name && <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{news.category_name}</span>}
            {news.is_official && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">公式</span>}
          </div>
          <h1 className="text-xl font-bold mb-2">{news.title}</h1>
          <div className="text-xs text-muted-foreground mb-3">{formatJST(news.published_date || news.created_date)} · {news.author_name || "運営"}</div>
          <div className="prose prose-sm max-w-none dark:prose-invert rte-body" dangerouslySetInnerHTML={{ __html: news.body }} />
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {news.view_count || 0}</span>
            <span className="flex items-center gap-1"><MessageSquare className="w-4 h-4" /> {news.comment_count || 0}</span>
            <div className="ml-auto flex items-center gap-3">
              <ShareButton url={`/news/${id}`} title={news.title} number={news.news_number} />
              {canDeleteContent(news, member) && (
                <button onClick={() => setDeleteTarget(news)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /> 削除</button>
              )}
              <button onClick={createThreadFromNews} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-medium hover:bg-orange-700">
                <MessageCirclePlus className="w-4 h-4" /> この記事についてスレッドを作る
              </button>
            </div>
          </div>
        </div>
      </article>

      <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b border-border text-sm font-semibold">コメント</div>
        {comments.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">まだコメントがありません</div> :
          comments.map((c) => <CommentItem key={c.id} comment={c} threadId={id} liked={false} onLike={() => {}} onReply={() => {}} onReport={(cm) => { setReportTarget(cm); setReportOpen(true); }} canDelete={canDeleteContent(c, member)} onDelete={setDeleteTarget} />)}
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <RichTextEditor value={body} onChange={setBody} minHeight={100} placeholder="コメントを入力..." />
        <div className="flex justify-end mt-2">
          <button onClick={postComment} disabled={posting || !body.trim() || body.trim() === "<p><br></p>"} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
            {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} 投稿
          </button>
        </div>
      </div>
      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} onSubmit={submitReport} />
      <DeleteDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} busy={deleteBusy}
        title={deleteTarget && news && deleteTarget.id === news.id ? "このニュースを削除しますか？" : "このコメントを削除しますか？"} />
    </div>
  );
}

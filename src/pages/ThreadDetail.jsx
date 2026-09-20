import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMember } from "@/lib/MemberContext";
import { formatJST, nextCommentNumber, softDelete, canDeleteContent } from "@/lib/community";
import DeleteDialog from "@/components/DeleteDialog";
import ShareButton from "@/components/ShareButton";
import RichTextEditor from "@/components/RichTextEditor";
import CommentItem from "@/components/CommentItem";
import ReportDialog from "@/components/ReportDialog";
import Badge, { StatusBadge } from "@/components/Badge";
import { CommentSkeleton, Skeleton } from "@/components/Skeleton";
import { ArrowLeft, Eye, Heart, MessageSquare, Bookmark, Flag, Send, Loader2, Search, ChevronLeft, ChevronRight, Pin, Lock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ThreadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { member } = useMember();
  const [thread, setThread] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [posting, setPosting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [reactions, setReactions] = useState({}); // commentId -> liked
  const [threadSearch, setThreadSearch] = useState("");
  const [highlightNo, setHighlightNo] = useState(null);
  const editorRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const t = await base44.entities.Thread.get(id);
        setThread(t);
        if (t && !t.is_deleted && t.status !== "hidden") {
          base44.entities.Thread.update(id, { view_count: (t.view_count || 0) + 1 });
        }
        const cs = await base44.entities.Comment.filter({ thread_id: id }, "comment_number", 500);
        setComments(cs || []);
        if (member?.id) {
          const [likes, sv] = await Promise.all([
            base44.entities.Reaction.filter({ user_id: member.id, target_type: "thread", target_id: id }, "-created_date", 1),
            base44.entities.SavedThread.filter({ member_id: member.id, thread_id: id }, "-created_date", 1),
          ]);
          setLiked(likes && likes.length > 0);
          setSaved(sv && sv.length > 0);
          const cLikes = await base44.entities.Reaction.filter({ user_id: member.id, target_type: "comment" }, "-created_date", 200);
          const map = {};
          (cLikes || []).forEach((r) => { map[r.target_id] = true; });
          setReactions(map);
        }
      } catch (e) {}
      setLoading(false);
    })();
    // eslint-disable-next-line
  }, [id, member?.id]);

  // Jump to #no-NN from URL hash
  useEffect(() => {
    const hash = window.location.hash;
    const m = hash && hash.match(/no-(\d+)/);
    if (m && !loading) {
      setHighlightNo(Number(m[1]));
      const el = document.getElementById(`no-${m[1]}`);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    }
  }, [loading]);

  const postComment = async () => {
    if (!member) { navigate("/login"); return; }
    if (!body.trim() || body.trim() === "<p><br></p>") return;
    if (thread.status === "locked") return;
    setPosting(true);
    try {
      const num = await nextCommentNumber(id);
      const c = await base44.entities.Comment.create({
        thread_id: id,
        comment_number: num,
        body,
        author_id: member.id,
        author_name: member.display_name,
        author_icon: member.icon_url,
        author_badge: member.is_official ? member.official_badge : "",
        parent_comment_number: replyTo ? replyTo.comment_number : null,
        like_count: 0, is_deleted: false, report_count: 0, is_hidden_auto: false, edit_count: 0,
      });
      setComments((prev) => [...prev, c]);
      setBody("");
      setReplyTo(null);
      await base44.entities.Thread.update(id, { comment_count: (thread.comment_count || 0) + 1, updated_date: new Date().toISOString() });
      setThread((prev) => ({ ...prev, comment_count: (prev.comment_count || 0) + 1 }));
      // notify thread author & parent comment author
      if (thread.author_id && thread.author_id !== member.id) {
        await base44.entities.Notification.create({ user_id: thread.author_id, type: "reply", title: `あなたのスレッドに返信がありました`, body: `「${thread.title}」No.${num}`, link: `/thread/${id}#no-${num}`, is_read: false });
      }
      if (replyTo) {
        const parent = comments.find((c) => c.comment_number === replyTo.comment_number);
        if (parent && parent.author_id && parent.author_id !== member.id) {
          await base44.entities.Notification.create({ user_id: parent.author_id, type: "reply", title: `あなたのコメントに返信がありました`, body: `「${thread.title}」No.${num} → No.${parent.comment_number}`, link: `/thread/${id}#no-${num}`, is_read: false });
        }
      }
      setTimeout(() => {
        const el = document.getElementById(`no-${num}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    } catch (e) {}
    setPosting(false);
  };

  const toggleLikeThread = async () => {
    if (!member) { navigate("/login"); return; }
    if (liked) {
      await base44.entities.Reaction.deleteMany({ user_id: member.id, target_type: "thread", target_id: id, kind: "like" });
      setLiked(false);
      setThread((p) => ({ ...p, like_count: Math.max(0, (p.like_count || 0) - 1) }));
      await base44.entities.Thread.update(id, { like_count: Math.max(0, (thread.like_count || 0) - 1) });
    } else {
      await base44.entities.Reaction.create({ user_id: member.id, target_type: "thread", target_id: id, kind: "like" });
      setLiked(true);
      setThread((p) => ({ ...p, like_count: (p.like_count || 0) + 1 }));
      await base44.entities.Thread.update(id, { like_count: (thread.like_count || 0) + 1 });
      if (thread.author_id && thread.author_id !== member.id) {
        await base44.entities.Notification.create({ user_id: thread.author_id, type: "like", title: `あなたのスレッドがいいねされました`, body: `「${thread.title}」`, link: `/thread/${id}`, is_read: false });
      }
    }
  };

  const toggleLikeComment = async (c) => {
    if (!member) { navigate("/login"); return; }
    if (reactions[c.id]) {
      await base44.entities.Reaction.deleteMany({ user_id: member.id, target_type: "comment", target_id: c.id, kind: "like" });
      setReactions((p) => ({ ...p, [c.id]: false }));
      setComments((prev) => prev.map((x) => x.id === c.id ? { ...x, like_count: Math.max(0, (x.like_count || 0) - 1) } : x));
      await base44.entities.Comment.update(c.id, { like_count: Math.max(0, (c.like_count || 0) - 1) });
    } else {
      await base44.entities.Reaction.create({ user_id: member.id, target_type: "comment", target_id: c.id, kind: "like" });
      setReactions((p) => ({ ...p, [c.id]: true }));
      setComments((prev) => prev.map((x) => x.id === c.id ? { ...x, like_count: (x.like_count || 0) + 1 } : x));
      await base44.entities.Comment.update(c.id, { like_count: (c.like_count || 0) + 1 });
      if (c.author_id && c.author_id !== member.id) {
        await base44.entities.Notification.create({ user_id: c.author_id, type: "like", title: `あなたのコメントがいいねされました`, body: `「${thread.title}」No.${c.comment_number}`, link: `/thread/${id}#no-${c.comment_number}`, is_read: false });
      }
    }
  };

  const toggleSave = async () => {
    if (!member) { navigate("/login"); return; }
    if (saved) {
      await base44.entities.SavedThread.deleteMany({ member_id: member.id, thread_id: id });
      setSaved(false);
    } else {
      await base44.entities.SavedThread.create({ member_id: member.id, thread_id: id });
      setSaved(true);
    }
  };

  const confirmDelete = async (reason) => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await softDelete(deleteTarget.id === thread.id ? "thread" : "comment", deleteTarget.id, member, reason);
      if (deleteTarget.id === thread.id) { setThread((p) => ({ ...p, is_deleted: true })); }
      else { setComments((prev) => prev.map((x) => x.id === deleteTarget.id ? { ...x, is_deleted: true } : x)); }
      setDeleteTarget(null);
    } catch (e) {}
    setDeleteBusy(false);
  };

  const openReport = (target) => { setReportTarget(target); setReportOpen(true); };
  const submitReport = async (reason, detail) => {
    if (!member || !reportTarget) return;
    const isThread = reportTarget.id === thread.id;
    await base44.entities.Report.create({
      reporter_id: member.id,
      target_type: isThread ? "thread" : "comment",
      target_id: reportTarget.id,
      reason, detail, status: "received",
    });
    // auto-hide rule: comments 5, threads 10
    const threshold = isThread ? 10 : 5;
    const newCount = (reportTarget.report_count || 0) + 1;
    if (newCount >= threshold) {
      if (isThread) { await base44.entities.Thread.update(thread.id, { report_count: newCount, is_hidden_auto: true, status: "hidden" }); setThread((p) => ({ ...p, report_count: newCount, is_hidden_auto: true, status: "hidden" })); }
      else { await base44.entities.Comment.update(reportTarget.id, { report_count: newCount, is_hidden_auto: true }); setComments((prev) => prev.map((x) => x.id === reportTarget.id ? { ...x, report_count: newCount, is_hidden_auto: true } : x)); }
    } else {
      if (isThread) { await base44.entities.Thread.update(thread.id, { report_count: newCount }); setThread((p) => ({ ...p, report_count: newCount })); }
      else { await base44.entities.Comment.update(reportTarget.id, { report_count: newCount }); setComments((prev) => prev.map((x) => x.id === reportTarget.id ? { ...x, report_count: newCount } : x)); }
    }
  };

  const filteredComments = threadSearch
    ? comments.filter((c) => (c.body || "").toLowerCase().includes(threadSearch.toLowerCase()) || (c.author_name || "").toLowerCase().includes(threadSearch.toLowerCase()) || String(c.comment_number).includes(threadSearch))
    : comments;

  if (loading) return <div className="max-w-3xl mx-auto">{Array.from({ length: 5 }).map((_, i) => <CommentSkeleton key={i} />)}</div>;
  if (!thread) return <div className="p-12 text-center text-muted-foreground">このスレッドは存在しないか、削除されています。</div>;
  if (thread.is_deleted) return <div className="p-12 text-center text-muted-foreground">このスレッドは削除されています。</div>;
  if (thread.status === "hidden" && thread.is_hidden_auto) return (
    <div className="p-12 text-center text-muted-foreground">
      このスレッドは通報件数により自動非表示になっています。<br />管理者の確認をお待ちください。
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto w-full">
      <Link to="/board" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"><ArrowLeft className="w-4 h-4" /> 掲示板に戻る</Link>

      {/* Thread header */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-xs font-mono text-muted-foreground">スレッド #{thread.thread_number}</span>
            {thread.status === "pinned" && <span className="text-xs text-amber-600 flex items-center gap-0.5"><Pin className="w-3 h-3" /> 固定</span>}
            <StatusBadge status={thread.status} />
            <Link to={`/board?cat=${encodeURIComponent(thread.category_name)}`} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:bg-muted/70">{thread.category_name}</Link>
            {thread.related_news_number && <Link to={`/news/${thread.related_news_id}`} className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">📰 関連ニュース: #{thread.related_news_number}</Link>}
          </div>
          <h1 className="text-xl font-bold mb-2">{thread.title}</h1>
          <div className="flex items-center gap-2 text-sm">
            {thread.author_icon ? <img src={thread.author_icon} alt="" className="w-6 h-6 rounded-full" /> : <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">{(thread.author_name || "?").charAt(0)}</span>}
            <Link to={`/u/${thread.author_name}`} className="font-medium hover:underline">{thread.author_name}</Link>
            {thread.author_badge && <Badge badge={thread.author_badge} />}
            <span className="text-muted-foreground text-xs">{formatJST(thread.created_date)}</span>
          </div>
        </div>
        <div className="p-4 prose prose-sm max-w-none dark:prose-invert rte-body" dangerouslySetInnerHTML={{ __html: thread.body }} />
        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-sm">
          <button onClick={toggleLikeThread} className={cn("flex items-center gap-1.5", liked ? "text-red-500" : "text-muted-foreground hover:text-red-500")}>
            <Heart className={cn("w-4 h-4", liked && "fill-current")} /> {thread.like_count || 0}
          </button>
          <span className="flex items-center gap-1.5 text-muted-foreground"><MessageSquare className="w-4 h-4" /> {thread.comment_count || 0}</span>
          <span className="flex items-center gap-1.5 text-muted-foreground"><Eye className="w-4 h-4" /> {thread.view_count || 0}</span>
          <button onClick={toggleSave} className={cn("flex items-center gap-1.5 ml-auto", saved ? "text-orange-500" : "text-muted-foreground hover:text-foreground")}>
            <Bookmark className={cn("w-4 h-4", saved && "fill-current")} /> 保存
          </button>
          <button onClick={() => openReport(thread)} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"><Flag className="w-4 h-4" /> 通報</button>
          <ShareButton url={`/thread/${id}`} title={thread.title} number={thread.thread_number} />
          {canDeleteContent(thread, member) && (
            <button onClick={() => setDeleteTarget(thread)} className="flex items-center gap-1.5 text-muted-foreground hover:text-red-500"><Trash2 className="w-4 h-4" /> 削除</button>
          )}
        </div>
      </div>

      {/* Thread search */}
      <div className="mt-4 mb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={threadSearch} onChange={(e) => setThreadSearch(e.target.value)} placeholder="このスレッドを検索（本文・投稿者・No.）" className="w-full h-9 pl-9 pr-3 rounded-lg bg-card border border-border text-sm outline-none" />
        </div>
      </div>

      {/* Comments */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {filteredComments.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">{threadSearch ? "該当するコメントがありません" : "まだコメントがありません。最初のコメントを投稿しましょう。"}</div> :
          filteredComments.map((c) => (
            <CommentItem key={c.id} comment={c} threadId={id} highlight={highlightNo === c.comment_number}
              liked={reactions[c.id]} onLike={toggleLikeComment} onReply={(cm) => { setReplyTo(cm); editorRef.current?.scrollIntoView({ behavior: "smooth" }); }}
              onReport={openReport} canDelete={canDeleteContent(c, member)} onDelete={setDeleteTarget} />
          ))}
      </div>

      {/* Reply indicator */}
      {thread.status === "locked" ? (
        <div className="mt-4 p-4 rounded-xl border border-border bg-muted/30 text-center text-sm text-muted-foreground flex items-center justify-center gap-2"><Lock className="w-4 h-4" /> このスレッドはロックされています</div>
      ) : (
        <div ref={editorRef} className="mt-4 rounded-xl border border-border bg-card p-4">
          {replyTo && (
            <div className="flex items-center justify-between mb-2 text-sm bg-muted/50 px-3 py-1.5 rounded-lg">
              <span>No.{replyTo.comment_number} へ返信中</span>
              <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
          )}
          <RichTextEditor value={body} onChange={setBody} minHeight={120} placeholder="コメントを入力... (&gt;&gt;番号 で返信できます)" />
          <div className="flex justify-end mt-2">
            <button onClick={postComment} disabled={posting || !body.trim() || body.trim() === "<p><br></p>"} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} 投稿
            </button>
          </div>
        </div>
      )}

      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} onSubmit={submitReport} />
      <DeleteDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} busy={deleteBusy}
        title={deleteTarget && thread && deleteTarget.id === thread.id ? "このスレッドを削除しますか？" : "このコメントを削除しますか？"} />
    </div>
  );
}

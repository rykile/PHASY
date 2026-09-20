import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMember } from "@/lib/MemberContext";
import ThreadCard from "@/components/ThreadCard";
import DeleteDialog from "@/components/DeleteDialog";
import { softDelete, formatJST } from "@/lib/community";
import { ThreadSkeleton, Skeleton } from "@/components/Skeleton";
import { Bookmark, History, Users, Settings, Shield, FileText, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MyPage() {
  const { member } = useMember();
  const [tab, setTab] = useState("saved");
  const [saved, setSaved] = useState(null);
  const [history, setHistory] = useState(null);
  const [following, setFollowing] = useState(null);

  useEffect(() => {
    if (!member) return;
    base44.entities.SavedThread.filter({ member_id: member.id }, "-created_date", 50).then(async (sv) => {
      const ids = (sv || []).map((s) => s.thread_id);
      if (!ids.length) { setSaved([]); return; }
      const threads = await base44.entities.Thread.filter({ is_deleted: false }, "-created_date", 200);
      setSaved((threads || []).filter((t) => ids.includes(t.id) && t.status !== "hidden"));
    }).catch(() => setSaved([]));
    base44.entities.ViewHistory.filter({ member_id: member.id }, "-created_date", 50).then(async (vh) => {
      const ids = (vh || []).filter((v) => v.kind === "thread").map((v) => v.thread_id);
      if (!ids.length) { setHistory([]); return; }
      const threads = await base44.entities.Thread.filter({ is_deleted: false }, "-created_date", 200);
      const seen = new Set();
      setHistory((threads || []).filter((t) => ids.includes(t.id) && t.status !== "hidden").filter((t) => seen.has(t.id) ? false : (seen.add(t.id), true)).slice(0, 20));
    }).catch(() => setHistory([]));
    base44.entities.Follow.filter({ follower_id: member.id, kind: "user" }, "-created_date", 50).then(async (fl) => {
      const ids = (fl || []).map((f) => f.followee_id);
      if (!ids.length) { setFollowing([]); return; }
      const members = await base44.entities.Member.list("-created_date", 200);
      setFollowing((members || []).filter((m) => ids.includes(m.id)));
    }).catch(() => setFollowing([]));
  }, [member]);

  if (!member) return <div className="max-w-3xl mx-auto"><Skeleton className="h-40 rounded-xl" /></div>;

  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="rounded-xl border border-border bg-card p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-muted">
            {member.icon_url ? <img src={member.icon_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl font-bold">{(member.display_name || "?").charAt(0)}</div>}
          </div>
          <div className="flex-1">
            <div className="font-bold">{member.display_name} <span className="text-sm text-muted-foreground font-normal">@{member.username}</span></div>
            <div className="text-xs text-muted-foreground">投稿 {member.post_count || 0} · コメント {member.comment_count || 0} · いいね {member.like_count || 0}</div>
          </div>
          <Link to="/mypage/settings" className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted flex items-center gap-1"><Settings className="w-4 h-4" /> 設定</Link>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <Shield className="w-4 h-4 text-green-500" />
          <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs">🟢 アカウント状態：正常</span>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        <Tab active={tab === "saved"} onClick={() => setTab("saved")} icon={Bookmark}>保存済み</Tab>
        <Tab active={tab === "history"} onClick={() => setTab("history")} icon={History}>閲覧履歴</Tab>
        <Tab active={tab === "mine"} onClick={() => setTab("mine")} icon={FileText}>自分のコンテンツ</Tab>
        <Tab active={tab === "following"} onClick={() => setTab("following")} icon={Users}>フォロー中</Tab>
      </div>

      {tab === "mine" ? <MyContent member={member} /> : (
        <div className="mt-3 rounded-xl border border-border bg-card overflow-hidden">
          {tab === "saved" && (saved === null ? <ThreadSkeleton /> : saved.length ? saved.map((t) => <ThreadCard key={t.id} thread={t} />) : <Empty text="保存したスレッドがありません" />)}
          {tab === "history" && (history === null ? <ThreadSkeleton /> : history.length ? history.map((t) => <ThreadCard key={t.id} thread={t} />) : <Empty text="閲覧履歴がありません" />)}
          {tab === "following" && (following === null ? <ThreadSkeleton /> : following.length ? following.map((m) => (
            <Link key={m.id} to={`/u/${m.username}`} className="flex items-center gap-3 p-3 border-b border-border hover:bg-muted/40">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-muted">{m.icon_url ? <img src={m.icon_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm font-bold">{(m.display_name || "?").charAt(0)}</div>}</div>
              <div><div className="text-sm font-medium">{m.display_name}</div><div className="text-xs text-muted-foreground">@{m.username}</div></div>
            </Link>
          )) : <Empty text="フォロー中のユーザーがいません" />)}
        </div>
      )}
    </div>
  );
}

function MyContent({ member }) {
  const [sub, setSub] = useState("threads");
  const [threads, setThreads] = useState(null);
  const [comments, setComments] = useState(null);
  const [news, setNews] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = async () => {
    if (sub === "threads") {
      const ts = await base44.entities.Thread.filter({ author_id: member.id, is_deleted: false }, "-created_date", 100).catch(() => []);
      setThreads(ts || []);
    } else if (sub === "comments") {
      const cs = await base44.entities.Comment.filter({ author_id: member.id, is_deleted: false }, "-created_date", 100).catch(() => []);
      setComments(cs || []);
    } else {
      const ns = await base44.entities.News.filter({ author_id: member.id, is_deleted: false }, "-created_date", 100).catch(() => []);
      setNews(ns || []);
    }
  };
  useEffect(() => { load(); }, [sub, member?.id]); // eslint-disable-line

  const confirmDelete = async (reason) => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await softDelete(deleteTarget.type, deleteTarget.id, member, reason);
      setDeleteTarget(null);
      await load();
    } catch (e) {}
    setDeleteBusy(false);
  };

  const row = (item, type, to, numLabel, title) => (
    <div key={item.id} className="flex items-center gap-3 p-3 border-b border-border hover:bg-muted/40">
      <Link to={to} className="flex-1 min-w-0">
        <div className="text-xs font-mono text-muted-foreground">{numLabel}</div>
        <div className="text-sm font-medium line-clamp-1">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {formatJST(item.created_date)} · 💬 {item.comment_count || 0} · ❤️ {item.like_count || 0}
        </div>
      </Link>
      <button onClick={() => setDeleteTarget({ type, id: item.id })} className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-red-500 hover:border-red-200 flex items-center gap-1 shrink-0">
        <Trash2 className="w-3 h-3" /> 削除
      </button>
    </div>
  );

  return (
    <>
      <div className="flex gap-1.5 mt-3 mb-3">
        {[["threads", "スレッド"], ["news", "ニュース"], ["comments", "コメント"]].map(([k, l]) => (
          <button key={k} onClick={() => setSub(k)} className={cn("px-3 py-1 rounded-full text-xs border", sub === k ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground")}>{l}</button>
        ))}
      </div>
      <div className="mt-1 rounded-xl border border-border bg-card overflow-hidden">
        {sub === "threads" && (threads === null ? <ThreadSkeleton /> :
          threads.length ? threads.map((t) => row(t, "thread", `/thread/${t.id}`, `スレッド #${t.thread_number}`, t.title)) : <Empty text="自分のスレッドがありません" />)}
        {sub === "news" && (news === null ? <ThreadSkeleton /> :
          news.length ? news.map((n) => row(n, "news", `/news/${n.id}`, `ニュース #${n.news_number}`, n.title)) : <Empty text="自分のニュースがありません" />)}
        {sub === "comments" && (comments === null ? <ThreadSkeleton /> :
          comments.length ? comments.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3 border-b border-border hover:bg-muted/40">
              <Link to={`/thread/${c.thread_id}#no-${c.comment_number}`} className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">No.{c.comment_number}</div>
                <div className="text-sm line-clamp-2 rte-body" dangerouslySetInnerHTML={{ __html: (c.body || "").replace(/<[^>]+>/g, "") }} />
                <div className="text-xs text-muted-foreground mt-0.5">{formatJST(c.created_date)}</div>
              </Link>
              <button onClick={() => setDeleteTarget({ type: "comment", id: c.id })} className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-red-500 hover:border-red-200 flex items-center gap-1 shrink-0">
                <Trash2 className="w-3 h-3" /> 削除
              </button>
            </div>
          )) : <Empty text="自分のコメントがありません" />)}
      </div>
      <DeleteDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} busy={deleteBusy} title="このコンテンツを削除しますか？" />
    </>
  );
}

function Tab({ active, onClick, icon: Icon, children }) {
  return <button onClick={onClick} className={cn("flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap", active ? "border-orange-500 text-foreground" : "border-transparent text-muted-foreground")}><Icon className="w-4 h-4" /> {children}</button>;
}
function Empty({ text }) { return <div className="p-8 text-center text-sm text-muted-foreground">{text}</div>; }

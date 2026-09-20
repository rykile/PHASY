import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMember } from "@/lib/MemberContext";
import { getMemberByUsername, formatJSTDate } from "@/lib/community";
import Badge from "@/components/Badge";
import ThreadCard from "@/components/ThreadCard";
import ShareButton from "@/components/ShareButton";
import { Skeleton, ThreadSkeleton } from "@/components/Skeleton";
import { UserPlus, UserCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Profile() {
  const { username } = useParams();
  const { member: me } = useMember();
  const [profile, setProfile] = useState(null);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [tab, setTab] = useState("threads");

  const isMe = me?.id === profile?.id;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const m = await getMemberByUsername(username);
      setProfile(m);
      if (m) {
        const ts = await base44.entities.Thread.filter({ author_id: m.id, is_deleted: false }, "-created_date", 50).catch(() => []);
        setThreads((ts || []).filter((t) => t.status !== "hidden"));
        if (me?.id) {
          const f = await base44.entities.Follow.filter({ follower_id: me.id, followee_id: m.id, kind: "user" }, "-created_date", 1).catch(() => []);
          setFollowing(f && f.length > 0);
        }
      }
      setLoading(false);
    })();
  }, [username, me?.id]);

  const toggleFollow = async () => {
    if (!me || !profile) return;
    if (following) {
      await base44.entities.Follow.deleteMany({ follower_id: me.id, followee_id: profile.id, kind: "user" });
      setFollowing(false);
      await base44.entities.Member.update(profile.id, { follower_count: Math.max(0, (profile.follower_count || 0) - 1) });
      setProfile((p) => ({ ...p, follower_count: Math.max(0, (p.follower_count || 0) - 1) }));
    } else {
      // double-follow guard
      const existing = await base44.entities.Follow.filter({ follower_id: me.id, followee_id: profile.id, kind: "user" }, "-created_date", 1).catch(() => []);
      if (!existing || !existing.length) {
        await base44.entities.Follow.create({ follower_id: me.id, followee_id: profile.id, kind: "user" });
        setFollowing(true);
        await base44.entities.Member.update(profile.id, { follower_count: (profile.follower_count || 0) + 1 });
        setProfile((p) => ({ ...p, follower_count: (p.follower_count || 0) + 1 }));
        await base44.entities.Notification.create({ user_id: profile.id, type: "follow", title: `${me.display_name} にフォローされました`, body: `@${me.username}`, link: `/u/${me.username}`, is_read: false });
      }
    }
  };

  if (loading) return <div className="max-w-3xl mx-auto"><Skeleton className="h-40 w-full rounded-xl" /></div>;
  if (!profile) return <div className="p-12 text-center text-muted-foreground">ユーザーが見つかりません。</div>;

  // Privacy (private info is hidden even via direct URL)
  const profilePrivate = profile.privacy_profile === "private" && !isMe;
  const postsHidden = profile.privacy_posts === "private" && !isMe;
  const followersHidden = profile.privacy_followers === "private" && !isMe;
  const accountHidden = profile.account_status === "deleted";

  if (accountHidden) return <div className="p-12 text-center text-muted-foreground">このユーザーは存在しません。</div>;

  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-orange-100 to-amber-50 dark:from-orange-950/40 dark:to-zinc-900" />
        <div className="px-4 pb-4 -mt-10">
          <div className="flex items-end justify-between">
            <div className="w-20 h-20 rounded-full border-4 border-card bg-card overflow-hidden">
              {profile.icon_url ? <img src={profile.icon_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-muted text-2xl font-bold">{(profile.display_name || "?").charAt(0)}</div>}
            </div>
            <div className="flex items-center gap-2">
              <ShareButton url={`/u/${profile.username}`} title={profile.display_name} />
              {isMe ? (
                <Link to="/mypage/settings" className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted">編集</Link>
              ) : (
                <button onClick={toggleFollow} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium", following ? "border border-border text-muted-foreground" : "bg-orange-600 text-white hover:bg-orange-700")}>
                  {following ? <><UserCheck className="w-4 h-4" /> フォロー中</> : <><UserPlus className="w-4 h-4" /> フォローする</>}
                </button>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <h1 className="text-lg font-bold">{profile.display_name}</h1>
            {profile.is_official && <Badge badge={profile.official_badge} color={profile.official_badge_color} />}
          </div>
          <div className="text-sm text-muted-foreground">@{profile.username}</div>
          {profilePrivate ? (
            <p className="text-sm mt-3 text-muted-foreground">このユーザーのプロフィールは非公開です。</p>
          ) : (
            <>
              {profile.bio && <p className="text-sm mt-2 whitespace-pre-wrap">{profile.bio}</p>}
              <div className="flex gap-4 mt-3 text-sm">
                <span><b>{profile.post_count || 0}</b> <span className="text-muted-foreground">投稿</span></span>
                <span><b>{profile.follower_count || 0}</b> <span className="text-muted-foreground">フォロワー</span></span>
                <span><b>{profile.following_count || 0}</b> <span className="text-muted-foreground">フォロー中</span></span>
                <span className="ml-auto text-xs text-muted-foreground">登録 {formatJSTDate(profile.created_date)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {profilePrivate || postsHidden ? (
        <div className="p-8 mt-4 text-center text-sm text-muted-foreground rounded-xl border border-border bg-card">このユーザーの投稿一覧は非公開です。</div>
      ) : (
        <>
          <div className="flex gap-1 mt-4 border-b border-border overflow-x-auto">
            <Tab active={tab === "threads"} onClick={() => setTab("threads")}>スレッド</Tab>
            <Tab active={tab === "news"} onClick={() => setTab("news")}>ニュース</Tab>
            <Tab active={tab === "comments"} onClick={() => setTab("comments")}>コメント</Tab>
            {!followersHidden && <Tab active={tab === "followers"} onClick={() => setTab("followers")}>フォロワー</Tab>}
          </div>

          {tab === "threads" && (
            <div className="rounded-xl border border-border bg-card overflow-hidden mt-3">
              {threads.length ? threads.map((t) => <ThreadCard key={t.id} thread={t} />) : <div className="p-8 text-center text-sm text-muted-foreground">スレッドがありません</div>}
            </div>
          )}
          {tab === "news" && <NewsHistory memberId={profile.id} />}
          {tab === "comments" && <CommentHistory memberId={profile.id} />}
          {tab === "followers" && !followersHidden && <FollowersList profileId={profile.id} />}
        </>
      )}
    </div>
  );
}

function Tab({ active, onClick, children }) {
  return <button onClick={onClick} className={cn("px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap", active ? "border-orange-500 text-foreground" : "border-transparent text-muted-foreground")}>{children}</button>;
}

function NewsHistory({ memberId }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    base44.entities.News.filter({ author_id: memberId, is_deleted: false }, "-created_date", 50).then(setItems).catch(() => setItems([]));
  }, [memberId]);
  if (!items) return <div className="mt-3"><ThreadSkeleton /></div>;
  if (!items.length) return <div className="p-8 mt-3 text-center text-sm text-muted-foreground rounded-xl border border-border bg-card">ニュースがありません</div>;
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden mt-3">
      {items.map((n) => (
        <Link key={n.id} to={`/news/${n.id}`} className="block p-3 border-b border-border hover:bg-muted/40">
          <div className="text-xs font-mono text-muted-foreground">ニュース #{n.news_number}</div>
          <div className="text-sm font-medium line-clamp-1">{n.title}</div>
        </Link>
      ))}
    </div>
  );
}

function CommentHistory({ memberId }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    base44.entities.Comment.filter({ author_id: memberId, is_deleted: false }, "-created_date", 50).then(setItems).catch(() => setItems([]));
  }, [memberId]);
  if (!items) return <div className="mt-3"><ThreadSkeleton /></div>;
  if (!items.length) return <div className="p-8 mt-3 text-center text-sm text-muted-foreground rounded-xl border border-border bg-card">コメントがありません</div>;
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden mt-3">
      {items.map((c) => (
        <Link key={c.id} to={`/thread/${c.thread_id}#no-${c.comment_number}`} className="block p-3 border-b border-border hover:bg-muted/40">
          <div className="text-xs text-muted-foreground">No.{c.comment_number}</div>
          <div className="text-sm line-clamp-2 rte-body" dangerouslySetInnerHTML={{ __html: (c.body || "").replace(/<[^>]+>/g, "") }} />
        </Link>
      ))}
    </div>
  );
}

function FollowersList({ profileId }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    (async () => {
      const fl = await base44.entities.Follow.filter({ followee_id: profileId, kind: "user" }, "-created_date", 100).catch(() => []);
      if (!fl || !fl.length) { setItems([]); return; }
      const members = await base44.entities.Member.list("-created_date", 200).catch(() => []);
      const ids = fl.map((f) => f.follower_id);
      setItems((members || []).filter((m) => ids.includes(m.id) && m.account_status !== "deleted"));
    })();
  }, [profileId]);
  if (!items) return <div className="mt-3"><ThreadSkeleton /></div>;
  if (!items.length) return <div className="p-8 mt-3 text-center text-sm text-muted-foreground rounded-xl border border-border bg-card"><Users className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />フォロワーはいません</div>;
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden mt-3">
      {items.map((m) => (
        <Link key={m.id} to={`/u/${m.username}`} className="flex items-center gap-3 p-3 border-b border-border hover:bg-muted/40">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-muted">{m.icon_url ? <img src={m.icon_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm font-bold">{(m.display_name || "?").charAt(0)}</div>}</div>
          <div><div className="text-sm font-medium">{m.display_name}</div><div className="text-xs text-muted-foreground">@{m.username}</div></div>
        </Link>
      ))}
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { MessageSquare, Flag, Users, FileText, Lock, ShieldAlert, Megaphone } from "lucide-react";

function StatCard({ icon: Icon, label, value, to, color }) {
  return (
    <Link to={to || "#"} className="rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow block">
      <div className="flex items-center gap-3">
        <div className={"w-10 h-10 rounded-lg flex items-center justify-center " + (color || "bg-orange-50 text-orange-600")}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-bold leading-none">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </div>
    </Link>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ threads: 0, comments: 0, reports: 0, members: 0, locked: 0, ngwords: 0, announcements: 0 });
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [threads, comments, reports, members, ngwords, anns] = await Promise.all([
          base44.entities.Thread.list("-created_date", 1),
          base44.entities.Comment.list("-created_date", 1),
          base44.entities.Report.filter({ status: "received" }, "-created_date", 5),
          base44.entities.Member.list("-created_date", 1),
          base44.entities.NgWord.filter({ is_active: true }, "-created_date", 1),
          base44.entities.Announcement.filter({ is_active: true }, "-created_date", 1),
        ]);
        const locked = await base44.entities.Member.filter({ is_locked: true }, "-updated_date", 1);
        setStats({
          threads: threads.length ? threads[0].thread_number || 0 : 0,
          comments: comments.length ? comments.length : 0,
          reports: reports.length,
          members: members.length ? members.length : 0,
          locked: locked.length,
          ngwords: ngwords.length,
          announcements: anns.length,
        });
        setRecentReports(reports);
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-muted-foreground">読み込み中...</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">ダッシュボード</h1>
        <p className="text-sm text-muted-foreground">コミュニティの運用状況</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={FileText} label="スレッド" value={stats.threads} to="/board" color="bg-blue-50 text-blue-600" />
        <StatCard icon={Flag} label="未処理通報" value={stats.reports} to="/admin/reports" color="bg-red-50 text-red-600" />
        <StatCard icon={Users} label="メンバー" value={stats.members} to="/admin/users" color="bg-green-50 text-green-600" />
        <StatCard icon={Lock} label="ロック中" value={stats.locked} to="/admin/users" color="bg-zinc-100 text-zinc-600" />
        <StatCard icon={ShieldAlert} label="NGワード" value={stats.ngwords} to="/admin/ngwords" color="bg-amber-50 text-amber-600" />
        <StatCard icon={Megaphone} label="お知らせ" value={stats.announcements} to="/admin/announcements" color="bg-purple-50 text-purple-600" />
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold mb-3">最近の通報</h2>
        {recentReports.length === 0 ? (
          <p className="text-sm text-muted-foreground">未処理の通報はありません</p>
        ) : (
          <ul className="space-y-2">
            {recentReports.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-sm border-b border-border pb-2">
                <span className="truncate">{r.target_type} / 理由: {r.reason}</span>
                <Link to="/admin/reports" className="text-orange-600 hover:underline text-xs">確認</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

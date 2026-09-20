import React, { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import { useMember } from "@/lib/MemberContext";
import { LayoutDashboard, Flag, Users, BadgeCheck, KeyRound, ShieldAlert, Wrench, ScrollText, Megaphone, ArrowLeft, Loader2, Trash2, Settings } from "lucide-react";

const NAV = [
  { to: "/admin", label: "ダッシュボード", icon: LayoutDashboard, end: true },
  { to: "/admin/reports", label: "通報管理", icon: Flag },
  { to: "/admin/users", label: "ユーザー管理", icon: Users },
  { to: "/admin/official", label: "公式認証", icon: BadgeCheck },
  { to: "/admin/password-resets", label: "パスワード再設定", icon: KeyRound },
  { to: "/admin/ngwords", label: "NGワード", icon: ShieldAlert },
  { to: "/admin/maintenance", label: "メンテナンス", icon: Wrench },
  { to: "/admin/audit", label: "監査ログ", icon: ScrollText },
  { to: "/admin/announcements", label: "お知らせ", icon: Megaphone },
  { to: "/admin/deleted", label: "削除済み管理", icon: Trash2, adminOnly: true },
  { to: "/admin/settings", label: "サイト設定", icon: Settings, adminOnly: true },
];

export default function AdminLayout() {
  const { member, loading } = useMember();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!member) { navigate("/"); return; }
    if (member.role !== "admin" && member.role !== "subadmin") { navigate("/"); return; }
    setChecking(false);
  }, [member, loading, navigate]);

  if (loading || checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const isSubadmin = member.role === "subadmin";

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-7xl mx-auto flex">
        <aside className="w-56 shrink-0 border-r border-border bg-card min-h-screen p-3 sticky top-0 h-screen overflow-y-auto">
          <div className="px-2 py-2 mb-2">
            <div className="text-sm font-bold">管理画面</div>
            <div className="text-xs text-muted-foreground">{isSubadmin ? "副管理者" : "管理者"}</div>
          </div>
          <nav className="space-y-1">
            {NAV.filter((n) => !n.adminOnly || member?.role === "admin").map((n) => {
              const Icon = n.icon;
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm " +
                    (isActive ? "bg-orange-600 text-white" : "hover:bg-muted text-foreground")
                  }
                >
                  <Icon className="w-4 h-4" /> {n.label}
                </NavLink>
              );
            })}
          </nav>
          <div className="mt-4 px-2">
            <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-3 h-3" /> サイトに戻る
            </Link>
          </div>
        </aside>
        <main className="flex-1 p-5 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

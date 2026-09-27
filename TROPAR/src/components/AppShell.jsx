import React, { useEffect, useState } from "react";
import { useMember } from "@/lib/MemberContext";
import Layout from "@/components/Layout";
import SetNewPassword from "@/components/SetNewPassword";
import { getMaintenanceConfig } from "@/lib/admin";
import { sweepAnnouncements, sweepMaintenance } from "@/lib/scheduling";
import { Wrench } from "lucide-react";

export default function AppShell() {
  const { member } = useMember();
  const [maintenance, setMaintenance] = useState(null);

  useEffect(() => {
    if (!member) return;
    if (member.must_reset_password) return;
    (async () => {
      try { await Promise.all([sweepAnnouncements(), sweepMaintenance()]); } catch { /* ignore */ }
      const c = await getMaintenanceConfig();
      setMaintenance(c || { is_maintenance: false });
    })();
  }, [member]);

  if (!member) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (member.must_reset_password) return <SetNewPassword />;

  if (maintenance && maintenance.is_maintenance && member.role !== "admin" && member.role !== "subadmin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-bold">{maintenance.title || "メンテナンス中"}</h1>
          <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{maintenance.message || "現在メンテナンス中です。しばらくお待ちください。"}</p>
        </div>
      </div>
    );
  }

  return <Layout />;

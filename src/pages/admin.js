import { base44 } from "@/api/base44Client";

// ---- Audit log ----
export async function auditLog({ actor_id, actor_name, action, target_type, target_id, detail }) {
  try {
    await base44.entities.AuditLog.create({
      actor_id: actor_id || "",
      actor_name: actor_name || "",
      action,
      target_type,
      target_id: target_id || "",
      detail: detail || "",
    });
  } catch (e) { /* best effort */ }
}

// ---- NG words (cached) ----
let _ngWords = null;
export async function getNgWords() {
  if (_ngWords) return _ngWords;
  const list = await base44.entities.NgWord.filter({ is_active: true }, "-created_date", 300);
  _ngWords = list || [];
  return _ngWords;
}
export function invalidateNgWords() { _ngWords = null; }

export function checkNgWords(text, ngWords) {
  if (!text) return { ok: true, hits: [] };
  const plain = String(text).replace(/<[^>]+>/g, " ");
  const hits = [];
  for (const w of ngWords) {
    const kw = w.word || "";
    if (!kw) continue;
    if (w.is_regex) {
      try { if (new RegExp(kw).test(plain)) hits.push(kw); } catch {}
    } else if (plain.toLowerCase().includes(String(kw).toLowerCase())) hits.push(kw);
  }
  return { ok: hits.length === 0, hits };
}

// ---- Maintenance (cached) ----
let _maintenance = null;
export async function getMaintenanceConfig() {
  if (_maintenance) return _maintenance;
  const list = await base44.entities.MaintenanceConfig.list("-updated_date", 1);
  _maintenance = list && list.length ? list[0] : null;
  return _maintenance;
}
export function invalidateMaintenance() { _maintenance = null; }

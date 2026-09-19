import { base44 } from "@/api/base44Client";

// ---- JST (UTC+9) time helpers ----
export function formatJST(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d);
}

export function formatJSTDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}

export function relativeTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "たった今";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}時間前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}日前`;
  return formatJSTDate(dateStr);
}

// ---- Member helpers ----
export async function getMemberByUserId(userId) {
  const list = await base44.entities.Member.filter({ user_id: userId }, "-created_date", 1);
  return list && list.length ? list[0] : null;
}

export async function getMemberById(id) {
  try { return await base44.entities.Member.get(id); } catch { return null; }
}

export async function getMemberByUsername(username) {
  const list = await base44.entities.Member.filter({ username }, "-created_date", 1);
  return list && list.length ? list[0] : null;
}

// ---- Numbering (display numbers, never reused) ----
export async function nextThreadNumber() {
  const list = await base44.entities.Thread.list("-thread_number", 1);
  const max = list && list.length ? (list[0].thread_number || 0) : 0;
  return max + 1;
}

export async function nextNewsNumber() {
  const list = await base44.entities.News.list("-news_number", 1);
  const max = list && list.length ? (list[0].news_number || 0) : 0;
  return max + 1;
}

export async function nextCommentNumber(threadId) {
  const list = await base44.entities.Comment.filter({ thread_id: threadId }, "-comment_number", 1);
  const max = list && list.length ? (list[0].comment_number || 0) : 0;
  return max + 1;
}

export async function nextNewsCommentNumber(newsId) {
  const list = await base44.entities.NewsComment.filter({ news_id: newsId }, "-comment_number", 1);
  const max = list && list.length ? (list[0].comment_number || 0) : 0;
  return max + 1;
}

// ---- Trending score (rule-based, no AI) ----
export function trendingScore(thread) {
  const ageHrs = Math.max(1, (Date.now() - new Date(thread.updated_date || thread.created_date).getTime()) / 3600000);
  const comments = thread.comment_count || 0;
  const views = thread.view_count || 0;
  const likes = thread.like_count || 0;
  return (comments * 5 + likes * 3 + views * 0.5) / Math.pow(ageHrs, 0.7);
}

// ---- Site settings (cached) ----
let _settings = null;
let _officialBadge = { label: "認証済み", color: "#2563eb" };
export function getOfficialBadgeConfig() { return _officialBadge; }
export function setOfficialBadgeConfig(cfg) {
  if (cfg) _officialBadge = { label: cfg.label || "認証済み", color: cfg.color || "#2563eb" };
}
export async function getSiteSettings() {
  if (_settings) return _settings;
  const list = await base44.entities.SiteSettings.list("-updated_date", 1);
  _settings = list && list.length ? list[0] : null;
  if (_settings) setOfficialBadgeConfig({ label: _settings.official_badge_label, color: _settings.official_badge_color });
  return _settings;
}
export function invalidateSiteSettings() { _settings = null; }

// ---- Badge render config ----
export const BADGE_STYLES = {
  "公式": { color: "#2563eb", bg: "bg-blue-50 text-blue-700 border-blue-200" },
  "認証済み": { color: "#0ea5e9", bg: "bg-sky-50 text-sky-700 border-sky-200" },
  "運営": { color: "#ea580c", bg: "bg-orange-50 text-orange-700 border-orange-200" },
  "モデレーター": { color: "#16a34a", bg: "bg-green-50 text-green-700 border-green-200" },
};

export const STATUS_META = {
  hot: { label: "🔥 急上昇", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  pinned: { label: "📌 固定", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  official: { label: "🟦 公式", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  locked: { label: "🔒 ロック", cls: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  archived: { label: "🗄️ アーカイブ", cls: "bg-zinc-100 text-zinc-500 border-zinc-200" },
  hidden: { label: "👁️ 非表示", cls: "bg-red-50 text-red-700 border-red-200" },
  normal: { label: "", cls: "" },
};

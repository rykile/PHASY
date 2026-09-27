import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { generateSalt, generateSessionToken, hashPassword, verifyPassword, DEFAULT_ITERATIONS } from "@/lib/crypto";
import { auditLog } from "@/lib/admin";

const CustomAuthContext = createContext(null);
const STORAGE_KEY = "cc_session_token";
const SESSION_TTL_DAYS = 30;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export function CustomAuthProvider({ children }) {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  const nowIso = () => new Date().toISOString();
  const addDays = (days) => new Date(Date.now() + days * 86400000).toISOString();

  const loadMemberById = useCallback(async (memberId) => {
    try { return await base44.entities.Member.get(memberId); } catch { return null; }
  }, []);

  const validateSession = useCallback(async () => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) { setLoading(false); return; }
    try {
      const sessions = await base44.entities.Session.filter({ session_token: token }, "-created_at", 1);
      const s = sessions && sessions[0];
      if (!s || !s.is_valid) { localStorage.removeItem(STORAGE_KEY); setLoading(false); return; }
      if (new Date(s.expires_at).getTime() < Date.now()) {
        await base44.entities.Session.update(s.id, { is_valid: false, invalidated_reason: "expired" }).catch(() => {});
        localStorage.removeItem(STORAGE_KEY); setLoading(false); return;
      }
      const m = await loadMemberById(s.member_id);
      if (!m || m.account_status === "deleted") { localStorage.removeItem(STORAGE_KEY); setLoading(false); return; }
      setMember(m);
    } catch { localStorage.removeItem(STORAGE_KEY); }
    finally { setLoading(false); }
  }, [loadMemberById]);

  useEffect(() => { validateSession(); }, [validateSession]);

  const startSession = async (m) => {
    const token = generateSessionToken();
    await base44.entities.Session.create({
      session_token: token, member_id: m.id, username: m.username,
      created_at: nowIso(), expires_at: addDays(SESSION_TTL_DAYS), is_valid: true,
      user_agent: navigator.userAgent.slice(0, 200),
    });
    localStorage.setItem(STORAGE_KEY, token);
    setMember(m);
    return token;
  };

  const login = useCallback(async (username, password) => {
    const uname = (username || "").trim();
    if (!uname || !password) return { ok: false, error: "ユーザー名とパスワードを入力してください" };
    let accounts = [];
    try { accounts = await base44.entities.Member.filter({ username: uname }, "-created_date", 1); } catch { return { ok: false, error: "ログインに失敗しました" }; }
    const m = accounts && accounts[0];
    const dummySalt = generateSalt();
    const ok = m && m.password_hash && m.password_salt;
    const valid = ok
      ? await verifyPassword(password, m.password_salt, m.password_hash, m.password_iterations || DEFAULT_ITERATIONS)
      : await verifyPassword(password, dummySalt, "0".repeat(64), DEFAULT_ITERATIONS);
    if (!m || !ok || !valid) {
      if (m) {
        const attempts = (m.failed_login_attempts || 0) + 1;
        const lockUntil = attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : undefined;
        await base44.entities.Member.update(m.id, {
          failed_login_attempts: attempts, last_failed_login_at: nowIso(),
          ...(lockUntil ? { locked_until: lockUntil } : {}),
        }).catch(() => {});
      }
      return { ok: false, error: "ユーザー名またはパスワードが正しくありません" };
    }
    if (m.account_status === "suspended") return { ok: false, error: "このアカウントは停止されています" };
    if (m.account_status === "deleted") return { ok: false, error: "このアカウントは存在しません" };
    if (m.locked_until && new Date(m.locked_until).getTime() > Date.now()) {
      return { ok: false, error: `アカウントがロックされています（${LOCK_MINUTES}分後に再試行できます）` };
    }
    await base44.entities.Member.update(m.id, {
      failed_login_attempts: 0, last_login_at: nowIso(),
      ...(m.locked_until ? { locked_until: "" } : {}),
    }).catch(() => {});
    const fresh = { ...m, failed_login_attempts: 0, last_login_at: nowIso() };
    await startSession(fresh);
    await auditLog({ actor_id: m.id, actor_name: m.display_name, action: "login", target_type: "user", target_id: m.id });
    return { ok: true, member: fresh, mustReset: !!m.must_reset_password };
  }, []);

  const register = useCallback(async ({ username, display_name, password, icon_url, terms_version }) => {
    const uname = (username || "").trim();
    const name = (display_name || "").trim();
    const err = validateRegistration(uname, name, password);
    if (err) return { ok: false, error: err };
    let existing = [];
    try { existing = await base44.entities.Member.filter({ username: uname }, "-created_date", 1); } catch {}
    if (existing && existing.length) return { ok: false, error: "このユーザー名は既に使用されています" };
    const salt = generateSalt();
    const hash = await hashPassword(password, salt, DEFAULT_ITERATIONS);
    const created = await base44.entities.Member.create({
      username: uname, display_name: name, icon_url: icon_url || "",
      password_hash: hash, password_salt: salt, password_iterations: DEFAULT_ITERATIONS,
      password_updated_at: nowIso(), account_status: "active", failed_login_attempts: 0,
      must_reset_password: false, terms_consent_version: terms_version || "", role: "user",
      is_official: false, post_count: 0, comment_count: 0, like_count: 0,
      follower_count: 0, following_count: 0, theme: "light", is_locked: false, lock_reason: "",
    });
    if (terms_version) {
      await base44.entities.TermsConsent.create({ member_id: created.id, terms_version }).catch(() => {});
    }
    await startSession(created);
    await auditLog({ actor_id: created.id, actor_name: created.display_name, action: "register", target_type: "user", target_id: created.id, detail: uname });
    return { ok: true, member: created };
  }, []);

  const logout = useCallback(async () => {
    const token = localStorage.getItem(STORAGE_KEY);
    const m = member;
    if (token) {
      try {
        const sessions = await base44.entities.Session.filter({ session_token: token }, "-created_at", 1);
        if (sessions && sessions[0]) await base44.entities.Session.update(sessions[0].id, { is_valid: false, invalidated_reason: "logout" });
      } catch {}
    }
    localStorage.removeItem(STORAGE_KEY);
    setMember(null);
    if (m) await auditLog({ actor_id: m.id, actor_name: m.display_name, action: "logout", target_type: "user", target_id: m.id });
  }, [member]);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    if (!member) return { ok: false, error: "ログインしていません" };
    const np = newPassword || "";
    if (np.length < 8) return { ok: false, error: "新しいパスワードは8文字以上にしてください" };
    let fresh = null;
    try { fresh = await base44.entities.Member.get(member.id); } catch { return { ok: false, error: "アカウント情報の取得に失敗しました" }; }
    const valid = await verifyPassword(currentPassword, fresh.password_salt, fresh.password_hash, fresh.password_iterations || DEFAULT_ITERATIONS);
    if (!valid) return { ok: false, error: "現在のパスワードが正しくありません" };
    const salt = generateSalt();
    const hash = await hashPassword(newPassword, salt, DEFAULT_ITERATIONS);
    await base44.entities.Member.update(member.id, {
      password_hash: hash, password_salt: salt, password_iterations: DEFAULT_ITERATIONS,
      password_updated_at: nowIso(), must_reset_password: false,
    });
    const token = localStorage.getItem(STORAGE_KEY);
    try {
      const all = await base44.entities.Session.filter({ member_id: member.id, is_valid: true }, "-created_at", 100);
      for (const s of (all || [])) {
        if (s.session_token !== token) await base44.entities.Session.update(s.id, { is_valid: false, invalidated_reason: "password_change" });
      }
    } catch {}
    await auditLog({ actor_id: member.id, actor_name: member.display_name, action: "password_change", target_type: "user", target_id: member.id });
    setMember({ ...member, password_updated_at: nowIso(), must_reset_password: false });
    return { ok: true };
  }, [member]);

  const refreshMember = useCallback(async () => {
    if (!member) return;
    const m = await loadMemberById(member.id);
    if (m) setMember(m);
  }, [member, loadMemberById]);

  const value = { member, loading, isAuthenticated: !!member, login, register, logout, changePassword, refreshMember, setMember, validateSession };

  return <CustomAuthContext.Provider value={value}>{children}</CustomAuthContext.Provider>;
}

export function useCustomAuth() {
  const ctx = useContext(CustomAuthContext);
  if (!ctx) throw new Error("useCustomAuth must be used within CustomAuthProvider");
  return ctx;
}

function validateRegistration(username, display_name, password) {
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return "ユーザー名は3〜20文字の半角英数字・アンダースコアにしてください";
  if (!display_name || display_name.length > 30) return "表示名は1〜30文字にしてください";
  if (!password || password.length < 8) return "パスワードは8文字以上にしてください";
  if (password.length > 128) return "パスワードが長すぎます";
  return null;
}

// src/lib/ai.js — Banque de questions + anti-répétition + fallback IA
import { CONCOURS } from "./constants.js";
import { supabase }  from "./supabase.js";

const PROXY_URL = "/api/chat";

// ── Helpers ───────────────────────────────────────────────────

async function getAuthHeader() {
  const { data:{ session } } = await supabase.auth.getSession();
  return session?.access_token ? `Bearer ${session.access_token}` : null;
}

async function callWithRetry(fn, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); }
    catch(e) { if (i === retries) throw e; await new Promise(r => setTimeout(r, 1000)); }
  }
}

// ── Banque de questions Supabase ──────────────────────────────

async function getSeenQuestionIds(userId, concours) {
  if (!userId) return [];
  try {
    const { data } = await supabase
      .from("user_question_history")
      .select("question_id")
      .eq("user_id", userId)
      .eq("concours", concours);
    return (data || []).map(r => r.question_id);
  } catch { return []; }
}

async function markQuestionsAsSeen(userId, questionIds, concours) {
  if (!userId || !questionIds.length) return;
  try {
    await supabase.from("user_question_history").upsert(
      questionIds.map(id => ({ user_id:userId, question_id:id, concours })),
      { onConflict:"user_id,question_id" }
    );
  } catch {}
}

async function getFromBank(concours, difficulty, theme, count = 10, userId = null) {
  try {
    const seenIds = await getSeenQuestionIds(userId, concours);

    // Essayer la difficulté demandée, puis fallback vers difficulté 2
    const difficultiesToTry = difficulty === 2 ? [2] : [difficulty, 2];
    let data = null;

    for (const diff of difficultiesToTry) {
      let query = supabase
        .from("question_bank")
        .select("id,question,options,answer,explanation,theme")
        .eq("concours", concours)
        .eq("difficulty", diff)
        .limit(count * 3);
      if (theme) query = query.eq("theme", theme);
      const { data: result } = await query;
      if (result && result.length >= count) { data = result; break; }
    }

    if (!data || data.length < count) return null;

    // Filtrer les questions déjà vues
    const unseen = data.filter(q => !seenIds.includes(q.id));
    const pool = unseen.length >= count ? unseen : data;

    const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, count);
    if (shuffled.length < count) return null;

    const questions = shuffled.map(q => ({
      q: q.question,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
      theme: q.theme,
      _id: q.id
    }));

    markQuestionsAsSeen(userId, shuffled.map(q => q.id), concours);
    return { questions };
  } catch {
    return null;
  }
}

// ── Appel proxy sécurisé ─────────────────────────────────────

async function callProxy(params) {
  const authHeader = await getAuthHeader();
  const headers = { "Content-Type":"application/json" };
  if (authHeader) headers["Authorization"] = authHeader;

  return callWithRetry(async () => {
    const res = await fetch(PROXY_URL, { method:"POST", headers, body:JSON.stringify(params) });
    if (res.status === 429) {
      const d = await res.json();
      const e = new Error(d.message || "Limite atteinte");
      e.code = "RATE_LIMIT_EXCEEDED";
      throw e;
    }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || "Erreur IA. Réessayez.");
    }
    const data = await res.json();
    if (data.questions) return data;
    if (data.flashcards) return data;
    throw new Error("Réponse invalide");
  });
}

// ── Fonctions publiques ───────────────────────────────────────

export async function generateQuiz(concours, difficulty, theme, errorMode=false, errorQuestions=[], userId=null) {
  if (!errorMode) {
    const banked = await getFromBank(concours, difficulty, theme, 10, userId);
    if (banked) return banked;
  }
  return callProxy({
    concours,
    mode: errorMode ? "errors" : "quiz",
    difficulty,
    theme,
    errorQuestions: errorMode ? errorQuestions : undefined
  });
}

export async function generateExamBlanc(concours, userId=null) {
  return callProxy({ concours, mode: "exam", difficulty: 2, theme: null });
}

export async function generateFlashcards(concours, theme) {
  return callProxy({ concours, mode: "flashcards", difficulty: 2, theme: theme || null });
}

// ── Préchargement intelligent ─────────────────────────────────

class QuizPreloader {
  constructor() { this.cache = new Map(); this.pending = new Map(); }
  _key(c,d,t) { return `${c}:${d}:${t||"any"}`; }

  preload(c, d, t, userId=null) {
    const k = this._key(c,d,t);
    if (this.cache.has(k) || this.pending.has(k)) return;
    const p = getFromBank(c, d, t, 10, userId)
      .then(data => {
        if (data) { this.cache.set(k, data); }
        else { return generateQuiz(c,d,t,false,[],userId).then(aiData => this.cache.set(k, aiData)); }
      })
      .catch(() => {})
      .finally(() => this.pending.delete(k));
    this.pending.set(k, p);
  }

  async get(c, d, t, userId=null) {
    const k = this._key(c,d,t);
    if (this.cache.has(k)) { const data = this.cache.get(k); this.cache.delete(k); return data; }
    if (this.pending.has(k)) {
      await this.pending.get(k);
      if (this.cache.has(k)) { const data = this.cache.get(k); this.cache.delete(k); return data; }
    }
    const banked = await getFromBank(c, d, t, 10, userId);
    if (banked) return banked;
    return generateQuiz(c, d, t, false, [], userId);
  }
}

export const quizPreloader = new QuizPreloader();

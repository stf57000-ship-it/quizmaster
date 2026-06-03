// src/lib/ai.js — Banque de questions + anti-répétition + fallback IA
import { CONCOURS } from "./constants.js";
import { supabase }  from "./supabase.js";

const IS_DEV         = import.meta.env.DEV;
const PROXY_URL      = "/api/chat";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// ── Helpers ───────────────────────────────────────────────────

async function getAuthHeader() {
  const { data:{ session } } = await supabase.auth.getSession();
  return session?.access_token ? `Bearer ${session.access_token}` : null;
}

function parseJSON(raw) {
  let text = raw.trim().replace(/```json/g,"").replace(/```/g,"").trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (match) text = match[0];
  return JSON.parse(text);
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

    let query = supabase
      .from("question_bank")
      .select("id,question,options,answer,explanation,theme")
      .eq("concours", concours)
      .eq("difficulty", difficulty)
      .limit(count * 3); // Prendre plus pour avoir le choix

    if (theme) query = query.eq("theme", theme);

    const { data } = await query;
    if (!data || data.length < count) return null;

    // Filtrer les questions déjà vues
    const unseen = data.filter(q => !seenIds.includes(q.id));
    const pool = unseen.length >= count ? unseen : data; // Fallback si tout vu

    // Mélanger et prendre count questions
    const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, count);

    if (shuffled.length < count) return null;

    // Formater pour correspondre au format attendu
    const questions = shuffled.map(q => ({
      q: q.question,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
      theme: q.theme,
      _id: q.id // Garder l'ID pour marquer comme vue
    }));

    // Marquer comme vues
    markQuestionsAsSeen(userId, shuffled.map(q => q.id), concours);

    return { questions };
  } catch {
    return null;
  }
}

// ── Appel IA (fallback si banque vide) ────────────────────────

async function callProxy(params) {
  const authHeader = await getAuthHeader();
  const headers = { "Content-Type":"application/json" };
  if (authHeader) headers["Authorization"] = authHeader;

  return callWithRetry(async () => {
    const res = await fetch(PROXY_URL, { method:"POST", headers, body:JSON.stringify(params) });
    if (res.status === 429) {
      const d = await res.json();
      const e = new Error(d.message||"Limite atteinte");
      e.code = "RATE_LIMIT_EXCEEDED";
      throw e;
    }
    if (!res.ok) {
      const d = await res.json().catch(()=>({}));
      throw new Error(d.error||"Erreur IA. Réessayez.");
    }
    const data = await res.json();
    // Le serveur retourne maintenant du JSON propre directement
    if (data.questions) return data;
    if (data.flashcards) return data;
    // Fallback si contenu brut
    if (data.content) return parseJSON(data.content);
    throw new Error("Réponse invalide");
  });
}

// ── Fonctions publiques ───────────────────────────────────────

export async function generateQuiz(concours, difficulty, theme, errorMode=false, errorQuestions=[], userId=null) {
  // 1. Essayer la banque de questions en premier (instantané)
  if (!errorMode) {
    const banked = await getFromBank(concours, difficulty, theme, 10, userId);
    if (banked) return banked;
  }

  // 2. Fallback : génération IA — on envoie des paramètres, pas un prompt libre
  return callProxy({ concours, mode: errorMode ? "errors" : "quiz", difficulty, theme, errorQuestions: errorMode ? errorQuestions : undefined });
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
    // Essayer la banque d'abord — très rapide
    const p = getFromBank(c, d, t, 10, userId)
      .then(data => {
        if (data) { this.cache.set(k, data); }
        else {
          // Banque vide → précharger depuis IA
          return generateQuiz(c,d,t,false,[],userId)
            .then(aiData => this.cache.set(k, aiData));
        }
      })
      .catch(() => {})
      .finally(() => this.pending.delete(k));
    this.pending.set(k, p);
  }

  async get(c, d, t, userId=null) {
    const k = this._key(c,d,t);

    // 1. Cache mémoire (instantané)
    if (this.cache.has(k)) {
      const data = this.cache.get(k);
      this.cache.delete(k);
      return data;
    }

    // 2. Attendre le préchargement en cours
    if (this.pending.has(k)) {
      await this.pending.get(k);
      if (this.cache.has(k)) {
        const data = this.cache.get(k);
        this.cache.delete(k);
        return data;
      }
    }

    // 3. Banque Supabase (rapide ~200ms)
    const banked = await getFromBank(c, d, t, 10, userId);
    if (banked) return banked;

    // 4. Génération IA (lent ~15s)
    return generateQuiz(c, d, t, false, [], userId);
  }
}

export const quizPreloader = new QuizPreloader();

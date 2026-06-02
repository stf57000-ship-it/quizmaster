// src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function saveProgress(userId, state) {
  if (!userId) return;
  await supabase.from("user_progress").upsert({
    user_id: userId, streak: state.streak||0, total_quizzes: state.totalQuizzes||0,
    total_correct: state.totalCorrect||0, total_answered: state.totalAnswered||0,
    best_score: state.bestScore||0, exam_count: state.examCount||0,
    best_exam_score: state.bestExamScore||0, has_perfect: state.hasPerfect||false,
    earned_badges: state.earnedBadges||[], concours_played: state.concoursPlayed||{},
    errors: state.errors||{}, history: state.history||{},
    concour_date: state.concourDate||null, updated_at: new Date().toISOString()
  }, { onConflict:"user_id" });
}

export async function loadProgress(userId) {
  if (!userId) return null;
  try {
    const { data } = await supabase.from("user_progress").select("*").eq("user_id", userId).maybeSingle();
    if (!data) return null;
    return {
      streak: data.streak||0, totalQuizzes: data.total_quizzes||0,
      totalCorrect: data.total_correct||0, totalAnswered: data.total_answered||0,
      bestScore: data.best_score||0, examCount: data.exam_count||0,
      bestExamScore: data.best_exam_score||0, hasPerfect: data.has_perfect||false,
      earnedBadges: data.earned_badges||[], concoursPlayed: data.concours_played||{},
      errors: data.errors||{}, history: data.history||{}, concourDate: data.concour_date||null,
    };
  } catch { return null; }
}

export async function getUserSubscription(userId) {
  if (!userId) return null;
  try {
    const { data } = await supabase.from("user_subscriptions").select("status,plan,current_period_end").eq("user_id", userId).maybeSingle();
    return data;
  } catch { return null; }
}

export function isPremiumActive(sub) {
  if (!sub || sub.status !== "active" || sub.plan !== "premium") return false;
  if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) return false;
  return true;
}

export async function getLeaderboard(limit = 10) {
  try {
    const { data } = await supabase.from("user_progress").select("user_id,best_score,streak,total_quizzes,concours_played").order("best_score", { ascending:false }).limit(limit);
    return data || [];
  } catch { return []; }
}

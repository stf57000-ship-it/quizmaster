// src/lib/progress.js
import { BADGES } from "./constants.js";

const STORAGE_KEY = "cs_v6";

export function loadLocal() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}"); } catch { return {}; } }
export function saveLocal(s) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }

export function getStreak(state) {
  const today     = new Date().toDateString();
  const yesterday = new Date(Date.now()-86400000).toDateString();
  if (!state.lastDay) return 0;
  if (state.lastDay === today || state.lastDay === yesterday) return state.streak || 1;
  return 0;
}

export function updateStreak(state) {
  const today     = new Date().toDateString();
  const yesterday = new Date(Date.now()-86400000).toDateString();
  let streak = 1;
  if (state.lastDay === today)          streak = state.streak || 1;
  else if (state.lastDay === yesterday) streak = (state.streak||0) + 1;
  return { ...state, lastDay:today, streak, totalQuizzes:(state.totalQuizzes||0)+1 };
}

export function addError(state, concours, question) {
  const list = [...((state.errors||{})[concours]||[])];
  if (!list.find(e => e.q === question.q)) list.push(question);
  if (list.length > 30) list.shift();
  return { ...state, errors: { ...(state.errors||{}), [concours]:list } };
}

export function checkNewBadges(oldState, newState) {
  const earned = newState.earnedBadges || [];
  return BADGES.filter(b => !earned.includes(b.id) && b.condition(newState));
}

export function getDailyQuizCount(state) {
  const today = new Date().toDateString();
  return state.dailyCount?.[today] || 0;
}

export function incrementDailyCount(state) {
  const today = new Date().toDateString();
  return { ...state, dailyCount:{ [today]:(state.dailyCount?.[today]||0)+1 } };
}

export function recordQuizResult(state, { score, total, isExam, concours }) {
  const today    = new Date().toDateString();
  const finalPct = Math.round((score/total)*100);
  const dayH     = (state.history||{})[today] || { score:0, quizzes:0 };

  // Historique structuré pour WeeklyChallenge
  const newEntry = {
    date: new Date().toISOString(),
    concours: concours || null,
    score,
    total,
    isExam: !!isExam
  };
  const quizHistory = [...(state.quizHistory||[]), newEntry].slice(-200);

  return {
    ...state,
    history: { ...(state.history||{}), [today]:{ score:Math.max(dayH.score,finalPct), quizzes:dayH.quizzes+1 } },
    quizHistory,
    hasPerfect:    state.hasPerfect || finalPct===100,
    examCount:     isExam ? (state.examCount||0)+1 : state.examCount||0,
    bestExamScore: isExam ? Math.max(state.bestExamScore||0, finalPct) : state.bestExamScore||0,
    bestScore:     Math.max(state.bestScore||0, finalPct),
    totalCorrect:  (state.totalCorrect||0)+score,
    totalAnswered: (state.totalAnswered||0)+total,
  };
}

export function getGlobalAccuracy(state) {
  if (!state.totalAnswered) return 0;
  return Math.round((state.totalCorrect/state.totalAnswered)*100);
}

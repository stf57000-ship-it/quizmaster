// src/hooks/useProgress.js
import { useState, useEffect, useCallback, useRef } from "react";
import { loadLocal, saveLocal, checkNewBadges, getDailyQuizCount, incrementDailyCount } from "../lib/progress.js";
import { saveProgress, loadProgress } from "../lib/supabase.js";
import { FREE_DAILY_LIMIT } from "../lib/constants.js";

function mostRecent(a, b) {
  if (!a) return b; if (!b) return a;
  return new Date(a) >= new Date(b) ? a : b;
}

function mergeErrors(localErrors = {}, cloudErrors = {}) {
  const result = { ...cloudErrors };
  for (const [concours, errs] of Object.entries(localErrors)) {
    const existing = result[concours] || [];
    const ids = new Set(existing.map(e => e.q || e.question));
    result[concours] = [...existing, ...errs.filter(e => !ids.has(e.q || e.question))];
  }
  return result;
}

function mergeHistory(localHistory = [], cloudHistory = []) {
  const seen = new Set(cloudHistory.map(h => `${h.date}-${h.concours}`));
  return [...cloudHistory, ...localHistory.filter(h => !seen.has(`${h.date}-${h.concours}`))];
}

export function useProgress(user, isPremium) {
  const [state, setState] = useState(() => loadLocal());
  const [newBadge, setNewBadge]     = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const syncTimer = useRef(null);

  useEffect(() => { saveLocal(state); }, [state]);

  useEffect(() => {
    if (!user) return;
    loadProgress(user.id).then(cloud => {
      setState(prev => {
        // Fusion intelligente : on garde le meilleur des deux
        const local = prev;
        const base  = cloud || {};

        return {
          ...base,
          ...local,
          // Points : max
          points: Math.max(local.points || 0, base.points || 0),
          // Streak : max
          streak: Math.max(local.streak || 0, base.streak || 0),
          // Badges : union des deux listes
          earnedBadges: [...new Set([...(local.earnedBadges || []), ...(base.earnedBadges || [])])],
          // Erreurs : fusion par concours
          errors: mergeErrors(local.errors, base.errors),
          // Historique : union sans doublons (par date+concours)
          quizHistory: mergeHistory(local.quizHistory, base.quizHistory),
          // Concours joués : union
          concoursPlayed: { ...(base.concoursPlayed || {}), ...(local.concoursPlayed || {}) },
          // lastDay : le plus récent
          lastDay: mostRecent(local.lastDay, base.lastDay),
        };
      });
      setSyncStatus("synced");
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => { await saveProgress(user.id, { ...state, isPremium }); setSyncStatus("synced"); }, 2000);
    return () => clearTimeout(syncTimer.current);
  }, [state, user, isPremium]);

  const update = useCallback((updater) => {
    setState(prev => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      const nb = checkNewBadges(prev, { ...next, isPremium });
      if (nb.length > 0) { next.earnedBadges = [...(next.earnedBadges||[]), ...nb.map(b=>b.id)]; setNewBadge(nb[0]); }
      return next;
    });
  }, [isPremium]);

  const canStartQuiz = useCallback(() => {
    if (isPremium) return { allowed:true };
    const count = getDailyQuizCount(state);
    if (count >= FREE_DAILY_LIMIT) return { allowed:false, reason:"Limite quotidienne atteinte." };
    return { allowed:true, remaining: FREE_DAILY_LIMIT - count };
  }, [state, isPremium]);

  const consumeQuizSlot = useCallback(() => {
    if (!isPremium) setState(prev => incrementDailyCount(prev));
  }, [isPremium]);

  const dailyRemaining = isPremium ? Infinity : Math.max(0, FREE_DAILY_LIMIT - getDailyQuizCount(state));

  return { state, update, newBadge, clearBadge:()=>setNewBadge(null), syncStatus, canStartQuiz, consumeQuizSlot, dailyRemaining };
}

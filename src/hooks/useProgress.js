// src/hooks/useProgress.js
import { useState, useEffect, useCallback, useRef } from "react";
import { loadLocal, saveLocal, checkNewBadges, getDailyQuizCount, incrementDailyCount } from "../lib/progress.js";
import { saveProgress, loadProgress } from "../lib/supabase.js";
import { FREE_DAILY_LIMIT } from "../lib/constants.js";

export function useProgress(user, isPremium) {
  const [state, setState] = useState(() => loadLocal());
  const [newBadge, setNewBadge]     = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const syncTimer = useRef(null);

  useEffect(() => { saveLocal(state); }, [state]);

  useEffect(() => {
    if (!user) return;
    loadProgress(user.id).then(cloud => { if (cloud) { setState(prev => ({ ...prev, ...cloud })); setSyncStatus("synced"); } });
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

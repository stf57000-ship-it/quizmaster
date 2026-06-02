// src/hooks/useAuth.js
import { useState, useEffect, useCallback } from "react";
import { supabase, getUserSubscription, isPremiumActive } from "../lib/supabase.js";

export function useAuth() {
  const [user, setUser]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  const checkPremium = useCallback(async (u) => {
    if (!u) { setIsPremium(false); return; }
    const sub = await getUserSubscription(u.id);
    setIsPremium(isPremiumActive(sub));
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data:{ session } }) => {
      const u = session?.user ?? null;
      setUser(u); checkPremium(u); setLoading(false);
    });
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((_,session) => {
      const u = session?.user ?? null;
      setUser(u); checkPremium(u);
    });
    return () => subscription.unsubscribe();
  }, [checkPremium]);

  const logout = useCallback(async () => { await supabase.auth.signOut(); setUser(null); setIsPremium(false); }, []);
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Candidat";

  return { user, loading, isPremium, logout, userName };
}

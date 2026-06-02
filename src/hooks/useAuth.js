// src/hooks/useAuth.js
import { useState, useEffect, useCallback } from "react";
import { supabase, getUserSubscription, isPremiumActive } from "../lib/supabase.js";

export function useAuth() {
  const [user, setUser]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  const checkPremium = useCallback(async (u) => {
    if (!u) { setIsPremium(false); return false; }
    const sub = await getUserSubscription(u.id);
    const premium = isPremiumActive(sub);
    setIsPremium(premium);
    return premium;
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

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null); setIsPremium(false);
  }, []);

  // Recheck Premium après paiement Stripe (appelé depuis App.jsx)
  const refreshPremium = useCallback(async () => {
    if (!user) return false;
    // Attendre 2s que le webhook ait le temps d'écrire dans Supabase
    await new Promise(r => setTimeout(r, 2000));
    return checkPremium(user);
  }, [user, checkPremium]);

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Candidat";

  return { user, loading, isPremium, logout, userName, refreshPremium };
}

// src/screens/CancelScreen.jsx — Flow résiliation honnête avec offre de rétention
import { useState } from "react";
import { supabase } from "../lib/supabase.js";

const CANCEL_REASONS = [
  { id:"price",    label:"Le prix est trop élevé" },
  { id:"concours", label:"J'ai passé mon concours" },
  { id:"features", label:"Il manque des fonctionnalités" },
  { id:"usage",    label:"Je n'utilise pas assez" },
  { id:"other",    label:"Autre raison" },
];

export function CancelScreen({ user, userName, daysLeft, onKeep, onCancel, onPause }) {
  const [step, setStep]     = useState(1); // 1=raison, 2=offre, 3=confirmation
  const [reason, setReason] = useState(null);
  const [loading, setLoading] = useState(false);

  const firstName = userName?.split(" ")[0] || "toi";

  const handleSelectReason = (r) => {
    setReason(r);
    // Si le concours est passé → pas d'offre de pause, juste confirmer
    if (r === "concours") setStep(3);
    else setStep(2);
  };

  const handleConfirmCancel = async () => {
    setLoading(true);
    try {
      // 1. Récupérer le token Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // 2. Appeler l'endpoint de résiliation Stripe
      const cancelRes = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (!cancelRes.ok) {
        const err = await cancelRes.json();
        console.error("Erreur résiliation:", err);
      }

      // 3. Email de confirmation (non bloquant)
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "cancellation",
          to: user.email,
          data: { name: firstName, reason }
        })
      });

      onCancel?.();
    } catch (err) {
      console.error("handleConfirmCancel error:", err);
      onCancel?.(); // On laisse partir quand même
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"var(--surface)", borderBottom:"1px solid var(--border)", padding:"14px 20px", display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={onKeep} style={{ background:"none", border:"none", cursor:"pointer", fontSize:"1.1rem", color:"var(--muted)" }}>←</button>
        <div style={{ fontFamily:"var(--font-display)", fontWeight:800, color:"var(--text)" }}>Gérer mon abonnement</div>
      </div>

      <div style={{ maxWidth:480, margin:"0 auto", padding:"32px 24px", width:"100%" }}>

        {/* ÉTAPE 1 — Pourquoi tu pars ? */}
        {step === 1 && (
          <div className="fade-up">
            <div style={{ fontSize:40, textAlign:"center", marginBottom:16 }}>😢</div>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:"1.4rem", color:"var(--text)", textAlign:"center", marginBottom:8 }}>
              Tu veux résilier, {firstName} ?
            </div>
            <div style={{ color:"var(--muted)", fontSize:"0.88rem", textAlign:"center", marginBottom:28 }}>
              Pour améliorer ConcoursSanté, dis-nous pourquoi.
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {CANCEL_REASONS.map(r => (
                <button key={r.id} onClick={() => handleSelectReason(r.id)}
                  style={{ background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:14, padding:"16px 20px", cursor:"pointer", textAlign:"left", fontFamily:"var(--font-body)", fontSize:"0.9rem", color:"var(--text)", transition:"all 0.2s", display:"flex", justifyContent:"space-between", alignItems:"center" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--teal)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}>
                  {r.label}
                  <span style={{ color:"var(--muted)" }}>→</span>
                </button>
              ))}
            </div>

            <button onClick={onKeep} style={{ width:"100%", marginTop:20, background:"none", border:"none", cursor:"pointer", color:"var(--teal)", fontFamily:"var(--font-display)", fontWeight:700, fontSize:"0.88rem", padding:"12px" }}>
              ← Finalement je reste !
            </button>
          </div>
        )}

        {/* ÉTAPE 2 — Offre de rétention */}
        {step === 2 && (
          <div className="fade-up">
            <div style={{ fontSize:40, textAlign:"center", marginBottom:16 }}>🎁</div>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:"1.3rem", color:"var(--text)", textAlign:"center", marginBottom:8 }}>
              {reason === "price" ? "Et si on faisait une pause ?" : "Avant de partir..."}
            </div>

            {reason === "price" && (
              <div>
                <div style={{ color:"var(--muted)", fontSize:"0.88rem", textAlign:"center", marginBottom:24, lineHeight:1.6 }}>
                  Le concours approche et tu as besoin de réviser. On te offre <strong style={{ color:"var(--teal)" }}>30 jours supplémentaires gratuits</strong> — pas de débit pendant 1 mois.
                </div>
                <div style={{ background:"rgba(29,184,164,0.06)", border:"2px solid var(--teal)", borderRadius:16, padding:"20px", marginBottom:20, textAlign:"center" }}>
                  <div style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:"1.1rem", color:"var(--teal)", marginBottom:4 }}>🎁 1 mois offert</div>
                  <div style={{ fontSize:"0.82rem", color:"var(--muted)" }}>Aucun débit pendant 30 jours · Résiliable à tout moment</div>
                </div>
                <button className="btn btn-teal" onClick={() => onPause?.("30days")}
                  style={{ width:"100%", justifyContent:"center", padding:"14px", marginBottom:12 }}>
                  ✨ J'accepte le mois offert
                </button>
              </div>
            )}

            {reason === "usage" && (
              <div>
                <div style={{ color:"var(--muted)", fontSize:"0.88rem", textAlign:"center", marginBottom:24, lineHeight:1.6 }}>
                  La vie est chargée, on comprend. On peut <strong style={{ color:"var(--teal)" }}>mettre ton abonnement en pause 30 jours</strong> — reprends quand tu veux, sans frais.
                </div>
                <div style={{ background:"rgba(29,184,164,0.06)", border:"2px solid var(--teal)", borderRadius:16, padding:"20px", marginBottom:20, textAlign:"center" }}>
                  <div style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:"1.1rem", color:"var(--teal)", marginBottom:4 }}>⏸️ Pause 30 jours</div>
                  <div style={{ fontSize:"0.82rem", color:"var(--muted)" }}>Ton accès reste actif · Aucun débit · Reprends quand tu veux</div>
                </div>
                <button className="btn btn-teal" onClick={() => onPause?.("pause")}
                  style={{ width:"100%", justifyContent:"center", padding:"14px", marginBottom:12 }}>
                  ⏸️ Mettre en pause
                </button>
              </div>
            )}

            {reason === "features" && (
              <div>
                <div style={{ color:"var(--muted)", fontSize:"0.88rem", textAlign:"center", marginBottom:20, lineHeight:1.6 }}>
                  Dis-nous ce qui manque — on améliore ConcoursSanté chaque semaine.
                </div>
                <textarea placeholder="Quelle fonctionnalité te manque ?" style={{ width:"100%", padding:"12px 16px", borderRadius:12, border:"1.5px solid var(--border)", fontFamily:"var(--font-body)", fontSize:"0.9rem", background:"var(--surface)", color:"var(--text)", minHeight:100, outline:"none", marginBottom:16, boxSizing:"border-box" }}/>
                <button className="btn btn-teal" onClick={() => setStep(3)}
                  style={{ width:"100%", justifyContent:"center", padding:"14px", marginBottom:12 }}>
                  Envoyer et continuer →
                </button>
              </div>
            )}

            <button onClick={() => setStep(3)}
              style={{ width:"100%", background:"none", border:"none", cursor:"pointer", color:"var(--muted)", fontFamily:"var(--font-body)", fontSize:"0.82rem", padding:"10px" }}>
              Non merci, je veux quand même résilier
            </button>

            <button onClick={onKeep}
              style={{ width:"100%", background:"none", border:"none", cursor:"pointer", color:"var(--teal)", fontFamily:"var(--font-display)", fontWeight:700, fontSize:"0.88rem", padding:"8px" }}>
              ← Finalement je reste !
            </button>
          </div>
        )}

        {/* ÉTAPE 3 — Confirmation finale */}
        {step === 3 && (
          <div className="fade-up">
            <div style={{ fontSize:40, textAlign:"center", marginBottom:16 }}>
              {reason === "concours" ? "🎓" : "👋"}
            </div>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:"1.3rem", color:"var(--text)", textAlign:"center", marginBottom:8 }}>
              {reason === "concours" ? "Bonne chance pour ton concours !" : "On se quitte là ?"}
            </div>
            <div style={{ color:"var(--muted)", fontSize:"0.85rem", textAlign:"center", marginBottom:28, lineHeight:1.6 }}>
              {reason === "concours"
                ? `${firstName}, tu as travaillé dur. On espère de tout cœur que tu vas réussir ! Reviens nous dire si ça s'est bien passé. 🍀`
                : `Ton accès Premium reste actif jusqu'à la fin de la période en cours. Tu pourras te réabonner à tout moment.`
              }
            </div>

            <div style={{ background:"rgba(10,35,66,0.04)", border:"1px solid var(--border)", borderRadius:14, padding:"16px 20px", marginBottom:24 }}>
              <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"0.82rem", color:"var(--text)", marginBottom:8 }}>Récap résiliation</div>
              <div style={{ fontSize:"0.82rem", color:"var(--muted)", lineHeight:1.8 }}>
                ✓ Résiliation immédiate<br/>
                ✓ Accès maintenu jusqu'à fin de période<br/>
                ✓ Aucun frais supplémentaire<br/>
                ✓ Réabonnement possible à tout moment
              </div>
            </div>

            <button className="btn" onClick={handleConfirmCancel} disabled={loading}
              style={{ width:"100%", justifyContent:"center", padding:"14px", background:"rgba(255,107,53,0.08)", color:"var(--orange)", border:"2px solid rgba(255,107,53,0.2)", marginBottom:12 }}>
              {loading ? "..." : "Confirmer la résiliation"}
            </button>

            <button onClick={onKeep}
              style={{ width:"100%", background:"none", border:"none", cursor:"pointer", color:"var(--teal)", fontFamily:"var(--font-display)", fontWeight:700, fontSize:"0.9rem", padding:"12px" }}>
              ← Finalement je reste !
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

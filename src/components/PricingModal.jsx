// src/components/PricingModal.jsx
import { useState } from "react";

export function PricingModal({ onClose, user, onShowAuth }) {
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);

  const handleUpgrade=async()=>{
    if(!user){onClose();onShowAuth?.();return;}
    setLoading(true);setError(null);
    try{
      const res=await fetch("/api/create-checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:user.id,userEmail:user.email})});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||"Erreur paiement");
      window.location.href=data.url;
    }catch(e){setError(e.message);setLoading(false);}
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(10,35,66,0.55)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(4px)"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="fade-up card" style={{width:"100%",maxWidth:500,padding:32}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.3rem",color:"var(--text)"}}>Passer Premium 👑</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:"1.2rem",color:"var(--muted)"}}>✕</button>
        </div>
        <p style={{color:"var(--muted)",fontSize:"0.88rem",marginBottom:24}}>Accès illimité · Sans engagement · Résiliable à tout moment</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
          <div style={{background:"rgba(10,35,66,0.03)",border:"1px solid var(--border)",borderRadius:16,padding:20}}>
            <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:"0.8rem",color:"var(--muted)",letterSpacing:1,marginBottom:12,textTransform:"uppercase"}}>Gratuit</div>
            <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"2rem",color:"var(--text)",marginBottom:16}}>0€</div>
            {["3 quiz/jour","5 concours","Scores et badges"].map(f=><div key={f} style={{color:"var(--muted)",fontSize:"0.82rem",marginBottom:6}}>✓ {f}</div>)}
          </div>
          <div style={{background:"var(--navy)",borderRadius:16,padding:20,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:12,right:12,background:"var(--orange)",color:"#fff",borderRadius:20,padding:"3px 10px",fontSize:"0.7rem",fontWeight:700}}>⭐ Populaire</div>
            <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:"0.8rem",color:"rgba(29,184,164,0.8)",letterSpacing:1,marginBottom:12,textTransform:"uppercase"}}>Premium</div>
            <div style={{marginBottom:16}}><span style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"2rem",color:"#fff"}}>9€</span><span style={{fontSize:"0.78rem",color:"rgba(255,255,255,0.4)",marginLeft:6}}>/mois</span></div>
            {["Quiz illimités","Examens blancs","Flashcards","Tous les concours","Stats avancées"].map(f=><div key={f} style={{color:"rgba(255,255,255,0.85)",fontSize:"0.82rem",marginBottom:6}}>✓ {f}</div>)}
          </div>
        </div>
        {error&&<div style={{marginBottom:16,background:"#FEE",border:"1px solid #FCC",borderRadius:8,padding:"10px 14px",fontSize:"0.85rem",color:"#C00"}}>{error}</div>}
        <button className="btn btn-teal" onClick={handleUpgrade} disabled={loading} style={{width:"100%",justifyContent:"center",fontSize:"1rem",padding:"14px"}}>
          {loading?"Redirection...":user?"🚀 Commencer l'essai gratuit 7 jours":"🔐 Créer un compte pour continuer"}
        </button>
      </div>
    </div>
  );
}

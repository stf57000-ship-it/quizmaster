// src/components/ChallengeCard.jsx
import { useState } from "react";
import { CONCOURS } from "../lib/constants.js";

export function generateChallengeLink(concoursKey, score, total, userName) {
  const data=btoa(JSON.stringify({c:concoursKey,s:score,t:total,n:userName,d:new Date().toLocaleDateString("fr-FR")}));
  return `${window.location.origin}?defi=${data}`;
}

export function readChallengeFromURL() {
  const raw=new URLSearchParams(window.location.search).get("defi");
  if(!raw) return null;
  try{return JSON.parse(atob(raw));}catch{return null;}
}

export function ChallengeBanner({ challenge, onAccept, onDismiss }) {
  const concours=CONCOURS[challenge.c];
  const percent=Math.round((challenge.s/challenge.t)*100);
  return (
    <div className="fade-up" style={{background:"linear-gradient(135deg,#0A2342,#1a3a5c)",borderRadius:18,padding:"20px 24px",marginBottom:20,border:"2px solid rgba(29,184,164,0.3)"}}>
      <div style={{fontSize:"0.72rem",color:"var(--teal)",fontWeight:700,letterSpacing:2,fontFamily:"var(--font-display)",textTransform:"uppercase",marginBottom:8}}>⚔️ Défi reçu !</div>
      <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1rem",color:"#fff",marginBottom:4}}>{challenge.n} te défie sur {concours?.label} !</div>
      <div style={{color:"rgba(255,255,255,0.6)",fontSize:"0.85rem",marginBottom:16}}>Son score : <strong style={{color:"var(--teal)"}}>{percent}%</strong> ({challenge.s}/{challenge.t}) — peux-tu faire mieux ?</div>
      <div style={{display:"flex",gap:10}}>
        <button className="btn btn-teal" onClick={()=>onAccept(challenge.c)} style={{flex:1,justifyContent:"center",padding:"11px"}}>⚔️ Relever le défi</button>
        <button className="btn btn-ghost" onClick={onDismiss} style={{padding:"11px 16px"}}>Ignorer</button>
      </div>
    </div>
  );
}

export function ChallengeButton({ score, total, concoursKey, userName }) {
  const [copied, setCopied] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const link = generateChallengeLink(concoursKey, score, total, userName);
  const percent = Math.round((score/total)*100);
  const concours = CONCOURS[concoursKey];
  const text = `⚔️ Je t'défie sur le concours ${concours?.label} ! J'ai fait ${percent}% — peux-tu faire mieux ? ${link}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCopyFull = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleShare = async () => {
    // Sur mobile : partage natif
    if (navigator.share) {
      try {
        await navigator.share({ title:"Défi ConcoursSanté", text });
        return;
      } catch {}
    }
    // Sur desktop : afficher les options
    setShowOptions(s => !s);
  };

  return (
    <div style={{marginTop:10}}>
      <button className="btn" onClick={handleShare}
        style={{width:"100%",justifyContent:"center",padding:"13px",background:"rgba(255,107,53,0.1)",color:"var(--orange)",border:"2px solid rgba(255,107,53,0.2)"}}>
        {copied ? "✅ Copié !" : "⚔️ Défier un ami"}
      </button>

      {showOptions && (
        <div className="fade-in card" style={{marginTop:8,padding:16,display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontSize:"0.75rem",color:"var(--muted)",fontFamily:"var(--font-display)",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>
            Partager via
          </div>

          {/* WhatsApp */}
          <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"
            style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"rgba(37,211,102,0.08)",border:"1px solid rgba(37,211,102,0.2)",borderRadius:10,textDecoration:"none",color:"var(--text)"}}>
            <span style={{fontSize:22}}>💬</span>
            <span style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:"0.88rem"}}>WhatsApp</span>
          </a>

          {/* SMS */}
          <a href={`sms:?body=${encodeURIComponent(text)}`}
            style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"rgba(29,184,164,0.06)",border:"1px solid rgba(29,184,164,0.15)",borderRadius:10,textDecoration:"none",color:"var(--text)"}}>
            <span style={{fontSize:22}}>📱</span>
            <span style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:"0.88rem"}}>SMS</span>
          </a>

          {/* Copier le message complet */}
          <button onClick={handleCopyFull}
            style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"rgba(123,97,255,0.06)",border:"1px solid rgba(123,97,255,0.15)",borderRadius:10,cursor:"pointer",textAlign:"left",fontFamily:"var(--font-body)"}}>
            <span style={{fontSize:22}}>📋</span>
            <span style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:"0.88rem",color:"var(--text)"}}>Copier le message</span>
          </button>

          {/* Copier le lien seul */}
          <button onClick={handleCopyLink}
            style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"rgba(10,35,66,0.04)",border:"1px solid var(--border)",borderRadius:10,cursor:"pointer",textAlign:"left",fontFamily:"var(--font-body)"}}>
            <span style={{fontSize:22}}>🔗</span>
            <div>
              <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:"0.88rem",color:"var(--text)"}}>Copier le lien</div>
              <div style={{fontSize:"0.72rem",color:"var(--muted)",marginTop:2,wordBreak:"break-all"}}>{link.slice(0,50)}...</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

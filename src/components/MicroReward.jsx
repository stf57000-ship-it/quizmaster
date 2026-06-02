// src/components/MicroReward.jsx
import { useEffect, useState } from "react";
import { triggerConfetti } from "../lib/psychology.js";

export function SurpriseReward({ reward, onClose }) {
  useEffect(()=>{triggerConfetti();const t=setTimeout(onClose,5000);return()=>clearTimeout(t);},[]);
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(10,35,66,0.7)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(6px)"}}>
      <div className="fade-up card" style={{width:"100%",maxWidth:360,padding:"40px 32px",textAlign:"center",border:"2px solid #FFB800",boxShadow:"0 0 60px rgba(255,184,0,0.3)"}}>
        <div style={{fontSize:72,marginBottom:16,animation:"float 2s ease-in-out infinite"}}>{reward.icon}</div>
        <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.6rem",color:"var(--text)",marginBottom:8}}>{reward.title}</div>
        <div style={{color:"var(--muted)",fontSize:"0.9rem",marginBottom:20}}>{reward.desc}</div>
        <div style={{background:"rgba(255,184,0,0.1)",border:"1px solid rgba(255,184,0,0.3)",borderRadius:12,padding:"10px 20px",display:"inline-block"}}>
          <span style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.3rem",color:"#FFB800"}}>+{reward.points} pts</span>
        </div>
        <button onClick={onClose} style={{display:"block",width:"100%",marginTop:20,background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:"0.82rem"}}>Continuer →</button>
      </div>
    </div>
  );
}

export function StreakWarning({ warning, onRevise, onDismiss }) {
  if (!warning) return null;
  return (
    <div className="slide-in" style={{background:warning.urgent?"rgba(255,107,53,0.1)":"rgba(255,152,0,0.08)",border:`2px solid ${warning.urgent?"var(--orange)":"#FF9800"}`,borderRadius:14,padding:"14px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
      <div style={{flex:1}}>
        <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:"0.9rem",color:warning.urgent?"var(--orange)":"#E65100"}}>{warning.message}</div>
        <div style={{fontSize:"0.76rem",color:"var(--muted)",marginTop:3}}>{warning.sub}</div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={onRevise} style={{background:warning.urgent?"var(--orange)":"#FF9800",color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontFamily:"var(--font-display)",fontWeight:800,fontSize:"0.82rem",whiteSpace:"nowrap"}}>Réviser !</button>
        <button onClick={onDismiss} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:"1rem"}}>✕</button>
      </div>
    </div>
  );
}

export function LevelBadge({ points, level, compact=false }) {
  if (compact) return (
    <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,184,0,0.1)",border:"1px solid rgba(255,184,0,0.2)",borderRadius:20,padding:"4px 10px"}}>
      <span style={{fontSize:14}}>{level.icon}</span>
      <span style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:"0.75rem",color:"#A07800"}}>{points} pts</span>
    </div>
  );
  return (
    <div className="card" style={{padding:"16px 20px",display:"flex",alignItems:"center",gap:16}}>
      <div style={{fontSize:36}}>{level.icon}</div>
      <div style={{flex:1}}>
        <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1rem",color:"var(--text)"}}>Niveau {level.level} — {level.label}</div>
        <div style={{fontSize:"0.78rem",color:"var(--muted)",marginTop:3}}>{points} points</div>
        {level.next && (
          <div style={{marginTop:8}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.7rem",color:"var(--muted)",marginBottom:4}}>
              <span>Prochain niveau</span><span>{level.next-points} pts restants</span>
            </div>
            <div style={{height:5,background:"var(--border)",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${Math.round((points/level.next)*100)}%`,background:"linear-gradient(90deg,#FFB800,#FF9800)",borderRadius:3,transition:"width 0.6s ease"}}/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function CuriosityHook({ message, onAction }) {
  if (!message) return null;
  return (
    <div className="card fade-in" style={{padding:"14px 18px",background:"rgba(123,97,255,0.06)",border:"1px solid rgba(123,97,255,0.2)",cursor:"pointer",transition:"all 0.2s",marginBottom:16}} onClick={onAction}
      onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:24}}>{message.icon}</span>
        <div style={{flex:1}}>
          <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:"0.88rem",color:"var(--text)"}}>{message.text}</div>
          <div style={{fontSize:"0.78rem",color:"var(--purple)",fontWeight:600,marginTop:3}}>{message.cta}</div>
        </div>
        <span style={{color:"var(--purple)",fontSize:"1.2rem"}}>→</span>
      </div>
    </div>
  );
}

export function WelcomeBack({ message, onDismiss }) {
  const [visible,setVisible]=useState(true);
  useEffect(()=>{const t=setTimeout(()=>{setVisible(false);onDismiss?.();},4000);return()=>clearTimeout(t);},[]);
  if (!visible||!message) return null;
  return (
    <div className="slide-in" style={{background:"rgba(29,184,164,0.08)",border:"1px solid rgba(29,184,164,0.2)",borderRadius:14,padding:"12px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:22}}>{message.icon}</span>
      <span style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:"0.88rem",color:"var(--text)"}}>{message.text}</span>
    </div>
  );
}

// src/components/UI.jsx
import { useState, useEffect } from "react";

export function ProgressRing({ value, max, color, size=80 }) {
  const pct=Math.min(value/max,1), r=(size-8)/2, circ=2*Math.PI*r;
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)",flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(10,35,66,0.08)" strokeWidth={4}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4} strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round" style={{transition:"stroke-dashoffset 0.6s ease"}}/>
    </svg>
  );
}

export function BadgeNotification({ badge, onClose }) {
  useEffect(()=>{const t=setTimeout(onClose,4000);return()=>clearTimeout(t);},[]);
  return (
    <div style={{position:"fixed",bottom:90,right:20,background:"var(--surface)",border:"2px solid #FFB800",borderRadius:18,padding:"14px 18px",boxShadow:"0 8px 32px rgba(0,0,0,0.15)",zIndex:1000,display:"flex",alignItems:"center",gap:12,maxWidth:280,animation:"slideUp 0.4s ease"}}>
      <div style={{fontSize:32}}>{badge.icon}</div>
      <div>
        <div style={{fontSize:"0.68rem",color:"#FFB800",fontWeight:700,letterSpacing:1,fontFamily:"var(--font-display)",textTransform:"uppercase"}}>Badge débloqué !</div>
        <div style={{fontFamily:"var(--font-display)",fontWeight:800,color:"var(--text)",fontSize:"0.9rem"}}>{badge.label}</div>
        <div style={{fontSize:"0.75rem",color:"var(--muted)"}}>{badge.desc}</div>
      </div>
    </div>
  );
}

export function WeekChart({ history={} }) {
  const days=[];
  for(let i=6;i>=0;i--){const d=new Date(Date.now()-i*86400000);days.push({label:d.toLocaleDateString("fr-FR",{weekday:"short"}),data:history[d.toDateString()]||null});}
  const maxQ=Math.max(1,...days.map(d=>d.data?.quizzes||0));
  return (
    <div style={{display:"flex",gap:6,alignItems:"flex-end",height:60}}>
      {days.map((d,i)=>(
        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
          <div style={{width:"100%",borderRadius:6,background:d.data?"var(--teal)":"rgba(10,35,66,0.06)",height:d.data?Math.max(8,(d.data.quizzes/maxQ)*44):8,transition:"height 0.4s ease"}}/>
          <div style={{fontSize:"0.65rem",color:"var(--muted)",fontWeight:600}}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

export function TimerBar({ value, max, color="var(--teal)" }) {
  const pct=Math.max(0,Math.min(1,value/max));
  return (
    <div style={{height:4,background:"rgba(10,35,66,0.08)",borderRadius:2,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${pct*100}%`,background:value<=5?"var(--orange)":color,borderRadius:2,transition:"width 1s linear,background 0.3s"}}/>
    </div>
  );
}

export function LoadingScreen({ mode, concoursIcon }) {
  const [msgIdx,setMsgIdx]=useState(0);
  const messages=["L'IA analyse les référentiels...","Génération des questions...","Vérification pédagogique...","Presque prêt..."];
  useEffect(()=>{const i=setInterval(()=>setMsgIdx(m=>(m+1)%4),1800);return()=>clearInterval(i);},[]);
  const label={exam:"Préparation examen blanc...",flashcards:"Génération flashcards...",errors:"Analyse de tes erreurs...",quiz:"Génération du quiz IA..."}[mode]||"Chargement...";
  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:24,padding:24}}>
      <div style={{position:"relative"}}>
        <div className="spinner" style={{width:68,height:68}}/>
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:24}}>{concoursIcon||"🩺"}</div>
      </div>
      <div style={{textAlign:"center"}}>
        <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:"1.05rem",color:"var(--text)",marginBottom:6}}>{label}</div>
        <div style={{color:"var(--muted)",fontSize:"0.85rem"}}>{messages[msgIdx]}</div>
      </div>
    </div>
  );
}

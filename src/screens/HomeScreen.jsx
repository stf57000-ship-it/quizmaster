// src/screens/HomeScreen.jsx
import { useState } from "react";
import { CONCOURS, CONCOURS_CATEGORIES } from "../lib/constants.js";
import { getStreak, getGlobalAccuracy } from "../lib/progress.js";
import { quizPreloader } from "../lib/ai.js";
import { getActiveCandidates } from "../lib/psychology.js";

const ALL_MODES=[
  {id:"quiz",      icon:"🧠",label:"Quiz IA",   color:"#1DB8A4"},
  {id:"express",   icon:"⚡",label:"Express",   color:"#FF9800"},
  {id:"exam",      icon:"📋",label:"Examen",    color:"#2E86AB"},
  {id:"errors",    icon:"🎯",label:"Erreurs",   color:"#FF6B35"},
  {id:"flashcards",icon:"🗂️",label:"Flashcards",color:"#7B61FF"},
];

export function HomeScreen({ appState, user, userName, isPremium, dailyRemaining, onStart, onShowAuth, onShowPricing, onUpdateState, onConcoursSelect }) {
  const [mode,setMode]=useState("quiz");
  const [selectedConcours,setSelectedConcours]=useState(appState.preferredConcours||null);
  const [difficulty,setDifficulty]=useState(appState.preferredNiveau==="debutant"?1:appState.preferredNiveau==="avance"?3:2);
  const [selectedTheme,setSelectedTheme]=useState(null);
  const [showDatePicker,setShowDatePicker]=useState(false);

  const streak=getStreak(appState);
  const globalAccuracy=getGlobalAccuracy(appState);
  const concours=selectedConcours?CONCOURS[selectedConcours]:null;
  const activeCandidates=selectedConcours?getActiveCandidates(selectedConcours):null;

  const handleSelectConcours=(key)=>{
    setSelectedConcours(key);setSelectedTheme(null);
    onConcoursSelect?.(key);
    if(mode==="quiz")quizPreloader.preload(key,difficulty,null);
  };

  const handleStart=()=>{
    if(!selectedConcours)return;
    if(!isPremium&&dailyRemaining<=0){onShowPricing();return;}
    onStart({mode,concours:selectedConcours,difficulty,theme:selectedTheme});
  };

  const daysLeft=appState.concourDate?Math.max(0,Math.ceil((new Date(appState.concourDate)-new Date())/86400000)):null;
  const grouped=Object.entries(CONCOURS_CATEGORIES).map(([catKey,cat])=>({catKey,cat,items:Object.entries(CONCOURS).filter(([,c])=>c.category===catKey)}));
  const btnColors={quiz:"var(--teal)",express:"#FF9800",exam:"var(--blue)",errors:"var(--orange)",flashcards:"var(--purple)"};
  const btnLabels={quiz:"✨ Générer le quiz IA",express:"⚡ Quiz express — 5 questions",exam:"🏁 Lancer l'examen blanc",errors:"🎯 Réviser mes erreurs",flashcards:"🗂️ Générer les flashcards"};

  return (
    <div className="fade-up">
      {user&&<div style={{background:"rgba(29,184,164,0.06)",border:"1px solid rgba(29,184,164,0.15)",borderRadius:14,padding:"12px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
        <div style={{fontSize:24}}>👋</div>
        <div>
          <div style={{fontFamily:"var(--font-display)",fontWeight:800,color:"var(--text)",fontSize:"0.92rem"}}>Bonjour {userName} !{isPremium&&" 👑"}</div>
          <div style={{fontSize:"0.78rem",color:"var(--muted)"}}>{streak>0?`🔥 ${streak} jours de suite — continue !`:"Prêt à réviser aujourd'hui ?"}</div>
        </div>
      </div>}

      {!isPremium&&user&&<div style={{background:dailyRemaining<=0?"rgba(255,107,53,0.08)":"rgba(29,184,164,0.05)",border:`1px solid ${dailyRemaining<=0?"rgba(255,107,53,0.2)":"rgba(29,184,164,0.12)"}`,borderRadius:12,padding:"10px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:"0.82rem",color:"var(--muted)"}}>{dailyRemaining<=0?"🔒 Limite quotidienne atteinte":`✨ ${dailyRemaining} quiz gratuit${dailyRemaining>1?"s":""} restant${dailyRemaining>1?"s":""}`}</div>
        <button onClick={onShowPricing} style={{background:"none",border:"none",cursor:"pointer",fontSize:"0.78rem",color:"var(--teal)",fontWeight:700,fontFamily:"var(--font-display)"}}>Illimité →</button>
      </div>}

      {daysLeft!==null&&daysLeft>0&&<div style={{background:`${daysLeft<=7?"var(--orange)":daysLeft<=30?"#FF9800":"var(--teal)"}10`,border:`1px solid ${daysLeft<=7?"var(--orange)":daysLeft<=30?"#FF9800":"var(--teal)"}25`,borderRadius:14,padding:"12px 18px",display:"flex",gap:12,alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:24}}>📅</div>
        <div>
          <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:"0.92rem",color:daysLeft<=7?"var(--orange)":"var(--teal)"}}>J-{daysLeft} avant ton concours</div>
          <div style={{fontSize:"0.76rem",color:"var(--muted)"}}>{daysLeft<=7?"Dernière ligne droite !":daysLeft<=30?"Intensifie ta préparation !":"Continue la régularité."}</div>
        </div>
      </div>}

      {appState.totalQuizzes>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:22}}>
        {[{label:"Quiz",value:appState.totalQuizzes||0,icon:"🎯"},{label:"Streak",value:`${streak}j`,icon:"🔥"},{label:"Précision",value:`${globalAccuracy}%`,icon:"📊"}].map(s=>(
          <div key={s.label} className="card" style={{textAlign:"center",padding:"14px 10px"}}>
            <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
            <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.3rem",color:"var(--text)"}}>{s.value}</div>
            <div style={{fontSize:"0.72rem",color:"var(--muted)",marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>}

      <div style={{marginBottom:20}}>
        <div className="section-label" style={{marginBottom:12}}>Mode</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6}}>
          {ALL_MODES.map(m=>(
            <button key={m.id} onClick={()=>setMode(m.id)} style={{background:mode===m.id?`${m.color}15`:"var(--surface)",border:`2px solid ${mode===m.id?m.color:"var(--border)"}`,borderRadius:12,padding:"10px 4px",cursor:"pointer",transition:"all 0.2s",textAlign:"center",transform:mode===m.id?"translateY(-2px)":"none"}}>
              <div style={{fontSize:18,marginBottom:4}}>{m.icon}</div>
              <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:"0.7rem",color:mode===m.id?m.color:"var(--text)"}}>{m.label}</div>
            </button>
          ))}
        </div>
        {mode==="express"&&<div className="fade-in" style={{marginTop:10,background:"rgba(255,152,0,0.08)",border:"1px solid rgba(255,152,0,0.2)",borderRadius:10,padding:"10px 14px",fontSize:"0.8rem",color:"#E65100"}}>⚡ 5 questions · 15 secondes chacune · Parfait pour 3 minutes</div>}
      </div>

      {grouped.map(({catKey,cat,items})=>(
        <div key={catKey} style={{marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><span style={{fontSize:16}}>{cat.icon}</span><span className="section-label">{cat.label}</span></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:9}}>
            {items.map(([key,c])=>(
              <button key={key} onClick={()=>handleSelectConcours(key)} style={{background:selectedConcours===key?c.colorLight:"var(--surface)",border:`2px solid ${selectedConcours===key?c.color:"var(--border)"}`,borderRadius:14,padding:"14px 12px",cursor:"pointer",transition:"all 0.2s",textAlign:"left",transform:selectedConcours===key?"translateY(-2px)":"none",boxShadow:selectedConcours===key?`0 6px 18px ${c.color}25`:"none"}}>
                <div style={{fontSize:22,marginBottom:5}}>{c.icon}</div>
                <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:"0.82rem",color:selectedConcours===key?c.color:"var(--text)",lineHeight:1.3}}>{c.label}</div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {selectedConcours&&activeCandidates&&<div style={{display:"flex",alignItems:"center",gap:6,fontSize:"0.75rem",color:"var(--muted)",marginBottom:16}}>
        <span>👥</span><span><strong style={{color:"var(--text)"}}>{activeCandidates}</strong> candidats révisent ce concours aujourd'hui</span>
      </div>}

      {selectedConcours&&!["exam","express"].includes(mode)&&<div style={{marginBottom:16}} className="fade-in">
        <div className="section-label" style={{marginBottom:10}}>Difficulté</div>
        <div style={{display:"flex",gap:8}}>
          {[{v:1,l:"Débutant",c:"var(--teal)"},{v:2,l:"Intermédiaire",c:"var(--blue)"},{v:3,l:"Expert",c:"var(--orange)"}].map(d=>(
            <button key={d.v} onClick={()=>setDifficulty(d.v)} style={{flex:1,background:difficulty===d.v?`${d.c}15`:"var(--surface)",border:`2px solid ${difficulty===d.v?d.c:"var(--border)"}`,borderRadius:10,padding:"10px 6px",cursor:"pointer",transition:"all 0.2s",fontFamily:"var(--font-display)",fontWeight:800,fontSize:"0.82rem",color:difficulty===d.v?d.c:"var(--muted)"}}>{d.l}</button>
          ))}
        </div>
      </div>}

      {selectedConcours&&["quiz","flashcards","express"].includes(mode)&&<div style={{marginBottom:20}} className="fade-in">
        <div className="section-label" style={{marginBottom:10}}>Thème <span style={{color:"var(--muted)",fontWeight:400,textTransform:"none",letterSpacing:0,fontSize:"0.85rem"}}>(optionnel)</span></div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          <button onClick={()=>setSelectedTheme(null)} style={{background:!selectedTheme?"var(--navy)":"var(--surface)",border:`1.5px solid ${!selectedTheme?"var(--navy)":"var(--border)"}`,borderRadius:20,padding:"6px 13px",cursor:"pointer",color:!selectedTheme?"#fff":"var(--muted)",fontSize:"0.8rem",fontWeight:600,transition:"all 0.2s",fontFamily:"var(--font-display)"}}>Tous</button>
          {CONCOURS[selectedConcours].themes.map(t=>(
            <button key={t} onClick={()=>setSelectedTheme(t)} style={{background:selectedTheme===t?concours.colorLight:"var(--surface)",border:`1.5px solid ${selectedTheme===t?concours.color:"var(--border)"}`,borderRadius:20,padding:"6px 13px",cursor:"pointer",color:selectedTheme===t?concours.color:"var(--muted)",fontSize:"0.8rem",fontWeight:600,transition:"all 0.2s",fontFamily:"var(--font-display)"}}>{t}</button>
          ))}
        </div>
      </div>}

      <button id="start-btn" onClick={handleStart} disabled={!selectedConcours} style={{width:"100%",justifyContent:"center",fontSize:"0.98rem",padding:"14px",opacity:selectedConcours?1:0.4,cursor:selectedConcours?"pointer":"not-allowed",background:btnColors[mode],color:"#fff",borderRadius:12,border:"none",fontFamily:"var(--font-display)",fontWeight:800,display:"flex",alignItems:"center",gap:8,transition:"transform 0.2s,box-shadow 0.2s"}}
        onMouseEnter={e=>{if(selectedConcours)e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.transform="";}}>
        {btnLabels[mode]}
      </button>

      <div style={{marginTop:12,textAlign:"center"}}>
        <button onClick={()=>setShowDatePicker(s=>!s)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:"0.8rem",color:"var(--muted)",fontFamily:"var(--font-body)"}}>
          📅 {appState.concourDate?`Concours le ${new Date(appState.concourDate).toLocaleDateString("fr-FR")}`:"Ajouter la date de mon concours"}
        </button>
      </div>
      {showDatePicker&&<div className="card fade-in" style={{marginTop:12}}>
        <div style={{fontFamily:"var(--font-display)",fontWeight:800,color:"var(--text)",marginBottom:10}}>📅 Date de ton concours</div>
        <div style={{display:"flex",gap:8}}>
          <input type="date" className="input" defaultValue={appState.concourDate||""} onChange={e=>onUpdateState({concourDate:e.target.value})} style={{flex:1}}/>
          <button className="btn btn-teal" onClick={()=>setShowDatePicker(false)} style={{padding:"9px 16px"}}>OK</button>
        </div>
      </div>}

      {!user&&appState.totalQuizzes>=2&&<div style={{marginTop:16,background:"linear-gradient(135deg,#0A2342,#1a3a5c)",borderRadius:16,padding:"18px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontFamily:"var(--font-display)",fontWeight:800,color:"#fff",fontSize:"0.92rem"}}>Sauvegarde ta progression !</div>
          <div style={{fontSize:"0.78rem",color:"rgba(255,255,255,0.5)",marginTop:3}}>Crée un compte gratuit.</div>
        </div>
        <button className="btn btn-teal" onClick={onShowAuth} style={{padding:"9px 16px",whiteSpace:"nowrap",fontSize:"0.82rem"}}>Créer un compte</button>
      </div>}
    </div>
  );
}

// src/screens/OnboardingScreen.jsx
import { useState } from "react";
import { CONCOURS, CONCOURS_CATEGORIES } from "../lib/constants.js";

export function OnboardingScreen({ onComplete }) {
  const [step,setStep]=useState(0);
  const [selected,setSelected]=useState({concours:null,niveau:null,objectif:null});
  const steps=["concours","niveau","objectif"];
  const progress=((step+1)/steps.length)*100;
  const canNext=()=>[!!selected.concours,!!selected.niveau,!!selected.objectif][step];
  const handleNext=()=>step<steps.length-1?setStep(s=>s+1):onComplete(selected);

  const grouped=Object.entries(CONCOURS_CATEGORIES).map(([catKey,cat])=>({catKey,cat,items:Object.entries(CONCOURS).filter(([,c])=>c.category===catKey)}));

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"24px 24px 0"}}>
        <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.1rem",color:"var(--text)",marginBottom:20}}>🩺 ConcoursSanté</div>
        <div style={{height:4,background:"var(--border)",borderRadius:2,marginBottom:8}}>
          <div style={{height:"100%",width:`${progress}%`,background:"var(--teal)",borderRadius:2,transition:"width 0.4s ease"}}/>
        </div>
        <div style={{fontSize:"0.75rem",color:"var(--muted)",marginBottom:28}}>{step+1} / {steps.length}</div>
      </div>

      <div style={{flex:1,padding:"0 24px 120px",overflowY:"auto"}}>
        {step===0&&(
          <div className="fade-up">
            <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.5rem",color:"var(--text)",marginBottom:8,lineHeight:1.3}}>Quel concours tu prépares ? 🎯</div>
            <div style={{color:"var(--muted)",fontSize:"0.88rem",marginBottom:24}}>On personnalise ton expérience.</div>
            {grouped.map(({catKey,cat,items})=>(
              <div key={catKey} style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><span>{cat.icon}</span><span className="section-label">{cat.label}</span></div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:8}}>
                  {items.map(([key,c])=>(
                    <button key={key} onClick={()=>setSelected(s=>({...s,concours:key}))} style={{background:selected.concours===key?c.colorLight:"var(--surface)",border:`2px solid ${selected.concours===key?c.color:"var(--border)"}`,borderRadius:14,padding:"14px 12px",cursor:"pointer",transition:"all 0.2s",textAlign:"left",transform:selected.concours===key?"translateY(-2px)":"none"}}>
                      <div style={{fontSize:22,marginBottom:6}}>{c.icon}</div>
                      <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:"0.82rem",color:selected.concours===key?c.color:"var(--text)",lineHeight:1.3}}>{c.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {step===1&&(
          <div className="fade-up">
            <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.5rem",color:"var(--text)",marginBottom:8,lineHeight:1.3}}>Tu en es où ? 📚</div>
            <div style={{color:"var(--muted)",fontSize:"0.88rem",marginBottom:28}}>On adapte la difficulté.</div>
            {[{id:"debutant",icon:"🌱",label:"Je débute",desc:"Je viens de commencer"},{id:"intermediaire",icon:"📖",label:"J'avance bien",desc:"Je révise depuis quelques semaines"},{id:"avance",icon:"🎯",label:"Je suis presque prêt",desc:"Le concours approche"}].map(n=>(
              <button key={n.id} onClick={()=>setSelected(s=>({...s,niveau:n.id}))} style={{width:"100%",background:selected.niveau===n.id?"rgba(29,184,164,0.08)":"var(--surface)",border:`2px solid ${selected.niveau===n.id?"var(--teal)":"var(--border)"}`,borderRadius:16,padding:"18px 20px",cursor:"pointer",transition:"all 0.2s",textAlign:"left",marginBottom:12,display:"flex",alignItems:"center",gap:16}}>
                <span style={{fontSize:32}}>{n.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:"0.95rem",color:selected.niveau===n.id?"var(--teal)":"var(--text)"}}>{n.label}</div>
                  <div style={{fontSize:"0.78rem",color:"var(--muted)",marginTop:3}}>{n.desc}</div>
                </div>
                {selected.niveau===n.id&&<span style={{color:"var(--teal)",fontSize:20}}>✓</span>}
              </button>
            ))}
          </div>
        )}

        {step===2&&(
          <div className="fade-up">
            <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.5rem",color:"var(--text)",marginBottom:8,lineHeight:1.3}}>C'est pour quand ? 📅</div>
            <div style={{color:"var(--muted)",fontSize:"0.88rem",marginBottom:28}}>On ajuste l'intensité.</div>
            {[{id:"1mois",icon:"🔥",label:"Moins d'1 mois",desc:"Mode intensif"},{id:"3mois",icon:"📅",label:"1 à 3 mois",desc:"Rythme régulier"},{id:"6mois",icon:"🌱",label:"Plus de 3 mois",desc:"Démarrage progressif"},{id:"inconnu",icon:"❓",label:"Je ne sais pas encore",desc:"On s'adapte"}].map(o=>(
              <button key={o.id} onClick={()=>setSelected(s=>({...s,objectif:o.id}))} style={{width:"100%",background:selected.objectif===o.id?"rgba(29,184,164,0.08)":"var(--surface)",border:`2px solid ${selected.objectif===o.id?"var(--teal)":"var(--border)"}`,borderRadius:16,padding:"18px 20px",cursor:"pointer",transition:"all 0.2s",textAlign:"left",marginBottom:12,display:"flex",alignItems:"center",gap:16}}>
                <span style={{fontSize:32}}>{o.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:"0.95rem",color:selected.objectif===o.id?"var(--teal)":"var(--text)"}}>{o.label}</div>
                  <div style={{fontSize:"0.78rem",color:"var(--muted)",marginTop:3}}>{o.desc}</div>
                </div>
                {selected.objectif===o.id&&<span style={{color:"var(--teal)",fontSize:20}}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,padding:"16px 24px 28px",background:"var(--bg)",borderTop:"1px solid var(--border)"}}>
        <button className="btn btn-teal" onClick={handleNext} disabled={!canNext()} style={{width:"100%",justifyContent:"center",padding:"14px",fontSize:"0.98rem"}}>
          {step===steps.length-1?"🚀 Commencer ma préparation !":"Continuer →"}
        </button>
      </div>
    </div>
  );
}

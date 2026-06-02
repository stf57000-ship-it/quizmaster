// src/components/AuthModal.jsx
import { useState } from "react";
import { supabase } from "../lib/supabase.js";

export function AuthModal({ onClose, onSuccess }) {
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [name,setName]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const [success,setSuccess]=useState(null);

  const handleSubmit=async()=>{
    setLoading(true);setError(null);
    try {
      if(mode==="login"){
        const{data,error}=await supabase.auth.signInWithPassword({email,password});
        if(error)throw error;
        onSuccess?.(data.user);onClose();
      }else if(mode==="register"){
        const{error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name}}});
        if(error)throw error;
        setSuccess("Compte créé ! Vérifiez votre email.");
        fetch("/api/send-email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"welcome",to:email,data:{name:name||email.split("@")[0]}})}).catch(()=>{});
      }else{
        const{error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${import.meta.env.VITE_APP_URL}/reset-password`});
        if(error)throw error;
        setSuccess("Email de réinitialisation envoyé !");
      }
    }catch(e){setError(e.message);}finally{setLoading(false);}
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(10,35,66,0.5)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="fade-up card" style={{width:"100%",maxWidth:420,padding:32}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.3rem",color:"var(--text)"}}>
            {mode==="login"?"Connexion":mode==="register"?"Créer un compte":"Mot de passe oublié"}
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:"1.2rem",color:"var(--muted)"}}>✕</button>
        </div>
        {mode!=="forgot"&&(
          <div style={{display:"flex",gap:8,marginBottom:24,background:"rgba(10,35,66,0.04)",borderRadius:12,padding:4}}>
            {["login","register"].map(m=>(
              <button key={m} onClick={()=>{setMode(m);setError(null);setSuccess(null);}} style={{flex:1,padding:"8px",borderRadius:9,border:"none",cursor:"pointer",background:mode===m?"var(--surface)":"transparent",fontFamily:"var(--font-display)",fontWeight:700,fontSize:"0.85rem",color:mode===m?"var(--text)":"var(--muted)",transition:"all 0.2s"}}>
                {m==="login"?"Connexion":"Inscription"}
              </button>
            ))}
          </div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {mode==="register"&&<input className="input" placeholder="Prénom" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>}
          <input className="input" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
          {mode!=="forgot"&&<input className="input" placeholder="Mot de passe" type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>}
        </div>
        {error&&<div style={{marginTop:12,background:"#FEE",border:"1px solid #FCC",borderRadius:8,padding:"10px 14px",fontSize:"0.85rem",color:"#C00"}}>{error}</div>}
        {success&&<div style={{marginTop:12,background:"#E8F9F7",border:"1px solid var(--teal)",borderRadius:8,padding:"10px 14px",fontSize:"0.85rem",color:"#0D8070"}}>{success}</div>}
        {!success&&<button className="btn btn-teal" onClick={handleSubmit} disabled={loading} style={{marginTop:20,width:"100%",justifyContent:"center",fontSize:"0.95rem",padding:"13px"}}>
          {loading?"...":{login:"Se connecter",register:"Créer mon compte",forgot:"Envoyer"}[mode]}
        </button>}
        {mode==="login"&&!success&&<button onClick={()=>{setMode("forgot");setError(null);}} style={{marginTop:12,width:"100%",background:"none",border:"none",cursor:"pointer",fontSize:"0.82rem",color:"var(--muted)"}}>Mot de passe oublié ?</button>}
        {mode==="forgot"&&<button onClick={()=>{setMode("login");setError(null);setSuccess(null);}} style={{marginTop:12,width:"100%",background:"none",border:"none",cursor:"pointer",fontSize:"0.82rem",color:"var(--teal)"}}>← Retour à la connexion</button>}
      </div>
    </div>
  );
}

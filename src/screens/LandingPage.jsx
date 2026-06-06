// src/screens/LandingPage.jsx
import { useState } from "react";

export function LandingPage({ onEnterApp, onShowAuth, onShowPricing }) {
  const [openFaq, setOpenFaq] = useState(null);
  const [reviewText, setReviewText] = useState("");
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewName, setReviewName] = useState("");
  const [reviewConcours, setReviewConcours] = useState("");
  const [reviews, setReviews] = useState([
    { name: "Sabrina M.", concours: "Aide-soignant", stars: 5, text: "Franchement je m'attendais pas à ce que ce soit aussi bien. Les questions sont vraiment dans le style du vrai concours. J'ai eu mon AS du premier coup 🙏" },
    { name: "Thomas", concours: "Sapeur-pompier", stars: 5, text: "J'utilisais ça tous les soirs avant de dormir, 10 questions rapides. Le mode express c'est parfait pour s'entrainer sans perdre de temps" },
    { name: "Inès", concours: "IFSI", stars: 4, text: "Bien pour réviser les bases, les explications après chaque question aident vraiment à comprendre pourquoi on s'est trompé. Juste le chargement parfois un peu long" },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitReview = () => {
    if (!reviewText.trim() || !reviewName.trim()) return;
    const words = reviewText.trim().split(/\s+/);
    const capped = words.slice(0, 30).join(" ") + (words.length > 30 ? "..." : "");
    setReviews(prev => [{ name: reviewName, concours: reviewConcours || "Candidat", stars: reviewStars, text: capped }, ...prev]);
    setReviewText(""); setReviewName(""); setReviewConcours(""); setReviewStars(5);
    setShowForm(false); setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const concours=[
    {icon:"👩‍⚕️",label:"Aide-soignant",cat:"Paramédical"},{icon:"💉",label:"IFSI",cat:"Paramédical"},{icon:"👶",label:"Auxiliaire puériculture",cat:"Paramédical"},
    {icon:"🚑",label:"Ambulancier",cat:"Paramédical"},{icon:"🔥",label:"Sapeur-Pompier",cat:"Sécurité"},{icon:"👮",label:"Gardien de la Paix",cat:"Sécurité"},
    {icon:"🎖️",label:"Gendarme",cat:"Sécurité"},{icon:"🏥",label:"Agent hospitalier",cat:"Fonction publique"},{icon:"🎓",label:"Bac Pro ASSP",cat:"Lycée Pro"},
    {icon:"🌱",label:"CAP AEPE",cat:"Lycée Pro"},{icon:"⚖️",label:"Surveillant pénitentiaire",cat:"Sécurité"},{icon:"🪖",label:"Armée de Terre",cat:"Défense"},
  ];

  const features=[
    {icon:"🧠",title:"Quiz IA personnalisés",desc:"Questions générées à la demande, adaptées à ton niveau et concours. Jamais deux fois les mêmes."},
    {icon:"📋",title:"Examens blancs 20 questions",desc:"Simule les vraies conditions du concours avec un timer. Suis ta progression semaine après semaine."},
    {icon:"🗂️",title:"Flashcards intelligentes",desc:"Mémorise les notions clés sur tous les thèmes de ton concours."},
    {icon:"🎯",title:"Révision ciblée sur tes erreurs",desc:"L'app mémorise tes erreurs et génère des quiz spécifiques pour les corriger."},
    {icon:"🔥",title:"Streak & récompenses",desc:"Maintiens ta série, débloque des badges, partage tes résultats. Système de niveaux motivant."},
    {icon:"📊",title:"Tableau de bord complet",desc:"Précision, progression hebdomadaire, classement — tout en un coup d'œil."},
  ];

  const faqs=[
    {q:"C'est vraiment gratuit ?",a:"Oui, 3 quiz par jour sans carte bancaire. Premium débloque un accès illimité à 9€/mois sans engagement."},
    {q:"Les questions sont fiables ?",a:"Les questions sont générées par Claude Haiku, un des meilleurs modèles IA du monde, spécialisé pour les concours français."},
    {q:"Comment annuler Premium ?",a:"En un clic depuis ton profil onglet Progrès, à tout moment. Pas d'engagement, pas de frais cachés."},
    {q:"Fonctionne sur mobile ?",a:"Oui, le site est optimisé mobile. Une app Android arrive prochainement."},
  ];

  return (
    <div style={{fontFamily:"var(--font-body)",background:"var(--bg)",minHeight:"100vh"}}>
      <nav style={{background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"14px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:50}}>
        <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.1rem",color:"var(--text)"}}>🩺 ConcoursSanté</div>
        <div style={{display:"flex",gap:10}}>
          <button className="btn btn-ghost" onClick={onShowAuth} style={{padding:"7px 14px",fontSize:"0.84rem"}}>Connexion</button>
          <button className="btn btn-teal" onClick={onEnterApp} style={{padding:"7px 14px",fontSize:"0.84rem"}}>Essayer gratuit →</button>
        </div>
      </nav>

      <section style={{maxWidth:700,margin:"0 auto",padding:"64px 24px 48px",textAlign:"center"}}>
        <div className="section-label" style={{marginBottom:16}}>Quiz IA pour concours professionnels</div>
        <h1 style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"clamp(2rem,5vw,3rem)",color:"var(--text)",lineHeight:1.2,marginBottom:20}}>Réussis ton concours avec l'IA 🎯 😊</h1>
        <p style={{fontSize:"1.05rem",color:"var(--muted)",lineHeight:1.7,marginBottom:36,maxWidth:560,margin:"0 auto 36px"}}>Des quiz générés à la demande, des examens blancs 20 questions, des flashcards intelligentes — tout pour décrocher ton concours paramédical, sécurité ou fonction publique.</p>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:48}}>
          <button className="btn btn-teal" onClick={onEnterApp} style={{padding:"14px 32px",fontSize:"1rem"}}>✨ Commencer gratuitement</button>
          <button className="btn btn-ghost" onClick={onShowPricing} style={{padding:"14px 24px",fontSize:"1rem"}}>Voir les tarifs</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
          {[{value:"14",label:"Concours couverts"},{value:"IA",label:"Questions générées"},{value:"100%",label:"Gratuit pour débuter"}].map(s=>(
            <div key={s.label} className="card" style={{textAlign:"center",padding:"18px 10px"}}>
              <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.8rem",color:"var(--teal)",lineHeight:1}}>{s.value}</div>
              <div style={{fontSize:"0.78rem",color:"var(--muted)",marginTop:6}}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{background:"var(--surface)",padding:"48px 24px",borderTop:"1px solid var(--border)",borderBottom:"1px solid var(--border)"}}>
        <div style={{maxWidth:700,margin:"0 auto"}}>
          <h2 style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.6rem",color:"var(--text)",textAlign:"center",marginBottom:28}}>Quel est ton concours ?</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10}}>
            {concours.map(c=>(
              <button key={c.label} onClick={onEnterApp} style={{background:"var(--bg)",border:"1.5px solid var(--border)",borderRadius:14,padding:"14px 10px",cursor:"pointer",textAlign:"center",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--teal)";e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.transform="";}}>
                <div style={{fontSize:24,marginBottom:6}}>{c.icon}</div>
                <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:"0.8rem",color:"var(--text)",lineHeight:1.3}}>{c.label}</div>
                <div style={{fontSize:"0.68rem",color:"var(--muted)",marginTop:4}}>{c.cat}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section style={{maxWidth:700,margin:"0 auto",padding:"48px 24px"}}>
        <h2 style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.6rem",color:"var(--text)",textAlign:"center",marginBottom:32}}>Tout pour réussir</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
          {features.map(f=>(
            <div key={f.title} className="card" style={{padding:"22px 20px"}}>
              <div style={{fontSize:28,marginBottom:12}}>{f.icon}</div>
              <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:"0.95rem",color:"var(--text)",marginBottom:8}}>{f.title}</div>
              <div style={{fontSize:"0.83rem",color:"var(--muted)",lineHeight:1.6}}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section Avis ── */}
      <section style={{background:"var(--surface)",padding:"48px 24px",borderTop:"1px solid var(--border)",borderBottom:"1px solid var(--border)"}}>
        <div style={{maxWidth:700,margin:"0 auto"}}>
          <h2 style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.6rem",color:"var(--text)",textAlign:"center",marginBottom:8}}>Ce qu'ils en pensent</h2>
          <p style={{textAlign:"center",color:"var(--muted)",fontSize:"0.85rem",marginBottom:28}}>Avis de candidats qui utilisent ConcoursSanté</p>

          {/* Avis */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14,marginBottom:24}}>
            {reviews.map((r,i)=>(
              <div key={i} className="card fade-up" style={{padding:"18px 20px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:"0.88rem",color:"var(--text)"}}>{r.name}</div>
                    <div style={{fontSize:"0.72rem",color:"var(--muted)"}}>{r.concours}</div>
                  </div>
                  <div style={{color:"#FFB800",fontSize:"0.85rem"}}>{"★".repeat(r.stars)}{"☆".repeat(5-r.stars)}</div>
                </div>
                <p style={{fontSize:"0.83rem",color:"var(--muted)",lineHeight:1.6,margin:0}}>{r.text}</p>
              </div>
            ))}
          </div>

          {/* Bouton laisser un avis */}
          {!showForm && !submitted && (
            <div style={{textAlign:"center"}}>
              <button onClick={()=>setShowForm(true)} className="btn btn-ghost" style={{padding:"10px 24px",fontSize:"0.88rem"}}>
                ✍️ Laisser un avis
              </button>
            </div>
          )}

          {submitted && (
            <div className="fade-in" style={{textAlign:"center",padding:"12px",background:"rgba(29,184,164,0.1)",borderRadius:12,color:"var(--teal)",fontFamily:"var(--font-display)",fontWeight:700}}>
              ✅ Merci pour ton avis !
            </div>
          )}

          {/* Formulaire */}
          {showForm && (
            <div className="fade-in card" style={{padding:"20px",marginTop:8}}>
              <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:"0.9rem",color:"var(--text)",marginBottom:14}}>Ton avis</div>

              {/* Étoiles */}
              <div style={{display:"flex",gap:6,marginBottom:14}}>
                {[1,2,3,4,5].map(s=>(
                  <button key={s} onClick={()=>setReviewStars(s)}
                    style={{background:"none",border:"none",cursor:"pointer",fontSize:"1.4rem",color:s<=reviewStars?"#FFB800":"#DDD",padding:0,transition:"transform 0.1s"}}
                    onMouseEnter={e=>e.currentTarget.style.transform="scale(1.2)"}
                    onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
                    ★
                  </button>
                ))}
              </div>

              <input className="input" placeholder="Ton prénom *" value={reviewName} onChange={e=>setReviewName(e.target.value)} style={{marginBottom:10}}/>
              <input className="input" placeholder="Ton concours (ex: IFSI, Pompier...)" value={reviewConcours} onChange={e=>setReviewConcours(e.target.value)} style={{marginBottom:10}}/>
              <textarea className="input" placeholder="Ton avis en quelques mots... (3 lignes max)" value={reviewText} onChange={e=>setReviewText(e.target.value)}
                style={{minHeight:80,resize:"none",marginBottom:14,fontFamily:"var(--font-body)"}}/>

              <div style={{display:"flex",gap:10}}>
                <button className="btn btn-teal" onClick={handleSubmitReview} style={{flex:1,justifyContent:"center",padding:"11px"}}>Publier</button>
                <button className="btn btn-ghost" onClick={()=>setShowForm(false)} style={{padding:"11px 16px"}}>Annuler</button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section style={{maxWidth:600,margin:"0 auto",padding:"48px 24px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div className="card" style={{padding:"24px 20px"}}>
            <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:"0.75rem",color:"var(--muted)",letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Gratuit</div>
            <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"2rem",color:"var(--text)",marginBottom:16}}>0€</div>
            {["3 quiz/jour","5 concours","Scores & badges"].map(f=><div key={f} style={{fontSize:"0.82rem",color:"var(--muted)",marginBottom:6}}>✓ {f}</div>)}
            <button className="btn btn-ghost" onClick={onEnterApp} style={{width:"100%",justifyContent:"center",marginTop:16,padding:"11px"}}>Commencer</button>
          </div>
          <div style={{background:"var(--navy)",borderRadius:18,padding:"24px 20px",position:"relative"}}>
            <div style={{position:"absolute",top:12,right:12,background:"var(--orange)",color:"#fff",borderRadius:20,padding:"3px 10px",fontSize:"0.68rem",fontWeight:700}}>⭐ Populaire</div>
            <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:"0.75rem",color:"rgba(29,184,164,0.8)",letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Premium</div>
            <div style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"2rem",color:"#fff",marginBottom:16}}>9€<span style={{fontSize:"0.75rem",color:"rgba(255,255,255,0.4)",fontWeight:400}}>/mois</span></div>
            {["Quiz illimités","Examens blancs 20 questions","Flashcards","14 concours","Stats avancées"].map(f=><div key={f} style={{fontSize:"0.82rem",color:"rgba(255,255,255,0.7)",marginBottom:6}}>✓ {f}</div>)}
            <button className="btn btn-teal" onClick={onShowPricing} style={{width:"100%",justifyContent:"center",marginTop:16,padding:"11px"}}>Passer Premium</button>
          </div>
        </div>
      </section>

      <section style={{maxWidth:600,margin:"0 auto",padding:"0 24px 48px"}}>
        <h2 style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.6rem",color:"var(--text)",textAlign:"center",marginBottom:24}}>Questions fréquentes</h2>
        {faqs.map((f,i)=>(
          <div key={i} className="card" style={{marginBottom:10,padding:0,overflow:"hidden"}}>
            <button onClick={()=>setOpenFaq(openFaq===i?null:i)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"var(--font-display)",fontWeight:800,fontSize:"0.9rem",color:"var(--text)",textAlign:"left"}}>
              {f.q}<span style={{color:"var(--teal)",fontSize:"1.2rem",transition:"transform 0.2s",transform:openFaq===i?"rotate(45deg)":"none"}}>+</span>
            </button>
            {openFaq===i&&<div className="fade-in" style={{padding:"0 20px 16px",fontSize:"0.85rem",color:"var(--muted)",lineHeight:1.6}}>{f.a}</div>}
          </div>
        ))}
      </section>

      <section style={{background:"linear-gradient(135deg,#0A2342,#1a3a5c)",padding:"48px 24px",textAlign:"center"}}>
        <h2 style={{fontFamily:"var(--font-display)",fontWeight:900,fontSize:"1.8rem",color:"#fff",marginBottom:12}}>Prêt à réussir ton concours ? 🚀</h2>
        <p style={{color:"rgba(255,255,255,0.6)",marginBottom:28}}>3 quiz gratuits par jour · Sans carte bancaire · Sans engagement</p>
        <button className="btn btn-teal" onClick={onEnterApp} style={{padding:"16px 40px",fontSize:"1.05rem"}}>✨ Commencer maintenant — c'est gratuit</button>
      </section>

      <footer style={{background:"var(--surface)",borderTop:"1px solid var(--border)",padding:"24px",textAlign:"center"}}>
        <div style={{fontFamily:"var(--font-display)",fontWeight:800,color:"var(--text)",marginBottom:8}}>🩺 ConcoursSanté</div>
        <div style={{fontSize:"0.78rem",color:"var(--muted)",marginBottom:8}}>concourssante.fr · Quiz IA pour concours professionnels · {new Date().getFullYear()}</div>
        <div style={{display:"flex",justifyContent:"center",gap:20,fontSize:"0.78rem"}}>
          <a href="/cgv.html" target="_blank" style={{color:"var(--muted)",textDecoration:"none"}} onMouseEnter={e=>e.target.style.color="var(--teal)"} onMouseLeave={e=>e.target.style.color="var(--muted)"}>Mentions légales</a>
          <a href="/cgv.html" target="_blank" style={{color:"var(--muted)",textDecoration:"none"}} onMouseEnter={e=>e.target.style.color="var(--teal)"} onMouseLeave={e=>e.target.style.color="var(--muted)"}>CGV</a>
          <a href="/cgv.html" target="_blank" style={{color:"var(--muted)",textDecoration:"none"}} onMouseEnter={e=>e.target.style.color="var(--teal)"} onMouseLeave={e=>e.target.style.color="var(--muted)"}>Confidentialité</a>
          <a href="mailto:contact@concourssante.fr" style={{color:"var(--muted)",textDecoration:"none"}} onMouseEnter={e=>e.target.style.color="var(--teal)"} onMouseLeave={e=>e.target.style.color="var(--muted)"}>Contact</a>
        </div>
      </footer>
    </div>
  );
}

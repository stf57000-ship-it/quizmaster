// src/lib/constants.js
export const CONCOURS = {
  aide_soignant:        { label:"Aide-soignant",                icon:"👩‍⚕️", color:"#1DB8A4", colorLight:"#E8F9F7", category:"paramédical",       themes:["Hygiène et soins","Anatomie de base","Situations cliniques","Culture sanitaire & sociale","Éthique et déontologie"] },
  infirmier:            { label:"Infirmier (IFSI)",              icon:"💉",   color:"#2E86AB", colorLight:"#E6F4FB", category:"paramédical",       themes:["Biologie et sciences","Mathématiques","Raisonnement logique","Culture générale santé","Situations cliniques avancées"] },
  auxiliaire:           { label:"Auxiliaire de puériculture",    icon:"👶",   color:"#7B61FF", colorLight:"#F0EEFF", category:"paramédical",       themes:["Développement de l'enfant","Puériculture","Hygiène infantile","Psychologie de l'enfant","Législation petite enfance"] },
  ambulancier:          { label:"Ambulancier",                   icon:"🚑",   color:"#FF6B35", colorLight:"#FFF0EB", category:"paramédical",       themes:["Premiers secours","Anatomie et physiologie","Réglementation transport","Gestes d'urgence","Communication patient"] },
  atsem:                { label:"ATSEM",                         icon:"🏫",   color:"#E8A838", colorLight:"#FEF5E7", category:"paramédical",       themes:["Fonction publique","Pédagogie maternelle","Hygiène et sécurité","Culture générale","Législation éducation"] },
  ash:                  { label:"Agent Hospitalier (ASH)",       icon:"🏥",   color:"#0D6E6E", colorLight:"#E0F4F4", category:"fonction_publique", themes:["Hygiène hospitalière","Entretien des locaux","Bionettoyage","Sécurité et risques","Statut FPH"] },
  adjoint_administratif:{ label:"Adjoint administratif hôpital", icon:"🗂️",  color:"#3D5A99", colorLight:"#EAF0FB", category:"fonction_publique", themes:["Culture générale","Raisonnement logique","Organisation hospitalière","Bureautique","Statut fonction publique"] },
  agent_mortuaire:      { label:"Agent de service mortuaire",    icon:"🕊️",  color:"#5C6B7A", colorLight:"#EEF1F4", category:"fonction_publique", themes:["Réglementation funéraire","Soins de conservation","Hygiène et sécurité","Éthique et dignité","Législation mortuaire"] },
  pompier:              { label:"Sapeur-Pompier",                icon:"🔥",   color:"#D62828", colorLight:"#FDEAEA", category:"securite_defense",  themes:["Secourisme et premiers secours","Culture générale","Raisonnement logique","Aptitudes et réglementation","Organisation des secours"] },
  police_nationale:     { label:"Gardien de la Paix",            icon:"👮",   color:"#003087", colorLight:"#E6EBF5", category:"securite_defense",  themes:["Culture générale","Droit et institutions","Raisonnement logique","Expression écrite","Actualité et société"] },
  gendarmerie:          { label:"Gendarme",                      icon:"🎖️",  color:"#1A3A5C", colorLight:"#E8EEF5", category:"securite_defense",  themes:["Culture générale","Droit pénal","Raisonnement logique","Expression écrite","Histoire et géographie"] },
  armee:                { label:"Armée de Terre (EVAT)",         icon:"🪖",   color:"#4A5E3A", colorLight:"#ECF0E8", category:"securite_defense",  themes:["Culture générale","Mathématiques","Raisonnement logique","Histoire-géographie","Expression écrite"] },
  bac_assp:             { label:"Bac Pro ASSP",                  icon:"🎓",   color:"#2ECC71", colorLight:"#E8F8F0", category:"lycee_pro",         themes:["Soins à la personne","Biologie appliquée","Sciences médico-sociales","Ergonomie","Législation sociale"] },
  cap_aepe:             { label:"CAP AEPE",                      icon:"🌱",   color:"#27AE60", colorLight:"#E4F6EC", category:"lycee_pro",         themes:["Développement de l'enfant","Hygiène et soins","Activités d'éveil","Législation petite enfance","Communication professionnelle"] },
};

export const CONCOURS_CATEGORIES = {
  paramédical:       { label:"Concours paramédicaux",           icon:"🩺", color:"#1DB8A4" },
  fonction_publique: { label:"Fonction publique — Catégorie C", icon:"🏛️", color:"#3D5A99" },
  securite_defense:  { label:"Sécurité & Défense",              icon:"🛡️", color:"#D62828" },
  lycee_pro:         { label:"Lycée Pro & CAP",                 icon:"🎓", color:"#2ECC71" },
};

export const BADGES = [
  { id:"first_quiz",    icon:"🎯", label:"Premier quiz",       desc:"Ton tout premier quiz !",             condition: s => s.totalQuizzes >= 1 },
  { id:"streak_3",      icon:"🔥", label:"3 jours de suite",   desc:"3 jours consécutifs",                 condition: s => s.streak >= 3 },
  { id:"streak_7",      icon:"⚡", label:"Semaine de feu",     desc:"7 jours consécutifs !",               condition: s => s.streak >= 7 },
  { id:"perfect_score", icon:"💎", label:"Score parfait",      desc:"100% à un quiz !",                    condition: s => s.hasPerfect },
  { id:"ten_quizzes",   icon:"📚", label:"Assidu",             desc:"10 quiz complétés",                   condition: s => s.totalQuizzes >= 10 },
  { id:"exam_blanc",    icon:"📋", label:"Examen blanc",       desc:"Premier examen blanc",                condition: s => s.examCount >= 1 },
  { id:"exam_80",       icon:"🏆", label:"Major de promo",     desc:"80%+ à un examen blanc",              condition: s => s.bestExamScore >= 80 },
  { id:"all_health",    icon:"🩺", label:"Médical",            desc:"Tous les concours paramédicaux",      condition: s => ["aide_soignant","infirmier","auxiliaire","ambulancier","atsem"].every(k => s.concoursPlayed?.[k]) },
  { id:"all_defense",   icon:"🛡️", label:"Forces de l'ordre", desc:"3 concours Sécurité/Défense testés",  condition: s => ["pompier","police_nationale","gendarmerie"].every(k => s.concoursPlayed?.[k]) },
  { id:"fifty_quizzes", icon:"🎓", label:"Expert",             desc:"50 quiz complétés",                   condition: s => s.totalQuizzes >= 50 },
  { id:"premium",       icon:"👑", label:"Premium",            desc:"Membre Premium ConcoursSanté",        condition: s => s.isPremium },
];

export const FREE_DAILY_LIMIT = 3;

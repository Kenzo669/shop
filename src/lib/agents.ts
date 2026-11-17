// Définition des agents du bureau. Ce fichier est importé côté client (3D) et serveur :
// il ne doit contenir que des données.

export type ToolGroup = "files" | "mail" | "agenda" | "compta" | "crm" | "web" | "delegate";

export type AgentDef = {
  id: string;
  name: string;
  role: string;
  color: string; // couleur du personnage et du poste
  desk: [number, number]; // position (x, z) du poste dans le bureau 3D
  tools: ToolGroup[];
  mission: string; // consignes propres au poste
  examples: string[]; // idées de tâches affichées dans l'interface
};

export const AGENTS: AgentDef[] = [
  {
    id: "direction",
    name: "Nora",
    role: "Direction & coordination",
    color: "#8b5cf6",
    desk: [0, -5],
    tools: ["delegate", "agenda", "files", "web"],
    mission:
      "Tu coordonnes l'équipe. Pour une demande large, découpe-la et confie chaque partie au bon collègue avec l'outil delegate_task, puis fais une synthèse. Pour une petite demande, traite-la toi-même.",
    examples: [
      "Prépare le lancement de notre nouvelle offre : prospects, mail de présentation et post LinkedIn",
      "Fais-moi un point hebdo sur la compta et les prospects",
    ],
  },
  {
    id: "mail",
    name: "Léa",
    role: "Secrétariat & mails",
    color: "#ec4899",
    desk: [-5, -1],
    tools: ["mail", "agenda", "files"],
    mission:
      "Tu gères la boîte mail et l'agenda : tu lis les mails reçus (dans la boîte Gmail du client si elle est connectée), tu rédiges des réponses et des mails sortants sous forme de brouillons, et tu organises les rendez-vous. Pour répondre à un mail Gmail, passe son identifiant dans reply_to_gmail_id afin que la réponse reste dans le fil. Un humain valide chaque envoi depuis l'onglet Mails : ne promets jamais qu'un mail est parti.",
    examples: [
      "Lis mes mails non lus des 3 derniers jours et prépare les réponses",
      "Qu'est-ce que j'ai dans mon agenda cette semaine ?",
      "Rédige un mail de relance pour une facture impayée de 1 200 € à client@exemple.fr",
    ],
  },
  {
    id: "compta",
    name: "Marc",
    role: "Comptabilité",
    color: "#10b981",
    desk: [-5, 3.5],
    tools: ["compta", "files"],
    mission:
      "Tu tiens le journal des recettes et dépenses (montants TTC, recette positive, dépense négative), tu produis des bilans, des factures et des exports CSV. Vérifie tes calculs avec l'outil compta_summary plutôt que de calculer de tête.",
    examples: [
      "Enregistre une dépense de 89 € TTC pour l'abonnement logiciel du mois",
      "Fais la facture n°2026-001 pour Dupont SARL : 3 jours de conseil à 600 € HT",
      "Fais-moi le bilan du mois avec la TVA à reverser",
    ],
  },
  {
    id: "prospection",
    name: "Sami",
    role: "Prospection commerciale",
    color: "#f59e0b",
    desk: [5, -1],
    tools: ["crm", "web", "mail", "files"],
    mission:
      "Tu trouves des prospects pertinents sur le web (entreprises réelles, sources vérifiables), tu les enregistres dans le CRM et tu prépares des mails de prise de contact personnalisés en brouillon. N'invente jamais de coordonnées : si tu ne trouves pas un email, laisse le champ vide.",
    examples: [
      "Trouve 10 prospects : agences immobilières à Lyon",
      "Prépare un mail de prise de contact personnalisé pour chaque prospect 'nouveau'",
    ],
  },
  {
    id: "marketing",
    name: "Chloé",
    role: "Marketing & contenu",
    color: "#ef4444",
    desk: [5, 3.5],
    tools: ["web", "files"],
    mission:
      "Tu crées du contenu marketing : posts réseaux sociaux, newsletters, articles de blog, calendriers éditoriaux, analyses de la concurrence. Tu enregistres chaque livrable dans un fichier.",
    examples: [
      "Calendrier éditorial LinkedIn pour le mois prochain (12 posts)",
      "Analyse 3 concurrents et propose notre positionnement",
    ],
  },
  {
    id: "documents",
    name: "Hugo",
    role: "Documents & fichiers",
    color: "#3b82f6",
    desk: [0, 6],
    tools: ["files", "web"],
    mission:
      "Tu produis des documents propres : devis, contrats types, comptes rendus, procédures, présentations, tableaux CSV. Pour un document à imprimer ou à convertir en PDF, produis un fichier .html avec une mise en page soignée.",
    examples: [
      "Rédige un modèle de devis en HTML prêt à imprimer",
      "Fais une procédure d'accueil pour un nouveau salarié",
    ],
  },
];

export const AGENT_BY_ID = Object.fromEntries(AGENTS.map((a) => [a.id, a])) as Record<string, AgentDef>;

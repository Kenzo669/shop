// Catalogue des outils connectables via MCP. Données seulement : importé côté client et serveur.
// Les adresses sont celles publiées par les éditeurs (liste des serveurs MCP distants de la doc Claude) ;
// elles restent modifiables au moment de la connexion si un éditeur en change.

export type CatalogEntry = {
  id: string;
  name: string;
  logo: string; // 1-2 caractères affichés dans la pastille
  color: string;
  category: "Automatisation" | "Documents & projets" | "Ventes & clients" | "Paiements" | "Support client" | "Autre";
  desc: string;
  url: string; // adresse du serveur MCP ("" = à saisir)
  auth: ("oauth" | "token")[]; // méthodes proposées, la première est recommandée
  tokenHelp?: string; // où trouver la clé / l'adresse personnelle
  urlFromToken?: boolean; // la « clé » est en fait une adresse personnelle complète
  agents: string[]; // agents autorisés par défaut
  examples: string[];
};

export const CATALOG: CatalogEntry[] = [
  {
    id: "zapier",
    name: "Zapier",
    logo: "Z",
    color: "#ff4f00",
    category: "Automatisation",
    desc: "Plus de 8 000 applications d'un coup (Gmail, Outlook, Sheets, Shopify, WhatsApp, Trello…)",
    url: "https://mcp.zapier.com/api/v1/connect",
    auth: ["oauth", "token"],
    tokenHelp: "Sur mcp.zapier.com, ouvrez votre serveur MCP → onglet « Connect » → copiez le jeton de connexion. Choisissez dans Zapier les actions autorisées.",
    agents: ["direction", "mail", "compta", "prospection", "marketing", "documents", "rh"],
    examples: ["Ajoute ce prospect dans mon Google Sheets", "Publie ce post sur ma page Facebook"],
  },
  {
    id: "make",
    name: "Make",
    logo: "M",
    color: "#6d00cc",
    category: "Automatisation",
    desc: "Déclenchez vos scénarios Make (ex-Integromat) depuis vos agents",
    url: "",
    auth: ["token"],
    urlFromToken: true,
    tokenHelp: "Dans Make : profil → onglet « API access » → créez un jeton MCP, puis collez l'adresse complète fournie (https://<zone>.make.com/mcp/u/<jeton>/stateless).",
    agents: ["direction", "mail", "compta", "prospection", "marketing", "documents", "rh"],
    examples: ["Lance le scénario de facturation mensuelle"],
  },
  {
    id: "notion",
    name: "Notion",
    logo: "N",
    color: "#111111",
    category: "Documents & projets",
    desc: "Pages, bases de données, wiki de l'entreprise",
    url: "https://mcp.notion.com/mcp",
    auth: ["oauth"],
    agents: ["direction", "documents", "marketing", "rh"],
    examples: ["Crée une page Notion avec le compte rendu de la réunion", "Mets à jour notre base clients dans Notion"],
  },
  {
    id: "asana",
    name: "Asana",
    logo: "A",
    color: "#f06a6a",
    category: "Documents & projets",
    desc: "Projets et tâches d'équipe",
    url: "https://mcp.asana.com/v2/mcp",
    auth: ["oauth"],
    agents: ["direction", "documents"],
    examples: ["Crée les tâches Asana du lancement de l'offre"],
  },
  {
    id: "monday",
    name: "monday.com",
    logo: "m",
    color: "#ff3d57",
    category: "Documents & projets",
    desc: "Tableaux de suivi, projets, CRM monday",
    url: "https://mcp.monday.com/mcp",
    auth: ["oauth"],
    agents: ["direction", "documents", "prospection"],
    examples: ["Ajoute les prospects de la semaine dans notre tableau monday"],
  },
  {
    id: "linear",
    name: "Linear",
    logo: "L",
    color: "#5e6ad2",
    category: "Documents & projets",
    desc: "Suivi de projets et de tickets",
    url: "https://mcp.linear.app/mcp",
    auth: ["oauth", "token"],
    tokenHelp: "Linear → Paramètres → Sécurité et accès → clé d'API personnelle.",
    agents: ["direction", "documents"],
    examples: ["Crée un ticket Linear pour le bug signalé par le client"],
  },
  {
    id: "atlassian",
    name: "Jira & Confluence",
    logo: "J",
    color: "#0052cc",
    category: "Documents & projets",
    desc: "Tickets Jira, documentation Confluence (Atlassian)",
    url: "https://mcp.atlassian.com/v1/mcp",
    auth: ["oauth"],
    agents: ["direction", "documents"],
    examples: ["Résume les tickets Jira ouverts cette semaine"],
  },
  {
    id: "hubspot",
    name: "HubSpot",
    logo: "H",
    color: "#ff7a59",
    category: "Ventes & clients",
    desc: "CRM : contacts, entreprises, transactions",
    url: "https://mcp.hubspot.com/anthropic",
    auth: ["oauth"],
    agents: ["prospection", "mail", "direction"],
    examples: ["Ajoute les nouveaux prospects dans HubSpot", "Quelles transactions HubSpot sont en retard ?"],
  },
  {
    id: "intercom",
    name: "Intercom",
    logo: "I",
    color: "#1f8ded",
    category: "Support client",
    desc: "Conversations et tickets du support client",
    url: "https://mcp.intercom.com/mcp",
    auth: ["oauth"],
    agents: ["mail", "direction"],
    examples: ["Résume les demandes clients de la semaine"],
  },
  {
    id: "stripe",
    name: "Stripe",
    logo: "S",
    color: "#635bff",
    category: "Paiements",
    desc: "Paiements, clients, abonnements, liens de paiement",
    url: "https://mcp.stripe.com",
    auth: ["oauth", "token"],
    tokenHelp: "Stripe → Développeurs → Clés API → créez une clé restreinte (limitez-la aux droits nécessaires).",
    agents: ["compta"],
    examples: ["Combien avons-nous encaissé sur Stripe ce mois-ci ?", "Crée un lien de paiement de 490 € pour Dupont SARL"],
  },
  {
    id: "paypal",
    name: "PayPal",
    logo: "P",
    color: "#003087",
    category: "Paiements",
    desc: "Transactions, factures et litiges PayPal",
    url: "https://mcp.paypal.com/mcp",
    auth: ["oauth"],
    agents: ["compta"],
    examples: ["Liste les paiements PayPal reçus cette semaine"],
  },
  {
    id: "square",
    name: "Square",
    logo: "□",
    color: "#000000",
    category: "Paiements",
    desc: "Caisse, ventes en boutique, catalogue",
    url: "https://mcp.squareup.com/mcp",
    auth: ["oauth"],
    agents: ["compta", "direction"],
    examples: ["Quelles ont été les ventes en boutique hier ?"],
  },
];

export const CATALOG_BY_ID = Object.fromEntries(CATALOG.map((c) => [c.id, c])) as Record<string, CatalogEntry>;

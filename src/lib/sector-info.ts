// Description des métiers : données seulement (utilisées par l'interface et par les agents).

export type SectorId = "general" | "restaurant" | "ecommerce" | "dropshipping" | "services";

export type SectorInfo = {
  id: SectorId;
  label: string;
  emoji: string;
  tab: string | null; // onglet métier, s'il y en a un
  /** Consignes ajoutées aux agents, par agent (« * » = tous). */
  guidance: Record<string, string>;
  /** Idées de tâches affichées en premier, par agent. */
  examples: Record<string, string[]>;
  /** Questions de départ proposées dans l'assistant conseil. */
  assistant: { title: string; desc: string; prompts: string[] };
};

export const SECTORS: SectorInfo[] = [
  {
    id: "general",
    label: "Entreprise généraliste",
    emoji: "🏢",
    tab: null,
    guidance: {},
    examples: {},
    assistant: {
      title: "Votre conseiller d'entreprise",
      desc: "Trésorerie, prix, organisation, croissance : réfléchissons ensemble, chiffres à l'appui.",
      prompts: [
        "Fais-moi un bilan de mon mois et dis-moi quoi améliorer",
        "Comment augmenter mon chiffre d'affaires de 20 % ?",
        "Aide-moi à fixer le prix d'une nouvelle offre",
        "Qu'est-ce que je dois faire en priorité cette semaine ?",
      ],
    },
  },
  {
    id: "restaurant",
    label: "Restaurant, café, traiteur",
    emoji: "🍽️",
    tab: "🍽️ Carte & coûts",
    guidance: {
      "*": "L'entreprise est un restaurant. Raisonne en coût matière, ratio coût matière (cible habituelle 25 à 35 %), coefficient multiplicateur, services du midi et du soir. TVA à 10 % sur place, 5,5 % sur certaines ventes à emporter, 20 % sur l'alcool.",
      compta:
        "Tu tiens les fiches techniques avec upsert_ingredient (prix d'achat HT par kg, L ou pièce, et pourcentage de perte) et upsert_recipe (quantités pour toute la recette, nombre de portions, prix de vente TTC). Utilise restaurant_costing pour le coût de revient : ne calcule jamais de tête. Propose des prix et des ajustements de recette pour respecter la cible de coût matière.",
      rh: "Pense aux coupures entre service du midi et du soir : le repos de 11 h entre deux journées reste obligatoire.",
      marketing: "Contenu adapté à un restaurant : plat du jour, menu de saison, avis clients, réseaux Instagram et Google.",
    },
    examples: {
      compta: [
        "Calcule le coût de revient de tous mes plats et dis-moi lesquels sont trop chers à produire",
        "Le prix du beurre passe à 9,80 € le kg : mets à jour et dis-moi quels plats sont touchés",
      ],
      marketing: ["Prépare 5 posts Instagram pour le menu de la semaine", "Réponds à mes 3 derniers avis Google"],
      rh: ["Fais le planning de la semaine : service midi 11h-15h, soir 18h30-23h, fermé lundi"],
      direction: ["Fais un point sur la rentabilité de la carte et propose 3 actions"],
    },
    assistant: {
      title: "Votre conseiller restaurant",
      desc: "Créer des plats rentables, bâtir la carte, réduire le coût matière, remplir la salle.",
      prompts: [
        "Aide-moi à créer un nouveau plat rentable autour de 16 €",
        "Construis-moi un menu de saison avec entrée, plat, dessert",
        "Comment baisser mon coût matière sans perdre en qualité ?",
        "Quel plat du jour proposer cette semaine avec ce que j'ai ?",
      ],
    },
  },
  {
    id: "ecommerce",
    label: "E-commerce, boutique",
    emoji: "🛒",
    tab: "🛒 Produits & marges",
    guidance: {
      "*": "L'entreprise vend des produits (boutique en ligne et/ou physique). Raisonne en marge nette par vente (après frais de paiement, commissions, livraison, emballage et publicité), panier moyen, stock et réassort.",
      compta:
        "Tu tiens la fiche de chaque produit avec upsert_product et tu analyses la rentabilité avec products_margins : ne calcule jamais de tête. Signale les produits vendus à perte, ceux sous la marge cible, et les stocks bas à réapprovisionner.",
      marketing: "Contenu e-commerce : fiches produits, emails de relance de panier, promotions qui préservent la marge (vérifie le CPA maximal de chaque produit).",
    },
    examples: {
      compta: [
        "Analyse la marge de tous mes produits et dis-moi lesquels je dois augmenter",
        "Quels produits faut-il réapprovisionner cette semaine ?",
      ],
      marketing: ["Rédige les fiches produits de mes 3 meilleures ventes", "Propose une promo de Noël qui reste rentable"],
      direction: ["Fais un point hebdo : marges, stock, ventes et actions prioritaires"],
    },
    assistant: {
      title: "Votre conseiller e-commerce",
      desc: "Prix, marges, catalogue, promotions et acquisition : décidons avec les bons chiffres.",
      prompts: [
        "Quels prix devrais-je augmenter et de combien ?",
        "Prépare-moi une promo de fin d'année qui reste rentable",
        "Quel nouveau produit ajouter à mon catalogue ?",
        "Comment augmenter mon panier moyen ?",
      ],
    },
  },
  {
    id: "dropshipping",
    label: "Dropshipping",
    emoji: "📦",
    tab: "📦 Produits & rentabilité pub",
    guidance: {
      "*": "L'entreprise fait du dropshipping : pas de stock, le fournisseur expédie. La rentabilité dépend surtout du coût d'acquisition publicitaire : raisonne en CPA maximal, ROAS de rentabilité, délais de livraison et taux de retour.",
      compta:
        "Tu tiens la fiche de chaque produit avec upsert_product (prix fournisseur, livraison, frais, coût pub moyen par vente) et tu analyses la rentabilité avec products_margins : ne calcule jamais de tête. Pour chaque produit, donne le CPA maximal et le ROAS minimal à viser dans les publicités.",
      prospection: "Tu peux chercher des produits tendance et des fournisseurs fiables (délais, avis, prix), en restant factuel sur les sources.",
      marketing: "Contenu pour publicités et réseaux sociaux (accroches, scripts vidéo courts, angles), sans promesses trompeuses.",
    },
    examples: {
      compta: [
        "Pour chaque produit, quel CPA maximal et quel ROAS minimal je dois viser ?",
        "Mon coût pub passe à 14 € par vente sur la lampe : est-elle encore rentable ?",
      ],
      prospection: ["Trouve 5 produits tendance dans la niche maison avec des fournisseurs européens"],
      marketing: ["Écris 5 accroches de pubs TikTok pour mon produit phare"],
    },
    assistant: {
      title: "Votre coach dropshipping",
      desc: "Trouver le produit gagnant, le valider chiffres en main avant de dépenser en pub, puis le lancer.",
      prompts: [
        "Aide-moi à trouver un produit gagnant dans une niche porteuse",
        "Analyse ce produit avant que je le lance : est-il rentable ?",
        "À quel prix vendre pour rester rentable avec 12 € de CPA ?",
        "Écris une fiche produit qui convertit pour mon meilleur produit",
      ],
    },
  },
  {
    id: "services",
    label: "Services, freelance, conseil",
    emoji: "💼",
    tab: "💼 Tarifs & rentabilité",
    guidance: {
      "*": "L'entreprise vend du temps et de l'expertise. Raisonne en taux journalier (TJM), jours facturables, taux d'occupation, récurrence (forfaits, maintenance).",
      compta: "Utilise rate_calculator pour le TJM minimum avant de faire un devis : ne calcule jamais de tête, et vérifie que chaque devis le respecte.",
    },
    examples: {
      compta: ["Quel TJM minimum je dois facturer pour gagner 4 000 € net par mois ?"],
      prospection: ["Trouve 10 PME de ma région qui pourraient avoir besoin de mes services"],
      documents: ["Prépare un modèle de devis et de contrat de prestation"],
    },
    assistant: {
      title: "Votre conseiller freelance",
      desc: "Tarifs, offres, prospection et organisation de votre activité de services.",
      prompts: [
        "Quel TJM dois-je facturer pour vivre correctement ?",
        "Aide-moi à créer une offre packagée à prix fixe",
        "Comment trouver mes 3 prochains clients ?",
        "Comment justifier une hausse de mes tarifs à mes clients ?",
      ],
    },
  },
];

export const SECTOR_BY_ID = Object.fromEntries(SECTORS.map((s) => [s.id, s])) as Record<SectorId, SectorInfo>;

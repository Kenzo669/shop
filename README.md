# Équipia

Un bureau virtuel en 3D où une équipe d'agents IA (propulsés par Claude) travaille pour une entreprise : mails, comptabilité, prospection, marketing et création de documents.

## L'équipe

| Agent | Poste | Ce qu'il fait vraiment |
|---|---|---|
| **Nora** | Direction & coordination | Découpe les grosses demandes et les délègue aux collègues, puis fait la synthèse |
| **Léa** | Secrétariat & mails | Lit les mails reçus et rédige les réponses (brouillons à valider) |
| **Marc** | Comptabilité | Journal recettes/dépenses, factures numérotées, relances des impayés, déclaration de TVA |
| **Sami** | Prospection | Cherche des entreprises sur le web, remplit le CRM, prépare les mails de prise de contact |
| **Chloé** | Marketing | Posts réseaux sociaux, newsletters, calendrier éditorial, veille concurrentielle |
| **Hugo** | Documents | Devis, contrats types, procédures, comptes rendus (HTML imprimable, CSV, Markdown) |
| **Inès** | RH & planning | Fiches employés, absences, plannings hebdomadaires contrôlés selon le Code du travail |

Les agents agissent avec de vrais outils : base de données (SQLite), fichiers partagés, recherche et lecture de pages web.
**Aucun mail ne part sans validation humaine** : les agents créent des brouillons, que vous relisez, modifiez puis envoyez depuis l'onglet Mails.

## Outils de gestion (sans IA, donc gratuits à l'usage)

- **🏠 Aujourd'hui** : ce qui demande votre attention (mails à valider, factures en retard, TVA à déclarer, planning manquant ou non conforme, absences à venir), avec un bouton pour confier chaque point au bon agent.
- **💶 Compta & TVA** : journal, factures numérotées avec mentions légales (« payée » enregistre la recette), et **déclaration de TVA préparée ligne par ligne** (formulaire CA3) selon votre régime (mensuel, trimestriel, franchise). À vérifier avant dépôt sur impots.gouv.fr.
- **👥 Équipe & planning** : employés, absences, planning de la semaine, heures par rapport au contrat, alertes automatiques (10 h/jour, 48 h/semaine, 11 h de repos, un jour de repos).
- **⏰ Automatisations** : tâches que les agents font seuls (chaque jour, semaine ou mois).

## Maîtrise des coûts de l'IA

- **💰 Consommation** : coût réel de chaque tâche (tokens lus, écrits, cache, recherches web), par agent et par jour.
- **Modèle et niveau de réflexion par agent** : Opus 5.5 (le plus capable), Sonnet 5.5, Haiku 5.5 (environ 40 fois moins cher qu'Opus en entrée).
- **Budget mensuel** (les tâches sont bloquées une fois atteint) et **plafond par tâche** (3 $ par défaut).
- Cache de prompt activé, recherches web limitées à 6 par tâche.

## Assistant conseil (chat)

Bouton **✦ Assistant** en bas à droite : un conseiller qui s'adapte au métier (conseiller restaurant, coach dropshipping, conseiller e-commerce, conseiller freelance…).
- Il lit les vrais chiffres de l'entreprise (mois en cours, impayés, TVA, carte, marges…).
- Il calcule avec des outils exacts : simulation du coût de revient d'un nouveau plat (avec les prix enregistrés ou estimés), rentabilité d'un produit avant lancement (marge, CPA max, ROAS mini).
- Il cherche sur le web (produits gagnants, tendances, fournisseurs, idées de plats) en citant ses sources.
- Il n'enregistre rien et ne confie aucune tâche aux agents sans un « oui » explicite.
- Réponses en flux, historique conservé, coût inclus dans le budget IA (modèle réglable dans 💰 Consommation).

## Modules métier

Choisi à l'inscription (modifiable dans ⚙️ Entreprise), le métier ajoute un onglet dédié, des outils et des consignes pour les agents, et des alertes dans « Aujourd'hui ». Calculs exacts, sans IA.

| Métier | Onglet | Ce qui est calculé |
|---|---|---|
| 🍽️ Restaurant, café, traiteur | Carte & coûts | Fiches techniques : coût de revient par portion (pertes d'épluchage incluses), ratio coût matière, coefficient, marge brute, prix minimum pour la cible (30 % par défaut) |
| 🛒 E-commerce, boutique | Produits & marges | Marge nette par vente (achat, port, emballage, frais de paiement, commission, pub), CPA max, ROAS mini, prix minimum, alertes de stock |
| 📦 Dropshipping | Produits & rentabilité pub | Idem sans stock : CPA maximal et ROAS de rentabilité par produit |
| 💼 Services, freelance | Tarifs & rentabilité | TJM et taux horaire minimum selon le revenu visé, les charges et les jours facturables |

Les données d'exemple s'adaptent au métier choisi.

## Comptes et entreprises

- Chaque entreprise cliente crée son compte (page **/inscription**) et obtient son propre bureau : **une base de données et un dossier de fichiers séparés par entreprise** (`data/orgs/<id>/`). Aucune donnée n'est partagée entre entreprises.
- Le propriétaire invite ses collègues (⚙️ Entreprise → *Inviter un collègue*) avec un lien valable 7 jours, à usage unique.
- Rôles : **propriétaire** (budget IA, connexions, invitations, remise à zéro) et **membre** (utilise le bureau).
- Sécurité : mots de passe hachés (scrypt), sessions en cookie `httpOnly`, protection contre les requêtes venant d'autres sites, blocage après plusieurs mots de passe erronés, accès aux outils connectés chiffrés (AES-256).
- Une installation de l'ancienne version (une seule entreprise) est reprise automatiquement par la première entreprise inscrite.

## Mettre en ligne

Le logiciel tourne sur n'importe quel serveur qui exécute Node.js ou Docker et garde un disque persistant (VPS OVH, Scaleway, Hetzner ; Render, Railway, Fly.io avec un volume). **Pas d'hébergement « serverless » type Vercel** : les agents et les automatisations tournent en continu dans le serveur.

```bash
docker build -t equipia .
docker run -d -p 3000:3000 -v bureau-data:/data \
  -e ANTHROPIC_API_KEY=... -e APP_URL=https://votre-domaine.fr -e APP_SECRET=une-longue-phrase-secrete \
  equipia
```

À prévoir : un nom de domaine en **HTTPS** (indispensable pour les cookies sécurisés et les connexions OAuth), `APP_URL` réglé sur cette adresse, `APP_SECRET` fixé et gardé secret, et une **sauvegarde régulière du volume `/data`**.

## Démarrer

### Le plus simple : double-clic

1. Installez **Node.js** (version LTS) depuis <https://nodejs.org/fr>, puis redémarrez l'ordinateur.
2. Double-cliquez sur **`Lancer Equipia (Windows).bat`** ou **`Lancer Equipia (Mac).command`** (sur Mac, la première fois : clic droit → *Ouvrir*).
3. La première fois, l'installation prend 1 à 3 minutes, puis le navigateur s'ouvre sur Équipia.

### À la main

1. Installez [Node.js](https://nodejs.org) 20 ou plus.
2. Créez une clé API sur <https://console.anthropic.com> (menu *API Keys*).
3. Dans ce dossier :

```bash
npm install
cp .env.example .env.local   # puis collez votre clé dans ANTHROPIC_API_KEY
npm run dev
```

4. Ouvrez <http://localhost:3000>. Pour tout découvrir sans rien saisir, cliquez sur **« Découvrir avec des données d'exemple »** (aucun coût IA, effaçable ensuite depuis ⚙️ Profil entreprise → Tout effacer). Sinon, décrivez votre entreprise dans **⚙️ Profil entreprise** (tous les agents le lisent).
5. Cliquez sur un agent dans le bureau 3D et confiez-lui une tâche.

## Connexions : relier les outils du client

Équipia est un logiciel indépendant : chaque entreprise y relie ses propres comptes depuis le bouton **🔌 Connexions**.

| Outil | Ce que les agents peuvent faire | Connexion |
|---|---|---|
| **Google** (Gmail + Agenda) | Léa lit la boîte et prépare les réponses (envoyées depuis la vraie boîte après validation) ; Léa et Nora gèrent l'agenda | intégré |
| **Zapier** | plus de 8 000 applications (Outlook, Sheets, Shopify, WhatsApp, Trello…) en une seule connexion | MCP, compte ou clé |
| **Make** | déclencher les scénarios Make | MCP, adresse personnelle |
| **Notion, Asana, monday.com, Linear, Jira & Confluence** | documents, projets, tâches | MCP, compte |
| **HubSpot** | CRM | MCP, compte |
| **Stripe, PayPal, Square** | paiements, encaissements | MCP, compte ou clé |
| **Intercom** | support client | MCP, compte |
| **Autre outil** | tout logiciel qui propose un serveur MCP (adresse à coller) | MCP |

Fonctionnement (MCP, le standard de connexion des IA) :
- **Connexion par compte** : découverte automatique du serveur d'autorisation de l'éditeur, enregistrement automatique de Équipia, consentement chez l'éditeur (OAuth 2.1 + PKCE), jetons chiffrés et renouvelés automatiquement.
- **Par outil** : choix des agents autorisés et des actions permises. Les actions destructrices (supprimer, rembourser, annuler…) sont désactivées par défaut.
- Les adresses du catalogue sont celles publiées par les éditeurs (`src/lib/catalog.ts`) ; elles restent modifiables au moment de la connexion. Le serveur doit être accessible publiquement en HTTPS.

### Configurer Google (une seule fois, par l'éditeur du logiciel)

1. Sur <https://console.cloud.google.com>, créez un projet.
2. *API et services → Bibliothèque* : activez **Gmail API** et **Google Calendar API**.
3. *Écran de consentement OAuth* : type « Externe », nom de l'application, et ajoutez les adresses de vos testeurs.
4. *Identifiants → Créer → ID client OAuth* (application Web), avec comme URI de redirection :
   `http://localhost:3000/api/connect/google/callback` (et plus tard `https://votre-domaine/api/connect/google/callback`).
5. Copiez l'ID et le secret dans `.env.local` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), réglez `APP_URL`, relancez.

⚠️ Lire et envoyer des mails sont des accès « restreints » chez Google. En mode test, l'application fonctionne pour 100 comptes testeurs au maximum. Pour l'ouvrir à tous vos clients, Google exige une **vérification de l'application et un audit de sécurité** (plusieurs semaines, payant). À prévoir avant la commercialisation.

### Envoi par SMTP (sans compte Google)

Si aucun compte Google n'est connecté, l'envoi passe par SMTP : renseignez `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` dans `.env.local`.

## Organisation du code

- `src/lib/agents.ts` : la liste des agents (nom, rôle, couleur, place dans le bureau, outils, consignes). C'est ici qu'on ajoute un agent.
- `src/lib/tools.ts` : les outils que les agents peuvent utiliser.
- `src/lib/runner.ts` : la boucle de travail d'un agent (API Claude + outils).
- `src/lib/mcp.ts`, `src/lib/catalog.ts` : connexion des outils externes (MCP) et catalogue.
- `src/lib/google.ts`, `src/lib/connections.ts`, `src/lib/crypto.ts` : connexion des comptes Google, stockage chiffré des accès, Gmail et Agenda.
- `src/lib/assistant.ts`, `src/components/Assistant.tsx` : assistant conseil (chat en flux, outils de simulation).
- `src/lib/sectors.ts`, `src/lib/sector-info.ts` : modules métier (calculs, consignes et idées de tâches par métier).
- `src/lib/business.ts` : TVA, factures, planning et tableau « Aujourd'hui » (calculs exacts, sans IA).
- `src/lib/billing.ts` : tarifs, suivi de consommation, budget, modèle par agent.
- `src/lib/scheduler.ts` : automatisations.
- `src/lib/db.ts` : la base SQLite (`data/bureau.db`) et le dossier des fichiers (`data/files`).
- `src/components/Office3D.tsx` : le bureau en 3D (Three.js / react-three-fiber).
- `src/components/Dashboard.tsx` : l'interface (panneau agent, mails, compta, prospects, fichiers).

## Limites actuelles

- Pas encore de comptes utilisateurs ni de séparation entre entreprises clientes : une installation = une entreprise. À n'utiliser qu'en local ou derrière un accès protégé.
- Les tâches tournent dans le serveur Node : il doit rester allumé pendant qu'elles s'exécutent (`npm run dev` ou `npm run build && npm start`). Ce n'est pas adapté à un hébergement « serverless » comme Vercel.

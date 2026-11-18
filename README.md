# Bureau IA

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

## Démarrer

1. Installez [Node.js](https://nodejs.org) 20 ou plus.
2. Créez une clé API sur <https://console.anthropic.com> (menu *API Keys*).
3. Dans ce dossier :

```bash
npm install
cp .env.example .env.local   # puis collez votre clé dans ANTHROPIC_API_KEY
npm run dev
```

4. Ouvrez <http://localhost:3000>, cliquez sur **⚙️ Profil entreprise** et décrivez votre entreprise (tous les agents le lisent).
5. Cliquez sur un agent dans le bureau 3D et confiez-lui une tâche.

## Connexions : relier les comptes du client

Bureau IA est un logiciel indépendant : chaque entreprise y relie ses propres comptes depuis le bouton **🔌 Connexions**, comme sur un site avec « Se connecter avec Google ».

| Service | Ce que les agents peuvent faire | État |
|---|---|---|
| Google (Gmail + Agenda) | Léa lit et cherche dans la boîte, prépare les réponses (envoyées depuis la vraie boîte, dans le bon fil, après validation) ; Léa et Nora consultent et créent des rendez-vous | ✅ disponible |
| Microsoft 365, LinkedIn, HubSpot, Pennylane, Slack | — | bientôt |

Les accès sont chiffrés en base (AES-256), jamais transmis à l'IA, et renouvelés automatiquement. Un compte se déconnecte en un clic (l'accès est aussi révoqué chez Google).

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
- `src/lib/google.ts`, `src/lib/connections.ts`, `src/lib/crypto.ts` : connexion des comptes Google, stockage chiffré des accès, Gmail et Agenda.
- `src/lib/business.ts` : TVA, factures, planning et tableau « Aujourd'hui » (calculs exacts, sans IA).
- `src/lib/billing.ts` : tarifs, suivi de consommation, budget, modèle par agent.
- `src/lib/scheduler.ts` : automatisations.
- `src/lib/db.ts` : la base SQLite (`data/bureau.db`) et le dossier des fichiers (`data/files`).
- `src/components/Office3D.tsx` : le bureau en 3D (Three.js / react-three-fiber).
- `src/components/Dashboard.tsx` : l'interface (panneau agent, mails, compta, prospects, fichiers).

## Limites actuelles

- Pas encore de comptes utilisateurs ni de séparation entre entreprises clientes : une installation = une entreprise. À n'utiliser qu'en local ou derrière un accès protégé.
- Les tâches tournent dans le serveur Node : il doit rester allumé pendant qu'elles s'exécutent (`npm run dev` ou `npm run build && npm start`). Ce n'est pas adapté à un hébergement « serverless » comme Vercel.

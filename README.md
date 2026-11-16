# Bureau IA

Un bureau virtuel en 3D où une équipe d'agents IA (propulsés par Claude) travaille pour une entreprise : mails, comptabilité, prospection, marketing et création de documents.

## L'équipe

| Agent | Poste | Ce qu'il fait vraiment |
|---|---|---|
| **Nora** | Direction & coordination | Découpe les grosses demandes et les délègue aux collègues, puis fait la synthèse |
| **Léa** | Secrétariat & mails | Lit les mails reçus et rédige les réponses (brouillons à valider) |
| **Marc** | Comptabilité | Tient le journal recettes/dépenses, calcule la TVA, fait factures et bilans |
| **Sami** | Prospection | Cherche des entreprises sur le web, remplit le CRM, prépare les mails de prise de contact |
| **Chloé** | Marketing | Posts réseaux sociaux, newsletters, calendrier éditorial, veille concurrentielle |
| **Hugo** | Documents | Devis, contrats types, procédures, comptes rendus (HTML imprimable, CSV, Markdown) |

Les agents agissent avec de vrais outils : base de données (SQLite), fichiers partagés, recherche et lecture de pages web.
**Aucun mail ne part sans validation humaine** : les agents créent des brouillons, que vous relisez, modifiez puis envoyez depuis l'onglet Mails.

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

### Envoi réel des mails (optionnel)

Renseignez `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` dans `.env.local`.
Avec Gmail : `smtp.gmail.com`, port `465`, et un *mot de passe d'application* Google.

## Organisation du code

- `src/lib/agents.ts` : la liste des agents (nom, rôle, couleur, place dans le bureau, outils, consignes). C'est ici qu'on ajoute un agent.
- `src/lib/tools.ts` : les outils que les agents peuvent utiliser.
- `src/lib/runner.ts` : la boucle de travail d'un agent (API Claude + outils).
- `src/lib/db.ts` : la base SQLite (`data/bureau.db`) et le dossier des fichiers (`data/files`).
- `src/components/Office3D.tsx` : le bureau en 3D (Three.js / react-three-fiber).
- `src/components/Dashboard.tsx` : l'interface (panneau agent, mails, compta, prospects, fichiers).

## Limites actuelles

- Les mails reçus sont ajoutés à la main (copier-coller). La connexion directe à une boîte mail (IMAP / Gmail) est la prochaine étape.
- Pas encore de comptes utilisateurs : à n'utiliser qu'en local ou derrière un accès protégé.
- Les tâches tournent dans le serveur Node : il doit rester allumé pendant qu'elles s'exécutent (`npm run dev` ou `npm run build && npm start`). Ce n'est pas adapté à un hébergement « serverless » comme Vercel.

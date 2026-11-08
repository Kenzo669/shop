# Désaccords à trancher en call

Tenu par Max. Chaque désaccord entre employés est noté ici, puis présenté au patron à l'oral pendant le prochain call (`/call max` ou `/reunion`). Le patron tranche, Max note la décision.

Format :
```
### <date> · <sujet en une ligne>
- <Prénom> : <sa position et son argument principal, chiffré si possible>
- <Prénom> : <sa position et son argument principal>
- Recommandation de Max : <ce qu'il ferait et pourquoi>
- Ce que ça change si on ne tranche pas : <coût ou blocage>
- Statut : ouvert
```

## Ouverts

### 2026-11-08 · Tester le paywall avec peu d'utilisateurs ?
- Hugo : on peut tester les offres l'une après l'autre (2 semaines A, puis 2 semaines B) même avec peu d'installations, et lire le résultat comme une tendance. Ça permet d'apprendre vite sans budget.
- Malik : en dessous d'environ 1 400 installations, le résultat n'est pas exploitable (on confond le hasard avec un vrai écart), et payer de la pub pour atteindre ce volume coûte 2 000 à 5 000 €. Il refuse tout test de paywall financé par de la pub avant ce seuil.
- Recommandation de Max : pas de pub pour le test du paywall. On lance l'A/B test gratuit de Bloxks Pay dès la publication, sur le trafic organique, et on ne tranche qu'à partir d'environ 700 installations par offre. En attendant, on teste le prix et le message sur la page d'attente (quelques centaines d'euros au plus).
- Ce que ça change si on ne tranche pas : risque de fixer le prix sur une impression, ou de dépenser plusieurs milliers d'euros trop tôt.
- Statut : ouvert

### 2026-11-08 · Positionnement de Mijo : planificateur de menus ou carnet de cuisine de la famille ?
- Hugo et Zoé : vendre Mijo sur le problème le plus parlant, « on mange quoi ce soir ? » : menus de la semaine et liste de courses prêts en 2 minutes. C'est simple à comprendre en 3 secondes sur TikTok et ça crée le moment wow.
- Sam : c'est exactement la promesse de Jow, gratuit et relié au drive des supermarchés. Mijo n'a ni catalogue de recettes, ni partenariats, ni gratuité, et perdra ce combat. Il faut se positionner sur « tes recettes à toi » : le carnet de cuisine de la famille, ce qu'on a cuisiné, sans pub, export garanti.
- Recommandation de Max : garder l'accroche d'Hugo pour attirer (« on mange quoi ce soir ? ») mais faire la différence avec l'angle de Sam (« avec TES recettes, pas celles d'un supermarché »). Tester les deux promesses en A/B sur la page d'attente avant de toucher à l'appli : c'est le test qui tranche, pour quelques dizaines d'euros.
- Ce que ça change si on ne tranche pas : les textes, la page d'attente, les vidéos et le paywall partent dans deux directions différentes.
- Statut : ouvert

### 2026-11-08 · Créer un compte utilisateur dans la première version ?
- Zoé : demander de créer un compte (Apple / Google en 1 clic) à la fin du premier lancement, pour garder la semaine de l'utilisateur et le faire revenir.
- Léa : pas de compte en v1. Un compte oblige à proposer « Se connecter avec Apple » (règle 4.8), à permettre de supprimer le compte dans l'appli (règle 5.1.1) et à fournir un compte de démo au testeur Apple : 3 motifs de refus en plus. Un bouton « Exporter mes recettes » protège déjà les données.
- Recommandation de Max : suivre Léa pour la v1 (sortir vite, moins de risques de refus), avec l'export de recettes. Ajouter les comptes en v2 avec la liste de courses partagée en famille, qui en a vraiment besoin.
- Ce que ça change si on ne tranche pas : l'IA de Bloxks risque d'ajouter une connexion à moitié faite, et la validation Apple prend plus de temps.
- Statut : ouvert

### 2026-11-08 · Prix et contenu du Premium
- Zoé : 3,99 €/mois ou 24,99 €/an, 7 jours d'essai ; Premium avec menus illimités, mode frigo, liste partagée en famille, import de recettes.
- Malik : 24,99 €/an est trop bas (-48 % sur le mensuel, ~530 abonnés nécessaires au lieu de ~480). Il recommande 3,99 € / 29,99 € (5 CHF / 35 CHF), essai 7 jours sur l'annuel. Surtout, le Premium de Zoé vend des fonctions qui n'existent pas en v1 (liste partagée = comptes reportés en v2, import photo factice) : risque de refus Apple et de remboursements.
- Recommandation de Max : la grille de Malik, et un Premium v1 limité à ce qui marche (menus illimités, « Prêtes avec tes courses », suivi des dépenses, carnet illimité). Puis A/B test 29,99 € contre 24,99 € avec Bloxks Pay.
- Ce que ça change si on ne tranche pas : on ne peut pas créer l'abonnement dans Bloxks Pay.
- Statut : ouvert

## Tranchés

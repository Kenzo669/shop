# Rapport de Max · Test Founder Skill du 10 novembre

Le patron a fait tester l'aperçu de Mijo par Founder Skill (board, concurrents, marketing). L'équipe l'a relu point par point. Voici ce qu'on en retient, ce qui est déjà réglé, ce qu'il faut coller dans Bloxks et ce que tu dois trancher.

## 0. Tes notes du 10 novembre : décisions et réponses

### Ce que tu as décidé (noté par Inès)

| Sujet | Décision |
|---|---|
| Compte | **Oui dès la v1** : e-mail + mot de passe, bouton rouge « Supprimer le compte » |
| Pays | **Tous les pays sauf l'Union européenne** |
| Gratuit | **10 recettes les plus populaires par continent**, le reste avec cadenas |
| Suivi des dépenses | **Premium uniquement** (on garde la grille du 8 novembre) |
| Onboarding | **7 écrans** (bienvenue, compte, pays, personnes, cuisines, allergies, paywall) |
| Mijo Bébé | **Intégré à Mijo dès la bêta** : « Repas de famille » dans la création des menus → enfant en bas âge ? → quel âge ? → recettes adaptées |

### Pourquoi 5 sur 10 ?

**Malik :** « Ce n'est pas seulement le gluten et les quantités. Le board a trois juges, chacun note un angle différent. »

| Juge | Note | Ce qui fait perdre des points | Ce qui la fait monter |
|---|---|---|---|
| Offres (le marché paie-t-il ?) | 5 | Jow, Marmiton et Fooby sont gratuits ; aucune preuve que des gens paient (pas d'avis, pas d'abonnés) | 10 à 20 vrais avis de testeurs, un Premium clair en une phrase |
| Monopole (peut-on se défendre ?) | 4 | N'importe qui peut copier « recettes du monde » en un mois | Posséder un petit public d'abord (francophones hors France, familles) et les notes des utilisateurs |
| Produit (l'appli tient-elle sa promesse ?) | 6 | Gluten absent, photos fausses, quantités doublées : les bugs que l'utilisateur voit en premier | Les prompts 1 à 3 corrigent tout ça |

**En clair :** les corrections font monter la note « Produit » à 7 ou 8. Les deux autres notes ne montent qu'avec de **vrais utilisateurs** : avis, abonnés, notes. C'est pour ça que les testeurs du 14–15 novembre comptent autant que les corrections.

### Le bug des quantités doublées, expliqué simplement

**Zoé :** « Prends le bibimbap, qui demande 160 g de riz. »
1. Tu ouvres la recette et tu touches **« Ajouter à la liste »** : la liste affiche **riz 160 g**. C'est juste.
2. Le bibimbap est aussi dans tes menus de la semaine. Tu vas dans Menus et tu touches **« Préparer la liste de courses »**. L'appli rajoute toutes les recettes de la semaine, **y compris le bibimbap déjà présent**.
3. Résultat : **riz 320 g, 4 œufs au lieu de 2**. Tu achètes le double pour un seul plat.

**La correction** (point 7 du prompt 1) : l'appli se souvient des recettes déjà dans la liste et ne les rajoute pas. Les quantités ne s'additionnent que si tu as **vraiment** prévu le plat deux fois dans la semaine.

### Les allergènes UE dans les recettes

**Léa :** « Deux étapes. »
- **Nos 1 178 recettes : c'est fait.** Chaque recette a maintenant sa liste d'allergènes, avec les 14 de l'UE : gluten dans 634 recettes, lait 585, œufs 341, soja 170, poissons 162, sulfites 102, sésame 72, moutarde 64, fruits à coque 51, crustacés 35, céleri 33, arachides 32, mollusques 18. 127 recettes n'en ont aucun. En cas de doute, on a mis l'allergène.
- **Les recettes déjà dans Bloxks :** c'est le point 6 du prompt 2 qui les fait étiqueter par Bloxks avec les mêmes règles.
- La fiche recette affichera « Contient : gluten, lait… », et l'avertissement « vérifie toujours les étiquettes » reste.

### « Sortie monde » ou « sortie nationale » : la différence

**Max :** « C'est juste la liste des pays que tu coches dans App Store Connect au moment de l'envoi. L'appli est la même. »

| | Sortie nationale | Sortie monde (ta décision : sauf UE) |
|---|---|---|
| Où l'appli est visible | Suisse seulement | Suisse, Royaume-Uni, Canada, Maroc, Émirats, États-Unis… (environ 150 pays) |
| Avantage | On se concentre, on lit les premiers chiffres proprement | Plus de téléchargements possibles sans effort, le bouche-à-oreille de tes amis à l'étranger marche |
| Inconvénient | Petit marché (2 millions de Romands) | Pub et vidéos dispersées : il faut quand même **choisir 1 ou 2 pays pour la pub payante** |

**Attention : sans l'UE, il n'y a ni la France, ni la Belgique, ni le Luxembourg.** Ce sont les trois plus grands marchés francophones. La sortie « monde sauf UE » en français vise surtout la Suisse romande, le Québec, le Maroc et les francophones du Royaume-Uni et des Émirats.

### « Tous les pays sauf l'UE : pas besoin de fiche personnelle ? »

**Léa :** « Pour l'essentiel, oui, mais il reste deux choses à savoir. »
1. **Oui pour le téléphone et l'adresse.** L'obligation d'afficher publiquement téléphone + adresse + e-mail vient de la loi européenne (DSA) et ne s'applique qu'aux pays de l'UE. Hors UE, Apple demande seulement une **page d'assistance** et un **e-mail de contact**, et ton **e-mail pro** suffit. À revérifier au moment de cocher les pays : si App Store Connect bloque un pays pour une raison légale, on le décoche.
2. **Le nom du vendeur reste visible partout.** Avec un compte Apple développeur **individuel**, la fiche App Store affiche ton **prénom et ton nom** comme vendeur, dans tous les pays. Pour afficher « Mijo » ou le nom d'une société à la place, il faut un compte **organisation** : une entreprise inscrite au registre du commerce et un numéro D-U-N-S (gratuit, 1 à 2 semaines). **À décider ce soir.**
3. **Pour ouvrir l'UE plus tard** (France, Belgique), il faudra un **numéro pro** (ligne virtuelle, quelques francs par mois) et une **adresse pro** (domiciliation), jamais les tiens. Léa propose de le préparer pour un lancement UE en décembre.

### Mijo Bébé dans Mijo : l'avis de l'équipe

- **Théo :** « Excellente idée. C'était l'idée n°1 du studio (21 sur 25). La mettre dans Mijo évite de construire une 2e appli, et ça donne un vrai argument aux parents. »
- **Zoé :** « Le parcours : création des menus → "Repas de famille" → "Enfant en bas âge ?" → "Quel âge ?" (6–8 mois, 9–11 mois, 1–2 ans, 3–5 ans). Les plats non adaptés disparaissent des menus de famille, et chaque recette affiche une carte "Pour les petits". C'est le prompt 3. »
- **Déjà fait :** les 1 178 recettes ont maintenant une fiche « enfants » (âge minimum et conseils). Exemples : saler après avoir servi la part des petits (toutes), œufs bien cuits (337), piment servi à part (174), alcool remplacé par du bouillon (81), fruits à coque mixés avant 5 ans (80), miel jamais avant 1 an (28). 5 recettes crues (tartares, ceviche) sont exclues pour les jeunes enfants.
- **Léa, le garde-fou :** « Pas de promesse santé ou croissance. Toujours la phrase : "Conseils généraux, pas un avis médical, suis les conseils de ton pédiatre." Les vraies recettes de diversification (purées de 6 à 11 mois) doivent être écrites avec soin. On ne les met pas dans la bêta à la va-vite. »
- **À trancher ce soir :**
  1. Les recettes « Premiers repas » (6–11 mois) : on les écrit pour la sortie du 20, ou juste après ? Zoé propose une trentaine, prêtes le jeudi 19.
  2. Le mode famille est-il gratuit ou Premium ? Malik propose le mode famille gratuit et les « Premiers repas » en Premium.

## 1. En trois phrases

- **Note du board : 5 sur 10, comme le 9 novembre** (2 « FUND IF », 1 « PASS »). L'appli fait « vraie appli » : le design et le mode cuisine plaisent. Mais trois choses cassent la confiance : **allergies sans gluten, photos fausses, quantités doublées**.
- **L'appli testée n'a que 164 recettes.** Nos 1 178 recettes ne sont pas encore dedans, et elles règlent à elles seules une partie des remarques : catalogue, petit-déjeuner, recettes complètes, popularité par continent.
- **Le rapport mentionne cinq décisions qui changent ce qu'on avait arrêté** : compte dès le début, tous les pays, suivi des dépenses gratuit, gratuit limité à 10 recettes par continent, onboarding long. Si elles viennent bien de toi, on les applique. Avant, il y a **deux risques à connaître** (partie 3).

## 2. Les 25 remarques, triées

| # | Remarque du test | Gravité | Où on la règle | État chez nous |
|---|---|---|---|---|
| 1 | Pas de gluten ni des 14 allergènes UE | Bloquant | Prompt Bloxks | Notre code n'en a que 9 aussi : **à corriger** |
| 2 | Photos fausses (bibimbap = rösti, vignettes en double, soupe beige) | Bloquant | Données (photos par recette) | Mécanisme « une photo par recette » prêt + prompt photos prêt, pas encore lancé |
| 3 | Quantités doublées si on ajoute deux fois une recette | Bloquant | Prompt Bloxks | Même bug dans notre code : **à corriger** |
| 4 | Pas de compte ni d'e-mail | Bloquant (selon le rapport) | Décision à confirmer (partie 3) | Léa recommandait « pas de compte en v1 » |
| 5 | Gratuit non limité | Bloquant | Prompt Bloxks | Nos recettes ont déjà un score de popularité, ce qui permet de faire « 10 par continent » |
| 6 | Dépenses présentées comme Premium | Bloquant (selon le rapport) | Décision à confirmer | La grille du 8 nov. les mettait en Premium |
| 7 | Seulement 4 pays | Bloquant (selon le rapport) | Décision à confirmer | Nous : Suisse romande d'abord |
| 8 | Onboarding : seulement les allergies | Bloquant | Prompt Bloxks | Version Bloxks reprise telle quelle |
| 9 | Bibimbap à 5 ingrédients | Important | Données | Réglé par le catalogue (recettes complètes) |
| 10 | Minuteurs faux (12:00 pour « 3 minutes ») | Important | Prompt Bloxks | Pas encore traité |
| 11 | Portions incohérentes (4 dans la liste, 2 à l'ouverture) | Important | Prompt Bloxks | Pas encore traité |
| 12 | Raclette proposée au petit-déjeuner | Important | Prompt + catalogue | **Fait** dans notre code (filtre Repas / Petit-déjeuner) |
| 13 | Menus qui commencent un lundi passé | Important | Prompt Bloxks | Notre code date le menu, mais part du lundi : **à corriger** |
| 14 | « Magasin habituel : France » | Important | Prompt Bloxks | **Fait** dans notre code (ligne supprimée) |
| 15 | Pas de « J'ai cuisiné », pas de note | Important | Prompt Bloxks | Pas encore traité |
| 16 | Paywall : verres de vin, pas de « Continuer gratuitement » | Important | Prompt Bloxks | Déjà sur notre liste depuis le 8 nov. |
| 17 | Pas de mode Noël | Important | Prompt Bloxks | Nouveau |
| 18 | « Ajouter au menu » ne marche pas, en double | Finition | Prompt Bloxks | Pas encore traité |
| 19 | Œufs dans « Produits laitiers » | Finition | Prompt Bloxks | Même erreur chez nous : **à corriger** |
| 20 | Jargon « JSON » dans le carnet | Finition | Prompt Bloxks | **Fait** dans notre code |
| 21 | Textes coupés | Finition | Prompt Bloxks | En partie fait chez nous |
| 22 | Pas de barre du bas sur l'accueil | Finition | Prompt Bloxks | Pas encore traité |
| 23 | Pas de prix estimés | Finition | Couper en v1 (le board le dit aussi) | — |
| 24 | Pas de choix de langue | Finition | Hors v1 : l'appli est en français | — |
| 25 | Le premium ne vend pas le catalogue | Important | Prompt Bloxks | Nouveau titre proposé |

**Important : notre code corrigé n'est pas dans Bloxks.** Bloxks n'importe ni code ni fichier. La seule voie, c'est le prompt ci-dessous, plus le chargement des recettes depuis un lien public.

## 3. Les décisions du rapport à confirmer (tranchées le 10 nov., voir partie 0)

Le rapport dit « tu as décidé » pour cinq points. Ils ne sont pas encore écrits chez nous. L'équipe a deux réserves sérieuses et trois petites.

| Point | Ce que dit le rapport | Ce qu'on avait | Avis de l'équipe |
|---|---|---|---|
| **Pays** | Tous les pays dès le 20 nov. | Suisse romande d'abord | **Léa : risque pour ta vie privée.** Pour vendre dans l'Union européenne, Apple oblige à afficher publiquement sur la fiche App Store une adresse, un **numéro de téléphone** et un e-mail du vendeur (statut « commerçant », loi européenne DSA). Tu as dit : jamais ton numéro. Solution : ouvrir tous les pays **hors UE** dès maintenant (Suisse, Royaume-Uni, Maroc, Émirats, Canada…), puis l'UE quand tu as une ligne pro et une adresse pro (domiciliation). À vérifier dans App Store Connect au moment de l'envoi. |
| **Compte** | E-mail + mot de passe dès l'inscription, bouton rouge « Supprimer le compte » | Pas de compte en v1 (Léa) | **Faisable**, à trois conditions pour Apple : suppression du compte dans l'appli, compte de démo donné au testeur Apple, politique de confidentialité mise à jour (on collecte alors des e-mails). Correction de Léa : « Se connecter avec Apple » n'est obligatoire que si on propose Google ou Facebook. Avec e-mail seul, ce n'est pas exigé. **Zoé est pour.** Risque : 2 à 3 jours de plus et un motif de refus de plus. |
| **Dépenses** | Gratuites pour tous | Premium (grille du 8 nov.) | **Malik est d'accord** : le board dit que le Premium doit vendre le catalogue du monde, pas les dépenses. Gratuit, c'est un bon crochet pour revenir chaque semaine. Ça règle aussi la question « saisie obligatoire après Fin des courses ». |
| **Gratuit limité** | 10 recettes populaires par continent, le reste avec cadenas | Premium = menus illimités + carnet | **Malik est d'accord.** Avec 7 continents, ça fait environ 70 recettes gratuites, assez pour essayer, pas assez pour s'en passer. |
| **Onboarding** | 10 écrans (bienvenue, compte, pays, magasin, cuisines, personnes, objectif, budget, allergies, paywall) | Allergies seulement | **Zoé : oui, mais plus court.** 10 écrans font fuir. On garde 7 : bienvenue, compte, pays, personnes, cuisines préférées, allergies, paywall. « Magasin », « budget » et « objectif » vont dans le Profil, à remplir plus tard. Le board dit aussi de couper la recherche de magasin tant qu'elle ne marche pas. Pas de promesse santé ou poids sur « prendre de la masse ». |

**Date d'envoi à Apple : lundi 16 novembre** (le rapport) au lieu du mercredi. On garde le 16 si ton compte Apple développeur est ouvert. Sinon, la sortie glisse d'autant.

## 4. Ce que le board, les concurrents et le marketing nous apprennent

- **Sam (concurrents)** : le rapport confirme notre lecture. Jow, Marmiton et Fooby sont gratuits. Mealime se fait reprocher des recettes répétitives et un Premium trop maigre. Notre case à prendre : **variété du monde, en français, sans drive, utilisable dans n'importe quel pays, avec le carnet de famille**. Notre prix (3,99 / 29,99) se situe dans le bas de la fourchette du marché (2,99 à 6,99 $). On ne touche pas aux prix.
- **Hugo (marketing)** : on reprend le positionnement recommandé, « fais voyager ton assiette ». On reprend aussi les 10 accroches et le calendrier. Un garde-fou : l'accroche « Allergique ? » seulement une fois le gluten corrigé.
- **Malik (budget)** : 300 à 400 € jusqu'à fin décembre, test de 100 € le 21–22 nov. Plafond d'environ 0,40 € par installation si 2 % paient (hypothèse à mesurer la première semaine). Le Black Friday à 24,99 € l'an (27 nov. → 6 déc.) est **compatible avec ta règle « pas de test de prix »** : c'est une promo datée, pas un test.
- **Léa** : avant d'utiliser « Qu'est-ce qu'on se fait de bon ? » en titre, vérifier la marque à l'IPI (Suisse) et à l'INPI (France). C'est gratuit en ligne, 10 minutes.

## 5. Les prompts à coller dans Bloxks

Remplacés par la version validée après tes notes : voir l'annexe (« Prompts Bloxks du 10 novembre ») et `entreprise/livrables/prompts-bloxks-10nov.md`.

## 6. Ce que l'équipe corrige de son côté (aujourd'hui)

- **Zoé** : 14 allergènes dans les recettes. Chaque recette du catalogue reçoit la liste de ses allergènes, gluten compris.
- **Zoé** : œufs rangés en « Œufs & frais », quantités jamais doublées, menu qui démarre aujourd'hui. Ces trois corrections vont dans notre code de secours.
- **Max** : relance des photos, les 286 incontournables d'abord (prompt photos déjà prêt). Jusqu'à ce que les photos soient faites, on affiche drapeau + nom, jamais une photo fausse.
- **Léa** : politique de confidentialité mise à jour si tu valides le compte (e-mail collecté, suppression du compte). Liste des pays hors UE à cocher dans App Store Connect.
- **Hugo** : 6 vidéos sans visage sur les accroches 1, 2, 3, 6, 9 et 10, à tourner le 17–18 nov.

## 7. Ce que toi tu dois faire

1. **Me répondre sur les 5 décisions de la partie 3**, et surtout sur les pays (UE maintenant avec une ligne pro, ou plus tard).
2. **Créer le dépôt public `mijo-recettes`** sur GitHub (vide, public). Je mets les recettes dedans dans la foulée.
3. **Coller le prompt de la partie 5 dans Bloxks**, puis m'envoyer le nouveau lien d'aperçu. On refait le test complet.
4. **Trouver 10 à 20 testeurs pour le samedi 14 et le dimanche 15** (aperçu web). Le board veut de vrais avis avant toute pub payante.
5. **Vérifier que ton compte Apple développeur est ouvert** pour l'envoi du lundi 16.

## 8. Calendrier mis à jour

| Jour | Quoi | Qui |
|---|---|---|
| Mar 10 | Prompt collé dans Bloxks, dépôt `mijo-recettes` créé, décisions confirmées | Patron |
| Mer 11 → Ven 13 | Recettes en ligne, allergènes, photos, nouveau test complet de l'aperçu | Max, Zoé, Léa |
| Sam 14 → Dim 15 | 10 à 20 testeurs, retours, captures pour la fiche | Patron, Zoé |
| Lun 16 | Envoi App Store (pays hors UE si pas de ligne pro) | Patron, Léa |
| Mar 17 → Mer 18 | 6 vidéos sans visage | Hugo |
| Ven 20 | Sortie | Tout le monde |
| Sam 21 → Dim 22 | Test pub 100 € (50 Meta, 50 TikTok) | Hugo, Malik |
| Ven 27 → Dim 6 déc | Offre Black Friday 24,99 €/an, Noël du monde | Hugo, Malik |
| Dim 6 déc | Bilan : abonnés, coût par installation, 2e appli | Max |

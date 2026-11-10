# Rapport de Max · Test Founder Skill du 10 novembre

Le patron a fait tester l'aperçu de Mijo par Founder Skill (board, concurrents, marketing). L'équipe l'a relu point par point. Voici ce qu'on en retient, ce qui est déjà réglé, ce qu'il faut coller dans Bloxks et ce que tu dois trancher.

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

## 3. Les décisions du rapport à confirmer

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

## 5. Le prompt unique à coller dans Bloxks

Il reprend les 14 points de Founder Skill, corrigés selon la partie 3 (pays hors UE pour l'instant, onboarding en 7 écrans), plus le chargement de nos 1 178 recettes.

```
Corrige et complète l'appli Mijo comme suit, sans changer le design actuel :

1. ALLERGIES (onboarding + Préférences) : liste des 14 allergènes UE dans cet ordre : Gluten, Crustacés, Œufs, Poissons, Arachides, Soja, Lait, Fruits à coque, Céleri, Moutarde, Sésame, Sulfites, Lupin, Mollusques. Les recettes qui contiennent un allergène coché ne sont jamais proposées. Corrige les libellés coupés (« Lactose (intolérance) », « Recettes avec mes courses », « Politique de confidentialité ») : texte sur deux lignes au lieu de couper.

2. ONBOARDING en 7 écrans : (1) bienvenue avec l'accroche « Qu'est-ce qu'on se fait de bon ? », (2) création de compte : e-mail + mot de passe, case CGU obligatoire, case newsletter facultative en dessous, (3) pays, (4) nombre de personnes, (5) cuisines préférées par continent, (6) allergies, (7) paywall. Magasin habituel, budget et objectif (se faire plaisir / bien manger / léger / prendre de la masse) vont dans le Profil, facultatifs. Aucun téléphone, aucune adresse demandés.

3. PAYS : propose tous les pays avec la devise automatique pour le suivi des dépenses (CHF, EUR, GBP, AED, MAD, CAD, USD…).

4. PARAMÈTRES : remplace « Effacer les données locales » par un bouton rouge « Supprimer le compte » en bas, avec confirmation, qui efface définitivement le compte et toutes ses données.

5. GRATUIT / PREMIUM : en gratuit, seules les 10 recettes les plus populaires de chaque continent sont ouvertes (champ popularity) ; les autres affichent un cadenas et ouvrent le paywall. Le suivi des dépenses est gratuit pour tous : retire toute mention « Premium » sur les dépenses (écran Menus et paywall). Après « Fin des courses », la saisie du montant est proposée mais jamais obligatoire.

6. PAYWALL : remplace l'image des verres de vin par une photo de plats. Titre : « Le tour du monde dans ton assiette ». Bénéfices : toutes les recettes du monde, de nouvelles recettes chaque semaine, ton carnet de recettes de famille illimité. Sous le bouton, un lien « Continuer gratuitement » qui ferme le paywall. Garde 29,99 €/an présélectionné (35 CHF) et 3,99 €/mois (5 CHF), essai 7 jours.

7. LISTE DE COURSES : une recette déjà dans la liste n'est jamais ajoutée une deuxième fois et ses quantités ne sont jamais doublées (« Ajouter à la liste » + « Préparer la liste de courses » = une seule fois). Crée un rayon « Œufs & frais » et ranges-y les œufs, pas dans « Produits laitiers ».

8. MENUS : le planning commence aujourd'hui, jamais un jour passé. Depuis un créneau, la recherche est filtrée par type de repas : petit-déjeuner pour le créneau du matin, repas pour déjeuner et dîner.

9. PORTIONS : chaque recette s'ouvre avec le nombre de personnes du profil, et la liste des recettes, les menus et la liste de courses affichent ce même nombre.

10. MODE CUISINE : chaque minuteur prend le temps écrit dans l'étape (3 minutes = 3:00) ; pas de minuteur si l'étape n'a pas de durée. « Terminer » affiche « Tu l'as cuisiné ! », augmente le compteur « Cuisinés » et propose une note de 1 à 5 étoiles. 30 minutes plus tard, une notification rappelle de noter si ce n'est pas fait.

11. Fusionne « Ajouter au menu » et « Ajouter au calendrier » en un seul bouton « Ajouter à mes menus » qui ouvre le choix du jour et du repas, et qui fonctionne.

12. CARNET : renomme les options JSON en « Sauvegarder mes recettes » et « Restaurer mes recettes ».

13. MODE NOËL du 1er au 31 décembre : petite neige sur l'accueil, déco sur le logo, section « Spécial Noël » sur l'accueil.

14. Affiche la barre de navigation du bas sur l'accueil aussi.

15. RECETTES : au démarrage, télécharge le catalogue depuis https://raw.githubusercontent.com/Kenzo669/mijo-recettes/main/recettes.json et garde-le en cache sur l'appareil (si pas de réseau, utilise le cache). Chaque recette a : id, name, country (code pays), meal (« repas » ou « petit-dejeuner »), popularity, category, time, servings, ingredients, steps, image. Ajoute un écran Recettes avec une rangée de drapeaux qui défile de gauche à droite, des onglets par continent, et un fil « Les plus populaires ». Les 20 recettes actuelles restent en plus. Si une recette n'a pas de photo, affiche un fond coloré avec le drapeau et le nom du plat, jamais la photo d'un autre plat.
```

Le point 15 marche seulement quand le dépôt public `mijo-recettes` existe. Tu le crées, je mets le fichier dedans. Si tu ne veux pas ouvrir l'UE tout de suite, au point 3 Bloxks n'y peut rien : **c'est dans App Store Connect que tu choisis les pays** (partie 3).

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

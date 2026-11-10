# Analyse du code Mijo (dernière synchro Bloxks : 9 nov., 22 h 16)

Dépôt `Kenzo669/bloxks-mijo`, commit `4a8b6f6`. Vérification de types : aucune erreur bloquante (le code compile). Les erreurs sont **de logique** : l'appli marche, mais ne fait pas ce qu'on croit.

| # | Erreur | Où | Conséquence |
|---|---|---|---|
| 1 | « 1 000 recettes » : Bloxks a inventé 70 recettes (10 par zone, 2 étapes chacune) et n'a repris que 4 des nôtres | `lib/recipes/*.ts`, `lib/importedRecipes.ts` | Catalogue maigre, recettes peu détaillées |
| 2 | Le gratuit n'est jamais limité : la règle « les 10 premières par zone sont gratuites » s'applique à des zones qui ont exactement 10 recettes | `isPremiumRecipe` dans `lib/kitchen.ts` | Aucun cadenas, personne n'a de raison de payer |
| 3 | Les 70 recettes du monde n'ont pas de photo : elles affichent toutes la photo de la 1re recette (bibimbap = rösti) | `lib/recipeFactory.ts` + `recipeImage` | Photos fausses (bloquant du test) |
| 4 | Les recettes sont copiées dans le téléphone au 1er lancement ; une recette corrigée plus tard n'est jamais mise à jour chez l'utilisateur | `useRecipes` (`lib/kitchen.ts`) | Après la sortie, impossible de corriger une photo ou un allergène chez les gens qui ont déjà l'appli |
| 5 | Quantités doublées : une recette déjà dans la liste est rajoutée | `addRecipe`, ligne 298 | Bloquant du test |
| 6 | 9 allergies seulement, pas de gluten ; la détection ne connaît pas gluten, céleri, moutarde, sulfites, lupin, mollusques | `lib/settings.ts` l. 25, `recipeAllergens` | Bloquant du test (sécurité) |
| 7 | Œufs rangés en « Produits laitiers » | `aisleForIngredient`, ligne 73 | Finition |
| 8 | Le planning démarre au lundi de la semaine, même passé | `weekDates` | Important |
| 9 | Minuteurs : une seule durée pour une étape qui fait 2 choses (« cuire les pommes de terre et assaisonner le saumon » = 20 min) | recettes du monde | Minuteurs faux |
| 10 | Police inexistante `fonts.regular` | `ShoppingScreen.tsx` l. 199 | Texte en police système (mineur) |

Les points 5 à 8 sont corrigés par le prompt 1 et le prompt A. Les points 1 à 4, 9 et 10 sont corrigés par le prompt C.

## Prompt C · Erreurs du code

```
Corrige ces erreurs dans le code de Mijo, sans changer le design :

1. Gratuit / Premium : la fonction isPremiumRecipe laisse tout gratuit, car chaque zone a exactement 10 recettes. Nouvelle règle : sur TOUTES les recettes (anciennes, importées et du monde), seules les 10 plus populaires de chaque continent sont gratuites ; une recette sans continent est Premium, sauf les recettes du carnet personnel de l'utilisateur, toujours gratuites.

2. Photos : les recettes créées avec makeWorldRecipe n'ont pas de champ photo, donc elles affichent toutes la photo de la première recette. Une recette sans sa propre photo ne doit jamais afficher la photo d'une autre : affiche un fond coloré avec le drapeau du pays et le nom du plat. Fais pareil dans recipeImage pour toute recette sans photo.

3. Mise à jour des recettes : useRecipes copie les recettes dans le stockage du téléphone et ne les met plus jamais à jour. Ne garde dans le stockage que les recettes créées par l'utilisateur et ses notes ; les recettes fournies par l'appli sont toujours lues depuis le code (ou le catalogue téléchargé), pour qu'une correction de photo, d'ingrédient ou d'allergène arrive chez tout le monde.

4. Recettes du monde : chaque étape ne fait qu'une seule action, avec son propre minuteur égal au temps écrit dans l'étape. Découpe les étapes qui font deux choses.

5. Portions : utilise le nombre de personnes du profil au lieu de 4 fixe.

6. Dans ShoppingScreen, fonts.regular n'existe pas : utilise fonts.medium.
```

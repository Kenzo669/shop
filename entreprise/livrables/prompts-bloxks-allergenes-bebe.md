# Prompts Bloxks · Allergènes et Premiers repas (10 novembre)

Deux prompts **indépendants**, à coller maintenant, un par message, dans cet ordre. Pas besoin du dépôt `mijo-recettes`.

## Prompt A · Allergènes sur toutes les recettes

```
Ajoute les allergènes à toutes les recettes de Mijo, sans changer le design :

1. Pour chaque recette déjà dans l'appli, ajoute un champ « allergènes » en lisant ses ingrédients, avec les 14 allergènes officiels UE :
- Gluten : blé, farine de blé, pain, pâtes, nouilles de blé, semoule de blé, couscous, boulgour, chapelure, panko, pâte feuilletée, brisée ou à pizza, tortillas de blé, orge, seigle, épeautre, avoine, bière, sauce soja, sauce hoisin, sauce Worcestershire.
- Crustacés : crevettes, gambas, crabe, homard, langoustines, écrevisses.
- Œufs : œufs, jaunes ou blancs d'œufs, mayonnaise, pâtes et nouilles aux œufs.
- Poissons : tous les poissons, sauce poisson (nuoc-mâm), fumet ou bouillon de poisson, anchois, sauce Worcestershire.
- Arachides : cacahuètes, beurre de cacahuète, huile d'arachide.
- Soja : sauce soja, tofu, tempeh, edamame, miso, tamari, sauce hoisin.
- Lait : lait de vache, beurre, crème, yaourt, fromages, ghee, babeurre (le lait de coco, d'amande ou d'avoine n'est pas du lait).
- Fruits à coque : noix, amandes, noisettes, noix de cajou, pistaches, noix de pécan, macadamia, pesto (la noix de coco et la muscade n'en sont pas).
- Céleri : céleri branche, céleri-rave, sel de céleri.
- Moutarde : moutarde, graines de moutarde.
- Sésame : graines et huile de sésame, tahini, houmous, zaatar.
- Sulfites : vin, vinaigre de vin, cidre, fruits secs (raisins secs, abricots secs, pruneaux).
- Lupin : farine de lupin.
- Mollusques : moules, huîtres, palourdes, calamars, seiches, poulpe, saint-jacques, sauce d'huître.
En cas de doute, ajoute l'allergène.

2. Sur chaque fiche recette, sous les ingrédients, affiche « Contient : » suivi des allergènes (ex. « Contient : gluten, lait, œufs »), ou « Sans aucun des 14 allergènes majeurs » s'il n'y en a pas. Garde l'avertissement « Vérifie toujours les étiquettes des produits ».

3. Dans l'onboarding et les Préférences, la liste des allergies propose ces 14 allergènes dans cet ordre : Gluten, Crustacés, Œufs, Poissons, Arachides, Soja, Lait, Fruits à coque, Céleri, Moutarde, Sésame, Sulfites, Lupin, Mollusques, puis « Lactose (intolérance) ». Les libellés longs passent sur deux lignes.

4. Une recette qui contient un allergène coché par l'utilisateur n'est jamais proposée : ni sur l'accueil, ni dans les menus, ni dans la recherche.
```

## Prompt B · Premiers repas (24 recettes bébé)

Recettes rédigées par l'équipe selon les repères généraux de diversification (sans sel, sans sucre, sans miel avant 1 an, œuf et viande bien cuits, poisson sans arêtes, fromage pasteurisé, quantités de viande ou de poisson de 10 g à 6–8 mois et de 15–20 g à 9–11 mois). **Léa : à faire relire par un pédiatre ou une diététicienne avant la sortie publique.**

```
Ajoute à Mijo une rubrique « Premiers repas » pour les bébés de 6 à 11 mois, sans changer le design :

1. Crée ces 24 recettes avec la catégorie « Premiers repas » (catégorie interne « bebe »). Pour chaque recette, garde : titre, âge (de/à en mois), texture, temps, portions, type (repas ou petit-déjeuner/goûter), allergènes, ingrédients avec quantités, étapes (avec minuteur quand une durée est écrite) et le conseil, affiché dans une carte « Bon à savoir ».

2. Écran : une section « Premiers repas » dans l'écran Recettes, avec deux onglets « 6 à 8 mois » et « 9 à 11 mois ». Ces recettes n'apparaissent jamais dans les menus des adultes ni dans le fil « Les plus populaires ».

3. Si le mode famille existe (Profil > Ma famille, enfant en bas âge), propose ces recettes en premier selon l'âge de l'enfant. Sinon, ajoute simplement la section.

4. En haut de la section et sur chaque recette, affiche toujours : « Repères généraux, pas un avis médical. Pour la diversification de ton bébé, suis les conseils de ton pédiatre. Sans sel, sans sucre, sans miel avant 1 an. »

5. Pas de photo inventée : tant qu'une recette n'a pas sa vraie photo, affiche un fond pastel avec le nom du plat.

6. Aucune promesse de santé, de croissance ou de poids.

Les 24 recettes :
- Purée de carotte | 6-8 mois | lisse | 25 min | 4 portions | Repas | Allergènes : aucun des 14
  Ingrédients : Carottes 300 g; Huile de colza 1 c. à c. par portion
  Étapes : 1) Épluche et coupe les carottes en rondelles. 2) Cuis-les à la vapeur 20 minutes, jusqu'à ce qu'elles s'écrasent sous la fourchette. 3) Mixe très finement en ajoutant un peu d'eau de cuisson. 4) Au moment de servir, ajoute l'huile dans la portion.
  Conseil : Première purée idéale : douce et sucrée naturellement.
- Purée de courgette et pomme de terre | 6-8 mois | lisse | 25 min | 4 portions | Repas | Allergènes : aucun des 14
  Ingrédients : Courgette 250 g; Pomme de terre 100 g; Huile de colza 1 c. à c. par portion
  Étapes : 1) Lave la courgette sans l'éplucher si elle est bio, sinon épluche-la. Épluche la pomme de terre. Coupe en dés. 2) Cuis à la vapeur 15 minutes. 3) Mixe très finement. 4) Ajoute l'huile dans la portion au moment de servir.
  Conseil : La pomme de terre donne une texture plus onctueuse.
- Purée de patate douce | 6-8 mois | lisse | 30 min | 4 portions | Repas | Allergènes : aucun des 14
  Ingrédients : Patate douce 350 g; Huile de colza 1 c. à c. par portion
  Étapes : 1) Épluche et coupe la patate douce en cubes. 2) Cuis à la vapeur 20 minutes. 3) Mixe finement avec un peu d'eau de cuisson. 4) Ajoute l'huile dans la portion.
  Conseil : Se congèle très bien en bac à glaçons.
- Purée de petits pois et pomme de terre | 6-8 mois | lisse | 25 min | 4 portions | Repas | Allergènes : aucun des 14
  Ingrédients : Petits pois surgelés 200 g; Pomme de terre 100 g; Huile de colza 1 c. à c. par portion
  Étapes : 1) Épluche et coupe la pomme de terre en dés. 2) Cuis la pomme de terre et les petits pois à la vapeur 15 minutes. 3) Mixe très finement, puis passe au tamis pour retirer les peaux. 4) Ajoute l'huile dans la portion.
  Conseil : Passe bien au tamis : les peaux des pois gênent les petits.
- Purée de brocoli et pomme de terre | 6-8 mois | lisse | 25 min | 4 portions | Repas | Allergènes : aucun des 14
  Ingrédients : Brocoli 200 g; Pomme de terre 150 g; Huile de colza 1 c. à c. par portion
  Étapes : 1) Détaille le brocoli en petits bouquets, épluche et coupe la pomme de terre. 2) Cuis à la vapeur 15 minutes. 3) Mixe très finement. 4) Ajoute l'huile dans la portion.
  Conseil : Goût plus marqué : propose-le plusieurs fois, sans forcer.
- Purée de courge butternut | 6-8 mois | lisse | 30 min | 4 portions | Repas | Allergènes : aucun des 14
  Ingrédients : Courge butternut 400 g; Huile de colza 1 c. à c. par portion
  Étapes : 1) Épluche la courge, retire les graines, coupe en cubes. 2) Cuis à la vapeur 20 minutes. 3) Mixe finement. 4) Ajoute l'huile dans la portion.
  Conseil : Parfaite en automne et en hiver.
- Compote de pomme sans sucre | 6-8 mois | lisse | 20 min | 4 portions | Petit-déjeuner/goûter | Allergènes : aucun des 14
  Ingrédients : Pommes douces 4; Eau 3 c. à s.
  Étapes : 1) Épluche, épépine et coupe les pommes en morceaux. 2) Cuis à couvert avec l'eau, à feu doux, 15 minutes. 3) Mixe finement. N'ajoute pas de sucre.
  Conseil : Pas de sucre ajouté : le fruit suffit.
- Banane écrasée | 6-8 mois | lisse | 3 min | 1 portion | Petit-déjeuner/goûter | Allergènes : aucun des 14
  Ingrédients : Banane bien mûre 0.5
  Étapes : 1) Écrase la demi-banane à la fourchette jusqu'à obtenir une purée bien lisse. 2) Sers tout de suite, avant qu'elle noircisse.
  Conseil : Sans cuisson, idéal en sortie.
- Purée de carotte et poulet | 6-8 mois | lisse | 25 min | 1 portion | Repas | Allergènes : aucun des 14
  Ingrédients : Carottes 130 g; Blanc de poulet 10 g; Huile de colza 1 c. à c. par portion
  Étapes : 1) Épluche et coupe la carotte en rondelles. 2) Cuis la carotte et le poulet ensemble à la vapeur 15 minutes. Le poulet doit être bien cuit à cœur. 3) Mixe très finement. 4) Ajoute l'huile.
  Conseil : Repère : environ 10 g de viande par jour à cet âge, soit 2 cuillères à café.
- Purée de courgette et cabillaud | 6-8 mois | lisse | 20 min | 1 portion | Repas | Allergènes : Poissons
  Ingrédients : Courgette 130 g; Filet de cabillaud sans arêtes 10 g; Huile de colza 1 c. à c. par portion
  Étapes : 1) Coupe la courgette en dés. 2) Cuis la courgette à la vapeur 10 minutes, ajoute le cabillaud et cuis encore 5 minutes. 3) Vérifie qu'il ne reste aucune arête, puis mixe très finement. 4) Ajoute l'huile.
  Conseil : Repère : environ 10 g de poisson par jour. Poisson une à deux fois par semaine.
- Purée d'épinards, pomme de terre et œuf | 6-8 mois | lisse | 25 min | 1 portion | Repas | Allergènes : Œufs
  Ingrédients : Épinards frais 80 g; Pomme de terre 60 g; Œuf 1; Huile de colza 1 c. à c. par portion
  Étapes : 1) Fais cuire l'œuf 10 minutes dans l'eau bouillante : il doit être dur. 2) Cuis la pomme de terre et les épinards à la vapeur 15 minutes. 3) Mixe les légumes avec un quart du jaune et du blanc d'œuf dur. 4) Ajoute l'huile. Le reste de l'œuf est pour les grands.
  Conseil : Œuf toujours bien cuit. Repère : un quart d'œuf dur à cet âge.
- Purée de lentilles corail et carotte | 6-8 mois | lisse | 25 min | 4 portions | Repas | Allergènes : aucun des 14
  Ingrédients : Lentilles corail 40 g; Carottes 250 g; Huile de colza 1 c. à c. par portion
  Étapes : 1) Rince les lentilles. Épluche et coupe les carottes. 2) Cuis les lentilles et les carottes dans de l'eau sans sel 20 minutes. 3) Mixe très finement. 4) Ajoute l'huile dans la portion.
  Conseil : Les légumes secs peuvent être proposés dès le début de la diversification, en petite quantité.
- Écrasé de patate douce et saumon | 9-11 mois | écrasé | 25 min | 1 portion | Repas | Allergènes : Poissons
  Ingrédients : Patate douce 150 g; Pavé de saumon sans arêtes 20 g; Huile de colza 1 c. à c. par portion
  Étapes : 1) Épluche et coupe la patate douce en cubes. 2) Cuis à la vapeur 15 minutes, ajoute le saumon les 6 dernières minutes. 3) Retire la peau et vérifie les arêtes. 4) Écrase à la fourchette en laissant quelques petits morceaux fondants. Ajoute l'huile.
  Conseil : Repère : environ 15 à 20 g de poisson par jour.
- Petites pâtes, courgette et poulet | 9-11 mois | petits morceaux | 20 min | 1 portion | Repas | Allergènes : Gluten
  Ingrédients : Petites pâtes (étoiles, coquillettes) 20 g; Courgette 100 g; Blanc de poulet 20 g; Huile de colza 1 c. à c. par portion
  Étapes : 1) Cuis les pâtes dans de l'eau sans sel, un peu plus longtemps que indiqué pour qu'elles soient bien tendres. 2) Cuis la courgette et le poulet en petits dés à la vapeur 12 minutes. 3) Hache finement le poulet, écrase la courgette, mélange avec les pâtes. 4) Ajoute l'huile.
  Conseil : Premiers vrais morceaux : tout doit s'écraser entre deux doigts.
- Semoule aux légumes et dinde | 9-11 mois | petits morceaux | 20 min | 1 portion | Repas | Allergènes : Gluten
  Ingrédients : Semoule fine de blé 20 g; Carotte 60 g; Courgette 60 g; Escalope de dinde 20 g; Huile de colza 1 c. à c. par portion
  Étapes : 1) Coupe les légumes et la dinde en petits dés. 2) Cuis-les à la vapeur 15 minutes. 3) Verse 50 ml d'eau chaude sur la semoule, couvre 5 minutes, puis égrène. 4) Hache la dinde, écrase les légumes, mélange avec la semoule. Ajoute l'huile.
  Conseil : Semoule bien gonflée et souple : pas de grains secs.
- Risotto doux au potiron | 9-11 mois | petits morceaux | 30 min | 2 portions | Repas | Allergènes : Lait
  Ingrédients : Riz rond 40 g; Potiron 150 g; Fromage râpé au lait pasteurisé 10 g; Beurre 5 g
  Étapes : 1) Coupe le potiron en petits dés. 2) Fais cuire le riz et le potiron dans 300 ml d'eau sans sel, à feu doux, 25 minutes, en remuant souvent. 3) Ajoute un peu d'eau si besoin : le riz doit être très fondant. 4) Hors du feu, ajoute le fromage et le beurre.
  Conseil : Fromage toujours au lait pasteurisé avant 5 ans.
- Dhal doux de lentilles corail | 9-11 mois | écrasé | 25 min | 2 portions | Repas | Allergènes : aucun des 14
  Ingrédients : Lentilles corail 50 g; Carotte 80 g; Lait de coco 30 ml; Cumin en poudre 1 pincée
  Étapes : 1) Rince les lentilles. Coupe la carotte en petits dés. 2) Cuis les lentilles et la carotte dans 250 ml d'eau sans sel, 20 minutes. 3) Ajoute le lait de coco et la pincée de cumin, mélange. 4) Écrase grossièrement.
  Conseil : Une épice douce aide à découvrir les saveurs. Pas de piment.
- Omelette fine aux légumes en lamelles | 9-11 mois | à attraper | 15 min | 2 portions | Repas | Allergènes : Œufs
  Ingrédients : Œufs 2; Courgette râpée 50 g; Huile de colza 1 c. à c.
  Étapes : 1) Bats les œufs avec la courgette râpée. 2) Cuis à feu doux dans l'huile, 4 minutes de chaque côté : l'omelette doit être bien prise. 3) Laisse tiédir et coupe en lamelles de la taille d'un doigt.
  Conseil : À attraper avec les doigts. Œuf toujours bien cuit. Un tiers de l'omelette pour bébé, le reste pour les grands.
- Polenta crémeuse aux épinards | 9-11 mois | écrasé | 15 min | 2 portions | Repas | Allergènes : Lait
  Ingrédients : Polenta fine 30 g; Épinards 80 g; Lait de croissance ou lait infantile 100 ml; Beurre 5 g
  Étapes : 1) Cuis les épinards à la vapeur 5 minutes, puis hache-les finement. 2) Porte le lait à frémissement avec 100 ml d'eau, verse la polenta en pluie en remuant. 3) Cuis 5 minutes à feu doux en remuant. 4) Ajoute les épinards et le beurre.
  Conseil : La polenta (maïs) ne contient pas de gluten.
- Bâtonnets de légumes fondants | 9-11 mois | à attraper | 25 min | 2 portions | Repas | Allergènes : aucun des 14
  Ingrédients : Carotte 1; Courgette 0.5; Patate douce 100 g
  Étapes : 1) Épluche les légumes et coupe-les en bâtonnets de la taille d'un doigt. 2) Cuis à la vapeur 15 à 20 minutes : ils doivent s'écraser entre deux doigts. 3) Laisse tiédir avant de les proposer.
  Conseil : Bébé mange avec les doigts : reste toujours à côté pendant le repas.
- Mini-hachis de bœuf et carotte | 9-11 mois | écrasé | 30 min | 2 portions | Repas | Allergènes : Lait
  Ingrédients : Bœuf haché 5 % MG 40 g; Carottes 150 g; Pomme de terre 100 g; Beurre 5 g
  Étapes : 1) Épluche et coupe les légumes en dés, cuis-les à la vapeur 20 minutes. 2) Cuis le bœuf haché dans une petite poêle sans matière grasse, 6 minutes, jusqu'à ce qu'il ne reste aucune trace rosée. 3) Écrase les légumes avec le beurre. 4) Mets le bœuf au fond d'un ramequin, couvre avec l'écrasé.
  Conseil : Viande hachée toujours bien cuite à cœur. Repère : 15 à 20 g de viande par jour, la moitié de la recette.
- Écrasé de cabillaud, brocoli et pomme de terre | 9-11 mois | écrasé | 20 min | 1 portion | Repas | Allergènes : Poissons
  Ingrédients : Filet de cabillaud sans arêtes 20 g; Brocoli 70 g; Pomme de terre 80 g; Huile de colza 1 c. à c. par portion
  Étapes : 1) Coupe la pomme de terre en dés et le brocoli en petits bouquets. 2) Cuis à la vapeur 12 minutes, ajoute le cabillaud et cuis encore 6 minutes. 3) Vérifie les arêtes. Écrase le tout à la fourchette. 4) Ajoute l'huile.
  Conseil : Poisson une à deux fois par semaine, dont un poisson gras (saumon, sardine).
- Porridge d'avoine à la pomme | 9-11 mois | écrasé | 10 min | 1 portion | Petit-déjeuner/goûter | Allergènes : Gluten, Lait
  Ingrédients : Flocons d'avoine fins 15 g; Lait de croissance ou lait infantile 120 ml; Pomme 0.5
  Étapes : 1) Râpe finement la demi-pomme. 2) Fais chauffer le lait avec les flocons et la pomme, 5 minutes à feu doux, en remuant. 3) Laisse tiédir. N'ajoute ni sucre ni miel.
  Conseil : Utilise le lait habituel de bébé, pas de lait de vache en boisson avant 1 an.
- Yaourt nature et poire écrasée | 9-11 mois | écrasé | 5 min | 1 portion | Petit-déjeuner/goûter | Allergènes : Lait
  Ingrédients : Yaourt nature au lait entier 1; Poire bien mûre 0.5
  Étapes : 1) Épluche la poire et écrase-la finement. 2) Mélange avec le yaourt. Pas de sucre ajouté.
  Conseil : Le dessert ou le goûter de 9 mois et plus.
```

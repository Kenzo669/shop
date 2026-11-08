# Instructions à coller dans le chat de Bloxks (Zoé, validé par Max le 8/11/2026)

Coller les messages un par un, dans l'ordre. Après chaque message, faire la vérification avant de passer au suivant.
Avant le message 4 : compléter [NOM DE L'ÉDITEUR] et [EMAIL PRO] (pas d'adresse ni de téléphone) dans `politique-confidentialite-mijo.md` et coller ce texte (de « Politique de confidentialité de Mijo » à « Changements ») sous le message.

## Message 1 · Bloquants Apple
Corrige ces points avant toute publication :
1. Dans l'écran « Ajouter une recette », retire le bouton « Remplir depuis la photo ». La photo du plat reste.
2. Supprime le profil de démonstration « Camille Martin » partout. Tant que l'utilisateur n'a pas saisi son prénom, le Profil affiche « Ajoute ton prénom ».
3. Un nouvel utilisateur démarre avec une appli vide : pas de menu prévu, pas de favoris, pas de liste de courses, rien dans le placard, aucun plat marqué prêt et aucun « Cuisinée 2 fois ».
4. « Effacer mes données » dans les Réglages remet tout à zéro. Ensuite, aucune donnée de démonstration ne revient et le nom Camille Martin ne réapparaît pas.

**Vérifier** : au premier lancement, menu, liste et carnet vides, Profil « Ajoute ton prénom ». Prévoir un plat, effacer les données, relancer : tout est vide, pas de Camille. Plus de bouton « Remplir depuis la photo ».

## Message 2 · Données et navigation
1. Range chaque ingrédient de toutes les recettes dans le bon rayon. Les fromages, y compris le fromage à raclette, le parmesan et la ricotta, vont en « Fromages ». Le beurre, la crème, le lait et les œufs vont en « Produits laitiers ». Les pâtes et le riz vont en « Épicerie & pâtes ». Les tomates concassées, les haricots et les cornichons vont en « Conserves ». Les viandes vont en « Viande & volaille » et les poissons en « Poisson & fruits de mer ».
2. La barre d'onglets devient : « Menus » ouvre le menu de la semaine (l'écran « Tes menus ») ; « Recettes » ouvre la recherche ; « Courses », avec l'icône caddie, ouvre la liste de courses ; « Profil ». L'onglet « Liste » disparaît.
3. Renomme l'écran « Ma liste » (les recettes enregistrées) en « Mon carnet ». Ajoute un bouton « Mon carnet » en haut de l'écran Recettes.
4. Supprime l'écran « À accompagner » et le bouton « Conseil de service » de la fiche recette.
5. Dans le Profil, les compteurs deviennent « Gardées », « Cuisinés » et « Perso », sans texte coupé. Cache un compteur quand il vaut 0. Retire la ligne « Réglages » du bas : la roue dentée suffit.
6. Dans les Réglages, supprime « Notifications » et « Sons ». « Vibrations » reste.
7. Dans les Réglages, section « Données », ajoute « Exporter mes recettes » (crée un fichier avec mes recettes perso, photos et histoires comprises, et mes favoris, à envoyer par mail, AirDrop ou dans Fichiers) et « Importer des recettes » (relit ce fichier sans créer de doublons).

**Vérifier** : la raclette range le fromage en « Fromages » et les macaronis en « Épicerie & pâtes ». L'onglet « Courses » ouvre la liste. L'écran vin n'existe plus. Exporter une recette perso, effacer les données, importer : la recette revient.

## Message 3 · Premier lancement et dépenses
1. Le premier lancement passe à trois étapes : « Combien êtes-vous à table ? » (boutons – et +, de 1 à 8 personnes, 2 par défaut) ; « Y a-t-il des allergènes à éviter ? » ; « Choisis tes dîners de la semaine », qui ne montre que des recettes compatibles avec les allergies.
2. Place les dîners choisis sur les jours à partir d'aujourd'hui. Ouvre ensuite le menu avec le titre « Ta semaine est prête ! » et un bouton « Voir ma liste de courses », qui prépare la liste et l'ouvre.
3. Retire la recherche des commerces du premier lancement. Ajoute-la dans la liste de courses sous la forme d'une ligne facultative « Trouver mon magasin ». La position n'est demandée que si l'utilisateur la touche.
4. Dépenses : le bouton « Partager la liste » ne fait plus que partager. La fenêtre « Combien as-tu payé ? » s'ouvre après « Valider achats », et quand on touche une nouvelle ligne « Ajouter une dépense », toujours visible en haut de la liste de courses. Le bouton « Passer » reste.
5. Dans les Réglages, ajoute « Pays » (Suisse, France, Belgique, Luxembourg). Le pays fixe la devise, CHF ou EUR. Par défaut, prends la région du téléphone.

**Vérifier** : 3 écrans puis « Ta semaine est prête ! ». Dans Courses, sans partager, « Ajouter une dépense », saisir 42 : le montant apparaît dans « Dépensé ce mois-ci ».

## Message 4 · Abonnement et pages légales
1. Avec Bloxks Pay, crée l'abonnement « Mijo Premium » : mensuel à 3,99 € ou 5 CHF, sans essai ; annuel à 29,99 € ou 35 CHF, avec 7 jours d'essai gratuit.
2. Ce qui reste gratuit : le menu de la semaine en cours, la liste de courses par rayon, le mode cuisine, l'export des recettes et le carnet jusqu'à 30 recettes.
3. Ce que débloque Premium : les menus des semaines suivantes sans limite, « Prêtes avec tes courses », le suivi des dépenses et le carnet au-delà de 30 recettes.
4. L'offre s'affiche seulement quand on touche « Semaine suivante » (une flèche à ajouter sur « Tes menus ») ou quand on enregistre une 31e recette. Ailleurs, les fonctions Premium portent un badge « Premium » et n'ouvrent l'offre que si l'utilisateur les touche. Jamais au lancement.
5. Sur l'écran de l'offre : l'annuel est présélectionné avec « 7 jours gratuits, puis 29,99 € par an » ; le prix et la durée de chaque formule sont écrits en clair ; la phrase « Renouvellement automatique, résiliable à tout moment dans les réglages de ton identifiant Apple, au moins 24 h avant la fin de la période. Paiement débité sur ton compte Apple. » ; les boutons « Restaurer mes achats », « Conditions d'utilisation » et « Politique de confidentialité » ; un bouton « Continuer gratuitement » bien visible.
6. Dans les Réglages, ajoute « Mijo Premium » (état de l'abonnement) et « Restaurer mes achats ».
7. Les liens « Aide et contact », « Politique de confidentialité » et « Conditions d'utilisation » renvoient une erreur. Fais-les ouvrir de vraies pages. Confidentialité : le texte collé sous ce message, complété de trois phrases (la position est arrondie à environ 1 km avant l'envoi ; les dépenses restent sur le téléphone ; le paiement est géré par Apple et Mijo ne voit aucune donnée bancaire). Conditions : les conditions standard d'Apple, plus les conditions de l'abonnement ci-dessus. Aide : l'e-mail de contact uniquement (aucun numéro de téléphone, aucune adresse postale) et 4 réponses (exporter, importer, effacer mes données, résilier).
8. Avant d'envoyer la position à OpenStreetMap, arrondis la latitude et la longitude à 2 décimales.

[coller ici la politique de confidentialité complétée]

**Vérifier** : dans Tes menus, « Semaine suivante » ouvre l'offre avec les deux prix, les mentions et « Continuer gratuitement ». L'offre n'apparaît pas toute seule avant la 31e recette. Les 3 liens des Réglages ouvrent une page avec du texte.

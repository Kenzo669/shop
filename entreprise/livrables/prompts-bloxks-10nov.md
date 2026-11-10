# Prompts Bloxks du 10 novembre (version validée par le patron)

Les prompts se collent dans Bloxks **dans l'ordre**, un par message. Attends que Bloxks ait fini avant de coller le suivant, puis vérifie l'aperçu.
Décisions appliquées : compte dès la v1, tous les pays sauf l'UE, 10 recettes gratuites par continent, suivi des dépenses **Premium**, onboarding en 7 écrans, mode famille avec enfant en bas âge.

---

## Prompt 1 · Corrections du test Founder Skill

```
Corrige et complète l'appli Mijo comme suit, sans changer le design actuel :

1. ALLERGIES (onboarding + Préférences) : remplace la liste par les 14 allergènes officiels UE, dans cet ordre : Gluten, Crustacés, Œufs, Poissons, Arachides, Soja, Lait, Fruits à coque, Céleri, Moutarde, Sésame, Sulfites, Lupin, Mollusques. Garde « Lactose (intolérance) » en plus, à la fin. Une recette qui contient un allergène coché n'est jamais proposée nulle part (accueil, menus, recherche). Les libellés longs passent sur deux lignes au lieu d'être coupés (« Lactose (intolérance) », « Recettes avec mes courses », « Politique de confidentialité »).

2. ONBOARDING en 7 écrans, dans cet ordre : (1) bienvenue avec l'accroche « Qu'est-ce qu'on se fait de bon ? », (2) création de compte avec l'authentification intégrée de Bloxks : e-mail + mot de passe, case CGU obligatoire avec lien, case newsletter facultative en dessous, lien « J'ai déjà un compte », (3) pays, (4) nombre de personnes, (5) cuisines préférées par continent, (6) allergies, (7) paywall. Ne demande jamais de numéro de téléphone ni d'adresse. Magasin habituel, budget et objectif (se faire plaisir / bien manger / léger / prendre de la masse) vont dans le Profil, facultatifs.

3. PAYS : propose tous les pays, avec la devise du pays pour le suivi des dépenses (CHF, EUR, GBP, AED, MAD, CAD, USD, etc.).

4. COMPTE : dans Paramètres, remplace « Effacer les données locales » par un bouton rouge « Supprimer le compte » tout en bas. Il demande une confirmation, puis supprime définitivement le compte et toutes ses données sur le serveur et sur l'appareil. Ajoute aussi « Se déconnecter » juste au-dessus. Les menus, la liste de courses, le carnet et les préférences sont enregistrés dans le compte.

5. GRATUIT / PREMIUM : en gratuit, seules les 10 recettes les plus populaires de chaque continent sont ouvertes. Les autres affichent un petit cadenas et ouvrent le paywall. Le suivi des dépenses reste Premium : en gratuit, après « Fin des courses », affiche une carte « Suis tes dépenses avec Mijo Premium » qui ouvre le paywall, sans jamais bloquer la fin des courses.

6. PAYWALL : remplace l'image des verres de vin par une photo de plats. Titre : « Le tour du monde dans ton assiette ». Bénéfices, dans cet ordre : toutes les recettes du monde débloquées, ton carnet de recettes de famille illimité, le suivi de tes dépenses de courses, des nouvelles recettes chaque semaine. Sous le bouton, un lien « Continuer gratuitement » qui ferme le paywall. Garde l'annuel présélectionné à 29,99 € (35 CHF) et le mensuel à 3,99 € (5 CHF), essai gratuit de 7 jours.

7. LISTE DE COURSES : une recette déjà dans la liste n'est jamais ajoutée une deuxième fois. Si on touche « Ajouter à la liste » sur une recette puis « Préparer la liste de courses » depuis les menus, la recette n'est comptée qu'une fois. Les quantités s'additionnent seulement si la recette est prévue deux fois dans les menus. Crée un rayon « Œufs & frais » et range les œufs dedans, pas dans « Produits laitiers ».

8. MENUS : le planning commence aujourd'hui, jamais un jour déjà passé. Quand on choisit une recette depuis un créneau, la recherche est filtrée : petit-déjeuner pour le matin, repas pour le déjeuner et le dîner.

9. PORTIONS : chaque recette s'ouvre avec le nombre de personnes du profil. La liste des recettes, les menus et la liste de courses affichent ce même nombre.

10. MODE CUISINE : chaque minuteur reprend le temps écrit dans l'étape (« 3 minutes » = 3:00) ; pas de minuteur si l'étape n'a pas de durée. En fin de recette, « Terminer » affiche « Tu l'as cuisiné ! », augmente le compteur « Cuisinés » et propose une note de 1 à 5 étoiles. Si la note n'est pas donnée, une notification la redemande 30 minutes plus tard.

11. Fusionne « Ajouter au menu » et « Ajouter au calendrier » en un seul bouton « Ajouter à mes menus » qui ouvre le choix du jour et du repas, et qui fonctionne.

12. CARNET : renomme les options JSON en « Sauvegarder mes recettes » et « Restaurer mes recettes ».

13. MODE NOËL du 1er au 31 décembre : petite neige sur l'accueil, une déco sur le logo, et une section « Spécial Noël » sur l'accueil.

14. Affiche la barre de navigation du bas sur l'accueil aussi.

15. Retire « Magasin habituel » de la liste de courses et n'affiche aucun prix estimé.
```

---

## Prompt 2 · Les 1 178 recettes et les allergènes

À coller **seulement quand le dépôt public `mijo-recettes` existe et que Max y a mis le fichier**.

```
Ajoute le catalogue de recettes de Mijo :

1. Au démarrage, télécharge https://raw.githubusercontent.com/Kenzo669/mijo-recettes/main/recettes.json et garde-le en cache sur l'appareil. S'il n'y a pas de réseau, utilise le cache. Recharge-le une fois par jour au plus.

2. Le fichier contient « recipes », une liste de recettes avec : id, title, country (code pays à 2 lettres), meal (« repas » ou « petit-dejeuner »), popularity (1 = la plus populaire du pays), tags, minutes, servings, story, ingredients (name, qty, unit, aisle), steps (text, seconds), allergens (liste de codes), enfants (des = âge minimum en mois, conseils = liste de phrases). « allergenLabels » donne le nom affiché de chaque code allergène.

3. Ajoute ces recettes aux recettes actuelles de l'appli. Les recettes actuelles restent.

4. Écran Recettes : en haut, une rangée de drapeaux qui défile de gauche à droite (toucher un drapeau = les spécialités du pays). En dessous, des onglets par continent (Europe, Afrique, Amériques, Asie, Moyen-Orient, Océanie) et un interrupteur Repas / Petit-déjeuner. Puis un fil « Les plus populaires », trié par popularity.

5. Les 10 recettes les plus populaires de chaque continent sont gratuites ; les autres ont le cadenas Premium.

6. Allergènes : utilise le champ allergens des nouvelles recettes. Pour les recettes déjà dans l'appli, ajoute toi-même le même champ en lisant leurs ingrédients, avec les mêmes codes : gluten (blé, farine, pain, pâtes, semoule, chapelure, sauce soja, bière…), crustaces, oeufs, poissons, arachides, soja, lait (lait, beurre, crème, fromage, yaourt), fruits_a_coque, celeri, moutarde, sesame, sulfites (vin, vinaigre de vin, fruits secs), lupin, mollusques. En cas de doute, ajoute l'allergène. Sur chaque fiche recette, affiche « Contient : … » avec les noms des allergènes.

7. Photos : si une recette n'a pas sa propre photo, affiche un fond coloré avec le drapeau du pays et le nom du plat. N'utilise jamais la photo d'un autre plat.
```

---

## Prompt 3 · Mode famille (enfant en bas âge)

À coller après le prompt 2.

```
Ajoute un mode famille à Mijo :

1. Dans l'écran de création des menus, ajoute une option « Repas de famille ». Si on l'active : « Il y a un enfant en bas âge ? » Oui / Non. Si oui : « Quel âge ? » avec ces choix : 6 à 8 mois, 9 à 11 mois, 1 à 2 ans, 3 à 5 ans. On peut ajouter plusieurs enfants. Le choix est aussi modifiable dans le Profil, rubrique « Ma famille ».

2. Quand un enfant est déclaré :
   - les recettes dont « enfants.des » (âge minimum en mois) est plus grand que l'âge de l'enfant ne sont pas proposées dans les menus de famille ;
   - sur chaque recette, une carte « Pour les petits » affiche la liste « enfants.conseils » ;
   - la liste de courses ne change pas : l'enfant mange le même plat, adapté.

3. Pour les enfants de 6 à 11 mois, ajoute une section « Premiers repas » avec les recettes qui ont la catégorie « bebe » (elles arriveront dans le fichier de recettes). Tant qu'il n'y en a aucune, n'affiche pas la section.

4. En bas de la carte « Pour les petits » et de la section « Premiers repas », affiche toujours : « Conseils généraux, pas un avis médical. Pour la diversification de ton bébé, suis les conseils de ton pédiatre. »

5. Aucune promesse de santé, de poids ou de croissance dans les textes.
```

---

## Prompt 4 · Photos

Déjà prêt : `entreprise/livrables/prompt-photos-bloxks.md` (8 lots de 40, les 286 incontournables d'abord). Un lot par message.

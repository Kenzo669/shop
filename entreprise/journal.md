# Journal des livrables

Le plus récent en haut. Chaque entrée : date, auteur, titre, résumé en 3 lignes, statut (proposé / validé par le patron / fait).

## 2026-11-10 · Test Founder Skill de l'aperçu (rapport de Max)
Rapport : `entreprise/rapport-founder-skill-10nov.md` (+ PDF dans `livrables/`).
- **Max** : 5/10 inchangé. 3 bloquants de confiance (gluten absent, photos fausses, quantités doublées). L'appli n'a que 164 recettes : notre catalogue de 1 178 n'est pas chargé. 25 remarques triées, prompt Bloxks unique en 15 points (14 de Founder Skill + chargement des recettes). Statut : proposé.
- **Décisions à confirmer** : compte dès le début, tous les pays (risque : en UE, Apple affiche publiquement le téléphone du vendeur, donc pays hors UE d'abord), dépenses gratuites, gratuit limité à 10 recettes par continent, onboarding raccourci à 7 écrans. Statut : ouvert.

## 2026-11-10 · Robot cuisinier et nouvelles applis (rapport PDF)
Rapport : `entreprise/livrables/Rapport-robot-et-nouvelles-applis.pdf`. Recrutement de Nora (matériel et fournisseurs) et Théo (studio d'applis).
- **Sam** : les fabricants de cuisine connectée ferment (Brava, June, Karakuri, Picnic) ; les gagnants vendent du logiciel. Pari : pas de matériel avant le 6 déc. Statut : proposé.
- **Nora** : marché, fournisseurs chinois (prix non vérifiés), obligations CE/Suisse ; 3 chemins (aucun matériel 0–500 CHF, accessoire 15–35 k CHF, robot 120–200 k CHF). Message fournisseur prêt, non envoyé. Statut : proposé.
- **Malik** : robot à notre marque déficitaire même en vendant tout ; accessoire rentable seulement en pack avec l'abonnement et sous conditions (1 000 abonnés, 300 précommandes, 35 k CHF). Statut : proposé.
- **Théo** : 10 idées notées ; Mijo Bébé 21/25 en tête, puis chiot (18) et suisse allemand (17). Une seule appli en construction à la fois. Statut : proposé.

## 2026-11-08 (soir) · Code de Mijo corrigé par l'équipe
- **Zoé · Vérification de la v2 (ZIP du patron)** : 7 corrections faites, 7 partielles, 1 non faite (fausse lecture de photo). Prix annuel à 39,99 € sans essai au lieu de 29,99 € avec 7 jours.
- **Léa · Vérification conformité** : pages légales toujours en 404, Bloxks Pay pas activé (clé vide), aucune donnée personnelle du patron dans le code. La politique de confidentialité doit mentionner Bloxks Pay.
- **Max · Corrections appliquées dans le code** (ZIP `mijo-code-corrige.zip` remis au patron, détail dans CHANGEMENTS-EQUIPE.md) : fausse photo supprimée, rayons, menu daté, dîners jamais sur un jour passé, 31e recette pour les abonnés, libellés, liste de courses simplifiée, mentions Premium, statut d'abonnement. Non lancé (pas d'environnement Expo) ; syntaxe vérifiée.
- **Reste côté Bloxks** (fichiers gérés par Bloxks) : prix annuel et essai, bouton « Continuer gratuitement », pages légales, clé Apple pour Bloxks Pay.

## 2026-11-08 (nuit) · Contrôle de la version « Rattrapage automatique »
- **Max** : nouvelle version reçue, mais elle ne contient que 3 fichiers techniques ajoutés par Bloxks (publicités AdMob, position en arrière-plan, enregistrement d'images), qu'aucun écran n'utilise. Aucune des 22 corrections n'est appliquée (Camille Martin, bouton photo factice et écran vin toujours là). À surveiller : si Bloxks active un jour les pubs ou la position en arrière-plan, les promesses « sans pub » et la politique de confidentialité deviennent fausses. Statut : fait.

## 2026-11-08 (soir) · Tournée « Au travail ! »
- **Léa · Pages légales** : les 3 liens légaux de Mijo (confidentialité, conditions, assistance) renvoient une erreur 404 : refus Apple assuré en l'état. Politique de confidentialité rédigée et questionnaire App Store préparé : `entreprise/livrables/politique-confidentialite-mijo.md`. Statut : proposé.
- **Malik · Prix** : 3,99 €/mois ou 29,99 €/an (5 / 35 CHF), essai 7 jours sur l'annuel. La Suisse rapporte ~43 % de plus par abonné. Désaccord avec Zoé ajouté. Statut : proposé.
- **Sam · Avis négatifs et Suisse** : Jow est absent de Suisse ; les vrais concurrents y sont Migusto (Migros), FOOBY (Coop) et Bring!. Pari : Mijo « indépendante des enseignes, sans compte, sans pub » en Suisse romande. Statut : proposé.
- **Zoé · Fiche App Store** : versions A et B : `entreprise/livrables/fiche-app-store-mijo.md`. Statut : proposé.
- **Hugo · 7 jours de contenu** : `entreprise/livrables/calendrier-contenu-7-jours.md`. Bug signalé : la saisie de la dépense n'apparaît qu'après avoir partagé la liste. Statut : proposé.
- **Inès · Tri des mails** : fait, aucun brouillon nécessaire. Points personnels transmis au patron en direct (non archivés ici). Statut : fait.

## 2026-11-08 (19 h 31) · Nouvelle version de Mijo reçue
- **Max · Contrôle de la version** : la synchro GitHub fonctionne. Nouveauté : suivi des dépenses de courses (« Dépensé ce mois-ci », en CHF ou EUR selon le pays). Aucune des 7 corrections n'est encore appliquée : la transcription photo est toujours factice et le profil « Camille Martin » toujours présent. Statut : fait.

## 2026-11-08 (soir) · Revue du code de Mijo
Dépôt `Kenzo669/bloxks-mijo` connecté. Détail : fin de `entreprise/rapport-2026-11-08.md`.

- **Léa · Audit App Store** : pas prête. 3 bloquants (transcription photo factice, profil de démo Camille Martin, confidentialité de la position), 7 points importants. Statut : proposé.
- **Zoé · Revue de l'expérience** : onglets mal branchés, données de démo chez chaque nouvel utilisateur, bug de rayons ; Mijo est un planificateur avec un carnet greffé ; 7 corrections prêtes à coller dans Bloxks. Statut : proposé.
- **Désaccord** Léa vs Zoé sur la création de compte en v1. Statut : ouvert.

## 2026-11-08 (après-midi) · Mijo
Détail : fin de `entreprise/rapport-2026-11-08.md`.

- **Sam · Concurrents de Mijo** : Jow (gratuit + drive) et Marmiton dominent ; prix du marché 2,99 à 6,99 €/mois ; pari « carnet de cuisine de la famille ». Statut : proposé.
- **Zoé · Écran Profil et premier lancement** : 2 libellés tronqués, profil de démo, fonctions cachées dans le Profil ; parcours « Ta semaine est prête » ; Premium 3,99 €/mois ou 24,99 €/an. Statut : proposé.
- **Hugo · Marketing Mijo** : série « On mange quoi ce soir ? », défi batch cooking 25 €, page d'attente A/B et 3 scripts ; cible recommandée : jeunes parents. Statut : proposé.
- **Désaccord** Sam vs Hugo et Zoé sur le positionnement, ajouté pour l'appel. Statut : ouvert.

## 2026-11-08 · Rapport de Max : lancement de l'appli Bloxks
Rapport complet : `entreprise/rapport-2026-11-08.md`.

- **Max · Rapport pour le retour du patron** : vérification de l'appli impossible sans le résumé de la discussion du matin et un lien d'aperçu web Bloxks. Aucun test lancé (accord requis). 1 désaccord ouvert (Hugo vs Malik). Statut : proposé.
- **Sam · Étude de Bloxks** : 25 $/mois ; Bloxks Pay à 0 % de frais en bêta, A/B test de paywall intégré, paywalls modifiables à distance ; export du code sur GitHub ; aperçu web partageable. Statut : proposé.
- **Hugo · Idées et tests de conversion** : 5 idées de lancement (TikTok « je crée mon appli », communautés, parrainage, micro-influenceurs, Product Hunt) et 3 tests prêts (page d'attente, fiche App Store, paywall). Statut : proposé.
- **Malik · Chiffres de conversion** : repères du marché (installation → payant médiane 1,9 %) ; ~380 abonnés et ~20 000 installations pour 1 000 €/mois ; pub payante rentable seulement au-delà de ~10 % d'installations payantes. Statut : proposé.
- **Léa · Grille de vérification** : grille « appli vs cahier des charges » et principaux motifs de refus App Store (paywall incomplet, suppression de compte, appli trop générique). Statut : proposé.

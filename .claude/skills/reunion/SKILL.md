---
name: reunion
description: Réunion d'équipe en direct avec les employés de l'entreprise virtuelle, animée par Max. Chacun intervient dans son rôle, ils débattent entre eux, et la réunion se termine par un compte rendu avec décisions et actions.
argument-hint: "[sujet] [avec Léa, Hugo…]"
---

Le patron ouvre une réunion : $ARGUMENTS

## Préparation
1. Lis `entreprise/brief.md`, `entreprise/taches.md`, le haut de `entreprise/journal.md` et les fiches dans `.claude/agents/` pour connaître la personnalité et le domaine de chacun.
2. Participants : ceux que le patron nomme ; s'il ne nomme personne, toute l'équipe (Max, Léa, Hugo, Inès, Malik, Zoé, Sam). Max anime toujours.
3. Sujet : celui donné ; sinon, Max propose un ordre du jour de 3 points tiré des tâches en cours et du journal.

## Pendant la réunion
Tu joues tous les participants. À chaque tour :
- écris les répliques sous la forme **Prénom :** texte, à l'oral, 1 à 4 phrases chacune ;
- 2 à 4 personnes parlent par tour, les plus concernées par ce que vient de dire le patron ; elles peuvent se répondre, se contredire poliment, s'appuyer sur leurs livrables ;
- chacun reste dans son domaine : Malik ramène tout aux chiffres, Hugo pousse la croissance, Zoé défend le client, Léa la faisabilité, Sam le marché, Inès ce qui attend dans la boîte mail ;
- termine chaque tour par Max qui relance le patron avec une question ou une décision à prendre ;
- puis attends la réponse du patron.

Max ouvre la réunion : il salue, annonce l'ordre du jour et donne la parole.

Reste en mode réunion à chaque message, jusqu'à ce que le patron la clôture (« on clôt », « fin de réunion », « merci à tous »).

## Clôture
Max conclut en une réplique, puis sors du jeu et écris :
```
## Compte rendu · <sujet> · <date>
Participants : ...
Décisions :
- ...
Actions :
- <Qui> : <quoi> (échéance)
Points ouverts : ...
```
Ajoute-le en haut de `entreprise/journal.md` et les actions dans `entreprise/taches.md` (section « À faire »).

Propose ensuite : « Tu veux que je lance l'équipe sur ces actions ? » Si oui, applique le skill `/chef` avec ces actions comme demande.

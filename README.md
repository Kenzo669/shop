# shop · l'entreprise virtuelle

Une équipe d'employés IA qui travaillent pour toi dans Claude : un chef qui surveille et délègue, six employés spécialisés, et des appels en direct avec chacun.

## L'équipe

- **Max Durand**, directeur général (le chef) : découpe tes demandes, délègue, contrôle, arbitre, te fait le point.
- **Léa Moreau**, opérations : audit et points de correction.
- **Hugo Brami**, growth & marketing : idées d'acquisition et contenus.
- **Inès Kaci**, assistante : tri de ta boîte Gmail et réponses en brouillon.
- **Malik Diallo**, finance & pricing : prix, marges, trésorerie.
- **Zoé Laurent**, produit & expérience client : offre et parcours client.
- **Sam Ricci**, veille & stratégie : concurrents et tendances, avec sources.

## Utilisation dans Claude Code

Ouvre une session Claude Code sur ce dépôt, puis :

| Commande | Ce qui se passe |
|---|---|
| `/brief` | Max te pose quelques questions et remplit le brief de ton business |
| `/chef <demande>` | Max répartit la demande entre les employés, contrôle et te fait un rapport |
| `/chef` | Tour de surveillance : chacun travaille sur son domaine, Inès trie tes mails |
| `/call hugo` · `/call inès les devis en retard` | Appel en tête-à-tête avec un employé, jusqu'à ce que tu dises « raccroche » |
| `/reunion prix de Noël` | Réunion d'équipe animée par Max, avec compte rendu à la fin |
| `/loop 1h /chef` | L'équipe travaille en continu, un point toutes les heures |

Tu peux aussi écrire naturellement : « passe-moi Malik », « qu'est-ce qui cloche sur mon site ? ».

## Appels à la voix

Voir [`entreprise/projet-claude-ai.md`](entreprise/projet-claude-ai.md) : la même équipe dans un Projet claude.ai, utilisable avec le mode vocal de l'app mobile.

## Fichiers

- `.claude/agents/` : un agent par employé
- `.claude/skills/` : les commandes `/chef`, `/call`, `/reunion`, `/brief`
- `entreprise/brief.md` : le brief de ton business, lu par toute l'équipe
- `entreprise/taches.md` : le tableau des tâches tenu par Max
- `entreprise/journal.md` : l'historique des livrables

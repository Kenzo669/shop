# Équipia — vidéo promo : voix off, musique et bruitages

Durée : **68 s**. Formats : 9:16 (réseaux sociaux) et 16:9 (site, YouTube).
Les sous-titres sont dans `sous-titres.srt` et déjà incrustés dans les versions « sous-titres ».

---

## 1. Voix off (texte et timecodes)

| Temps | Texte |
|---|---|
| 0:00 | Voici Max. Max fait du dropshipping. |
| 0:03 | Et ça marche ! Les commandes s'enchaînent… mais il croule sous le travail : clients, pubs, compta. |
| 0:08 | Il lui faudrait une équipe. Sept salariés, c'est plus de dix mille euros par mois. Pas le budget. |
| 0:12,5 | Et même avec le budget : recruter, former, gérer… Et le soir, tout s'arrête. |
| 0:15,5 | Et si son équipe tenait… dans son ordinateur ? |
| 0:19 | Voici Équipia. Sept agents IA : une équipe complète, dans un bureau virtuel. |
| 0:22 | Nora coordonne. Léa gère les clients. Marc, la compta. Sami, les fournisseurs. Chloé, les pubs. Hugo, les fiches produits. Inès, le planning. |
| 0:30 | Max écrit une seule phrase. Nora répartit le travail… et Max suit tout, en direct. |
| 0:39 | Rien ne part sans son accord : il relit, il valide. |
| 0:43,5 | Le logiciel calcule sa vraie marge, son coût de pub maximal, le ROAS à viser. Max voit enfin ce qu'il gagne vraiment. |
| 0:50,5 | Besoin d'idées ? Son coach IA cherche les produits gagnants… et vérifie qu'ils sont rentables avant de lancer la pub. |
| 0:57 | TVA, factures, planning, outils connectés : tout est au même endroit. |
| 1:01 | Une équipe complète, jour et nuit, pour le prix d'un abonnement. |
| 1:04 | Équipia. Votre équipe IA, au travail. |

**Réglages conseillés (ElevenLabs ou équivalent)**
- Voix chaleureuse et dynamique, ton « on raconte une histoire » et pas « pub télé ».
- Stabilité ~45 %, similarité ~75 %, style ~20 %, vitesse 1.0 à 1.05.
- Exporte **une phrase par fichier**, nommé par son timecode (`00-00.mp3`, `00-03.mp3`…), pour un calage exact.
- Prononciation : « ROAS » se dit « rohasse », « Équipia » se dit « é-ki-pi-a », « 10 000 € » se dit « dix mille euros ».

> Suno sait faire des voix « parlées » (*spoken word*), mais le résultat reste chantant et difficile à caler au mot près. Pour la voix off, un outil de synthèse vocale donne un rendu bien plus propre. Garde Suno pour la musique.

---

## 2. Musique — Suno

**Mode :** *Custom*. Active **Instrumental**. Utilise le modèle le plus récent proposé (v4.5 ou plus).

**Title**
```
Équipia - Team Up
```

**Style of Music** (à copier tel quel)
```
upbeat modern tech commercial, playful quirky intro, pizzicato and marimba, soft claps, warm synth bass, tension break with ticking clock and low pulse, rising riser, big bright drop with punchy drums, uplifting future pop groove, sparkling synth plucks, airy pads, optimistic, energetic, clean mix, 120 BPM, C major, instrumental, no vocals
```

**Exclude Styles** (options avancées)
```
vocals, singing, choir, lo-fi, heavy metal, sad, dark ambient, distorted guitar
```

**Lyrics** (avec le mode Instrumental, ce champ sert de plan de structure)
```
[Intro - playful, light pizzicato, marimba, finger snaps]
[Build - notification blips, more percussion, slightly hectic]
[Break - sudden stop, low tense pulse, ticking clock]
[Breakdown - night mood, soft pad, heartbeat kick]
[Riser - whoosh build up, snare roll]
[Drop - bright, punchy, euphoric synths]
[Verse - steady groove, confident, plucks]
[Chorus - full energy, claps, uplifting lead]
[Outro - big final hit, short shimmering tail]
[End]
```

**Options avancées**
- Weirdness : **30 %** (reste propre et « pub »).
- Style Influence : **70 %** (suit bien le prompt).
- Durée : Suno génère souvent 2 à 3 min. Ce n'est pas grave, on coupe au montage (voir le calage).

**Calage musique / image** (120 BPM, une mesure = 2 s)

| Temps vidéo | Ce qui se passe à l'image | Partie musicale |
|---|---|---|
| 0–8 s | Max dans la rue, les notifications s'empilent | Intro légère, de plus en plus chargée |
| 8–15,5 s | Les salariés, « PAS LE BUDGET », la nuit | Break tendu, puis ambiance nuit |
| 15,5–19,2 s | Le banc, plongée dans l'écran | Riser |
| **19,2 s** | **Flash blanc + logo Équipia** | **Drop**, à caler pile sur le flash |
| 22–57 s | Démo du logiciel | Groove principal |
| 57–64 s | Montage rapide et comparatif | Refrain, énergie max |
| 64–68 s | Photo d'équipe et logo | Coup final et petite queue |

Astuce : dans ton logiciel de montage, place le **drop de la musique sur 0:19,2** et coupe ou fais un fondu sur ce qui dépasse. Pendant la voix off, baisse la musique d'environ −14 dB, puis remonte-la à −8 dB sur le logo et la fin.

---

## 3. Bruitages (optionnel)

Si ta version de Suno propose la génération de sons, utilise ces prompts. Sinon, ElevenLabs « Sound Effects » ou une banque gratuite font très bien l'affaire. Chaque prompt est à générer séparément, durée 1 à 2 s.

| Temps | Prompt du son |
|---|---|
| 0:03 → 0:07 (×12) | `short soft smartphone notification ping, clean UI sound` |
| 0:04 → 0:07 | `subtle ticking counter, fast digital count up` |
| 0:09,7 | `cash register counting, money counter whirr, short` |
| 0:11,4 | `heavy rubber stamp slam on paper, punchy` |
| 0:14,2 | `night ambience, crickets, soft, 1 second` |
| 0:17 | `laptop lid opening, soft click` |
| 0:18,6 | `whoosh riser into bright sparkle, cinematic transition` |
| 0:19,2 | `magical shimmer logo reveal, bright chime` |
| 0:22 → 0:30 (×7) | `soft UI pop, bubbly, friendly` |
| 0:30,2 → 0:31,6 | `quiet keyboard typing, laptop` |
| 0:31,7 / 0:42 | `soft mouse click` |
| 0:42,2 | `success notification chime, positive` |
| 0:45,6 | `error buzz, soft, not harsh` |
| 0:57 → 1:00 (×4) | `fast swipe whoosh transition` |
| 1:02,5 | `marker strike through, quick scribble` |
| 1:04 | `final bright impact with sparkle tail` |

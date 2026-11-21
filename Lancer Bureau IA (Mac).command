#!/bin/bash
cd "$(dirname "$0")"
echo ""
echo " ==== Bureau IA ===="
echo ""
if ! command -v node >/dev/null 2>&1; then
  echo " Node.js n'est pas installé sur ce Mac."
  echo " La page de téléchargement va s'ouvrir : installez la version « LTS »,"
  echo " puis double-cliquez à nouveau sur ce fichier."
  open "https://nodejs.org/fr"
  read -r -p " Appuyez sur Entrée pour fermer."
  exit 1
fi
[ -f .env.local ] || cp .env.example .env.local
if [ ! -d node_modules ]; then
  echo " Première installation : 1 à 3 minutes, merci de patienter..."
  if ! npm install; then
    echo ""
    echo " L'installation a échoué. Faites une capture de cette fenêtre et envoyez-la."
    read -r -p " Appuyez sur Entrée pour fermer."
    exit 1
  fi
fi
echo " Démarrage... le navigateur va s'ouvrir tout seul."
echo " Pour arrêter Bureau IA : fermez cette fenêtre."
(sleep 12; open "http://localhost:3000") &
npm run dev

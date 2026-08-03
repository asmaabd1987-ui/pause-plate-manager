#!/bin/zsh
set -e

cd "$(dirname "$0")"

if [ ! -d "/Applications/Xcode.app" ]; then
  echo "❌ Xcode n'est pas installé. Installez Xcode depuis l'App Store du Mac."
  read -r "?Appuyez sur Entrée pour fermer…"
  exit 1
fi

npm ci
npx cap sync ios

echo "Ouverture du projet iPhone dans Xcode…"
npx cap open ios

echo ""
echo "Dans Xcode :"
echo "1. Branchez l'iPhone au Mac."
echo "2. Sélectionnez App > Signing & Capabilities."
echo "3. Choisissez votre Apple Account dans Team."
echo "4. Sélectionnez votre iPhone en haut puis cliquez sur ▶ Run."
echo ""

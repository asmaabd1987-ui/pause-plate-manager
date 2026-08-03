#!/bin/zsh
set -e

cd "$(dirname "$0")"

if [ ! -d "/Applications/Android Studio.app" ]; then
  echo "❌ Android Studio n'est pas installé."
  read -r "?Appuyez sur Entrée pour fermer…"
  exit 1
fi

npm ci
npx cap sync android
npx cap open android

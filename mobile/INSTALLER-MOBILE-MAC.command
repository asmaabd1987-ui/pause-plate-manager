#!/bin/zsh
set -e

cd "$(dirname "$0")"

echo ""
echo "=============================================="
echo " Pause & Plate Manager - Mobile iOS / Android"
echo "=============================================="
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js n'est pas installé. Exécutez : brew install node"
  read -r "?Appuyez sur Entrée pour fermer…"
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "❌ Node.js 22 ou plus récent est requis. Version actuelle : $(node --version)"
  echo "Exécutez : brew upgrade node"
  read -r "?Appuyez sur Entrée pour fermer…"
  exit 1
fi

echo "Node.js : $(node --version)"
echo "Installation des dépendances Mobile…"
npm ci

echo "Synchronisation des projets natifs…"
npx cap sync

echo ""
echo "✅ Application Mobile préparée avec succès."
echo ""
echo "Samsung : double-cliquez BUILD-APK-SAMSUNG.command"
echo "iPhone  : double-cliquez OUVRIR-IPHONE-XCODE.command"
echo ""
read -r "?Appuyez sur Entrée pour fermer…"

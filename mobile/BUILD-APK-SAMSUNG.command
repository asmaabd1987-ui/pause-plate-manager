#!/bin/zsh
set -e

cd "$(dirname "$0")"

if [ ! -d "/Applications/Android Studio.app" ]; then
  echo "❌ Android Studio n'est pas installé."
  echo "Installez-le puis ouvrez-le une première fois pour télécharger Android SDK."
  read -r "?Appuyez sur Entrée pour fermer…"
  exit 1
fi

if [ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]; then
  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
fi

ANDROID_SDK_DIR="$HOME/Library/Android/sdk"
if [ ! -d "$ANDROID_SDK_DIR" ]; then
  echo "❌ Android SDK est introuvable dans $ANDROID_SDK_DIR"
  echo "Ouvrez Android Studio > Settings > Android SDK et installez le SDK."
  read -r "?Appuyez sur Entrée pour fermer…"
  exit 1
fi

echo "sdk.dir=$ANDROID_SDK_DIR" > android/local.properties

npm ci
npx cap sync android

echo "Construction de l'APK Samsung…"
(
  cd android
  ./gradlew assembleDebug
)

APK_PATH="$PWD/android/app/build/outputs/apk/debug/app-debug.apk"
if [ ! -f "$APK_PATH" ]; then
  echo "❌ L'APK n'a pas été généré."
  exit 1
fi

cp "$APK_PATH" "$PWD/Pause-Plate-Manager-Samsung.apk"
echo ""
echo "✅ APK prêt : $PWD/Pause-Plate-Manager-Samsung.apk"
open -R "$PWD/Pause-Plate-Manager-Samsung.apk"
read -r "?Appuyez sur Entrée pour fermer…"

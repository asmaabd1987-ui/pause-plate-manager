#!/bin/zsh
set -e

cd "$(dirname "$0")"

if [ ! -d "/Applications/Android Studio.app" ]; then
  echo "❌ Android Studio n'est pas installé."
  echo "Installez-le puis ouvrez-le une première fois pour télécharger Android SDK."
  read -r "?Appuyez sur Entrée pour fermer…"
  exit 1
fi

# Gradle/Android du projet exige Java 21. Android Studio peut embarquer une
# version plus récente (Java 24/25) qui provoque "Unsupported class file".
JAVA_21_HOME="$(/usr/libexec/java_home -v 21 2>/dev/null || true)"

for CANDIDATE in \
  "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" \
  "/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" \
  "/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home"
do
  if [ -x "$CANDIDATE/bin/java" ]; then
    JAVA_21_HOME="$CANDIDATE"
    break
  fi
done

if [ -z "$JAVA_21_HOME" ] || [ ! -x "$JAVA_21_HOME/bin/java" ]; then
  echo "❌ Java 21 est requis pour construire l'APK."
  echo "Installez-le avec : brew install openjdk@21"
  read -r "?Appuyez sur Entrée pour fermer…"
  exit 1
fi

export JAVA_HOME="$JAVA_21_HOME"
export PATH="$JAVA_HOME/bin:$PATH"
echo "Java utilisé : $(java -version 2>&1 | head -n 1)"

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

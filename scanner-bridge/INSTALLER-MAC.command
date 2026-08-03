#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="$HOME/Library/Application Support/PausePlateScanner"
LAUNCH_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$LAUNCH_DIR/com.pauseplate.scannerbridge.plist"
LOG_DIR="$HOME/Library/Logs"

echo ""
echo "=============================================="
echo " Pause & Plate Scanner Bridge — Installation Mac"
echo "=============================================="
echo ""

PYTHON_BIN="$(command -v python3 || true)"
if [ -z "$PYTHON_BIN" ] && command -v brew >/dev/null 2>&1; then
    echo "Installation de Python 3…"
    brew install python
    PYTHON_BIN="$(command -v python3 || true)"
fi

if [ -z "$PYTHON_BIN" ]; then
    echo "ERREUR: Python 3 est introuvable."
    echo "Installez Python 3 ou Homebrew, puis relancez ce fichier."
    echo "https://www.python.org/downloads/macos/"
    read -r -p "Appuyez sur Entrée pour fermer…"
    exit 1
fi

if ! command -v scanimage >/dev/null 2>&1 && [ ! -x /opt/homebrew/bin/scanimage ] && [ ! -x /usr/local/bin/scanimage ]; then
    if command -v brew >/dev/null 2>&1; then
        echo "Installation du pilote universel SANE…"
        brew install sane-backends
    else
        echo "ERREUR: SANE/scanimage est nécessaire pour scanner sur Mac."
        echo "Installez d'abord Homebrew depuis https://brew.sh"
        echo "Puis exécutez: brew install sane-backends"
        read -r -p "Appuyez sur Entrée pour fermer…"
        exit 1
    fi
fi

mkdir -p "$INSTALL_DIR" "$LAUNCH_DIR" "$LOG_DIR"
cp "$SCRIPT_DIR/pause_plate_scanner_bridge.py" "$INSTALL_DIR/pause_plate_scanner_bridge.py"
chmod 755 "$INSTALL_DIR/pause_plate_scanner_bridge.py"

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.pauseplate.scannerbridge</string>
    <key>ProgramArguments</key>
    <array>
        <string>$PYTHON_BIN</string>
        <string>$INSTALL_DIR/pause_plate_scanner_bridge.py</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>ProcessType</key>
    <string>Background</string>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/PausePlateScanner.out.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/PausePlateScanner.error.log</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)" "$PLIST_PATH" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_PATH"
launchctl kickstart -k "gui/$(id -u)/com.pauseplate.scannerbridge"

sleep 2
echo ""
if curl -fsS "http://127.0.0.1:17891/health" >/dev/null 2>&1; then
    echo "✅ Scanner Bridge installé et lancé avec succès."
    echo "Rechargez Pause & Plate Manager puis cliquez sur Scan en temps réel."
else
    echo "⚠️ Le Bridge est installé, mais le test n'a pas répondu."
    echo "Consultez: $LOG_DIR/PausePlateScanner.error.log"
fi
echo ""
read -r -p "Appuyez sur Entrée pour fermer…"

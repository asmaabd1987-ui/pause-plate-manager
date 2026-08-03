PAUSE & PLATE — SCAN EN TEMPS RÉEL WINDOWS + MAC
================================================

Le site web ne peut pas piloter directement un scanner USB. Le Scanner Bridge
reste uniquement sur votre ordinateur (127.0.0.1) et transmet l'image scannée
à Pause & Plate Manager pour lancer l'OCR.

WINDOWS
-------
1. Connectez et allumez le scanner.
2. Installez le pilote officiel du fabricant avec prise en charge WIA.
3. Double-cliquez sur INSTALLER-WINDOWS.bat.
4. Rechargez Pause & Plate Manager.
5. Ouvrez Scanner une facture ou Scan ventes journalières.

Le Bridge se lancera automatiquement à chaque ouverture de session Windows.

MAC
---
1. Connectez et allumez le scanner.
2. Vérifiez d'abord que le scanner fonctionne dans Transfert d'images.
3. Clic droit sur INSTALLER-MAC.command, puis Ouvrir.
4. L'installateur ajoute SANE/scanimage avec Homebrew si nécessaire.
5. Rechargez Pause & Plate Manager.

Le Bridge se lancera automatiquement à chaque ouverture de session macOS.

TEST RAPIDE
-----------
Ouvrez cette adresse dans Safari, Chrome ou Edge:
http://127.0.0.1:17891/health

Vous devez voir "ready": true et le nom du scanner dans "scanners".
Si vous voyez "ready": false, le Bridge fonctionne mais SANE ne reconnaît
pas encore le scanner physique.

SI AUCUN SCANNER N'EST DÉTECTÉ
------------------------------
- Vérifiez le câble USB / réseau et l'alimentation.
- Fermez les autres logiciels qui utilisent le scanner.
- Windows: installez ou mettez à jour le pilote WIA du fabricant.
- Mac: vérifiez que scanimage -L affiche le scanner.
- Rechargez ensuite la page Pause & Plate Manager.

SÉCURITÉ
--------
Le Bridge écoute uniquement sur 127.0.0.1. Il n'est pas accessible depuis un
autre ordinateur du réseau et accepte uniquement Pause & Plate GitHub Pages et
les pages locales de test.

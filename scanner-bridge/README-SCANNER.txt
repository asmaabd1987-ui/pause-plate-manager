PAUSE & PLATE — SCAN EN TEMPS RÉEL WINDOWS + MAC
================================================

Le site web ne peut pas piloter directement un scanner USB. Le Scanner Bridge
reste uniquement sur votre ordinateur (127.0.0.1) et transmet l'image scannée
à Pause & Plate Manager pour lancer l'OCR.

WINDOWS
-------
1. Connectez et allumez le scanner.
2. Installez le pilote scanner officiel du fabricant (WIA ou TWAIN). Le pilote
   d'impression seul ne permet pas de numériser.
3. Double-cliquez sur INSTALLER-WINDOWS.bat.
4. Rechargez Pause & Plate Manager.
5. Ouvrez Scanner une facture ou Scan ventes journalières.

Si le pilote refuse le transfert direct, une fenêtre WIA Windows s'ouvre:
choisissez le Canon, confirmez les réglages puis lancez la numérisation.

La version 2.0.4 remet automatiquement la zone WIA à zéro et numérise la
surface A4 complète afin d'éviter qu'un ancien cadrage ne coupe le bas de la
facture.

SCANNERS RÉSEAU — VERSION 2.2.0
-------------------------------
- Windows: les scanners WIA, Network TWAIN et AirScan/eSCL sont réunis dans la
  même liste. L'installateur ajoute automatiquement le moteur NAPS2.
- Mac: les scanners SANE, Apple Image Capture et AirScan/eSCL sont réunis dans
  la même liste.
- L'ordinateur et le scanner doivent être sur le même réseau Wi-Fi/LAN.
- Activez « AirScan/eSCL », « WSD Scan » ou « Scan depuis un ordinateur » dans
  les paramètres réseau du scanner si le fabricant désactive cette option.
- Un réseau invité ou l'isolation Wi-Fi peut bloquer la découverte mDNS.

Dans Pause & Plate Manager, cliquez sur « Choisir le scanner »: les appareils
réseau sont marqués avec l'icône réseau et peuvent être utilisés directement.

Les anciens multifonctions réseau, par exemple KONICA MINOLTA bizhub 225i,
utilisent Network TWAIN. Installez leur pilote TWAIN officiel sur chaque PC;
le simple pilote imprimante (port IP) ne suffit pas. Une fois le pilote TWAIN
installé, le Bridge le détecte automatiquement sur le réseau courant.

Depuis la version 2.2.3, les anciens pilotes TWAIN qui refusent DAT_CAPS sont
ouverts avec leur interface fabricant et l'ancien DSM. Le profil temporaire est
ajouté aux profils NAPS2 réels pendant le scan, puis les profils personnels sont
restaurés exactement comme avant. Choisissez le scanner ou les paramètres dans
cette fenêtre, puis lancez le scan; l'image revient automatiquement dans Pause
& Plate pour l'OCR.

La découverte fonctionne dans n'importe quel établissement, mais uniquement
pour les scanners accessibles sur le réseau local actuel. Les scanners situés
sur un autre réseau nécessitent un VPN ou un service de partage sécurisé.

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
- Windows: installez ou mettez à jour le pilote scanner WIA/TWAIN du fabricant.
- Mac: vérifiez que scanimage -L affiche le scanner.
- Rechargez ensuite la page Pause & Plate Manager.

SÉCURITÉ
--------
Le Bridge écoute uniquement sur 127.0.0.1. Il n'est pas accessible depuis un
autre ordinateur du réseau et accepte uniquement Pause & Plate GitHub Pages et
les pages locales de test.

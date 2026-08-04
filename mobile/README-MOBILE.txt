PAUSE & PLATE MANAGER — APPLICATION PRIVÉE iPHONE + SAMSUNG
================================================================

Cette application ouvre la version Firebase officielle :
https://asmaabd1987-ui.github.io/pause-plate-manager/

Les modifications Web publiées par GitHub sont visibles automatiquement dans
l'application. Une modification native (comme le module d'impression) exige
une nouvelle construction de l'APK ou du projet iPhone.

PRÉPARATION SUR LE MAC
----------------------
1. Node.js 22 ou supérieur.
2. Xcode 26 ou supérieur pour l'iPhone.
3. Android Studio 2025.2.1 ou supérieur avec Android SDK pour Samsung.
4. Double-cliquer INSTALLER-MOBILE-MAC.command.

SAMSUNG
-------
Double-cliquer BUILD-APK-SAMSUNG.command.
Le fichier Pause-Plate-Manager-Samsung.apk sera créé dans ce dossier.
Transférez-le au Samsung, ouvrez-le et autorisez ponctuellement l'installation
depuis cette source si Android le demande.

iPHONE — USAGE PRIVÉ
---------------------
Double-cliquer OUVRIR-IPHONE-XCODE.command.
Dans Xcode, connectez votre Apple Account, choisissez votre iPhone comme appareil
et cliquez sur Run. Avec le Personal Team gratuit, Apple impose de réinstaller
l'application après l'expiration du profil de développement (généralement 7 jours).

SÉCURITÉ
--------
- Connexion HTTPS obligatoire.
- Firebase Auth et les règles Firestore déjà déployées restent actives.
- Aucun mot de passe Firebase n'est stocké dans ce projet Mobile.
- Le Scanner Bridge temps réel reste réservé à Windows/Mac.
- Sur téléphone, utilisez l'import d'image ou de PDF pour les factures.
- L'impression utilise le dialogue natif Android PrintManager / iPhone AirPrint.

Identifiant natif : ma.pauseplate.manager
Technologie : Capacitor 8.5.0

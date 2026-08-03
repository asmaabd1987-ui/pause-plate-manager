/* Pause & Plate Manager — installation PWA and update lifecycle */
(function () {
  'use strict';

  const PP_SW_URL = './service-worker.js';
  let deferredInstallPrompt = null;
  let refreshing = false;

  function isNativeMobileApp() {
    try {
      return window.Capacitor?.isNativePlatform?.() === true;
    } catch (_) {
      return false;
    }
  }

  function enableNativeMobileMode() {
    document.documentElement.classList.add('pp-native-mobile');

    if (!document.getElementById('ppNativeMobileStyles')) {
      const style = document.createElement('style');
      style.id = 'ppNativeMobileStyles';
      style.textContent = `
        .pp-native-mobile #ppPwaInstallButton,
        .pp-native-mobile button[onclick*="ppScanInvoiceFromPC"],
        .pp-native-mobile button[onclick*="ppSelectScannerPP"],
        .pp-native-mobile button[onclick*="ppScanDailySalesFromPC"]{display:none!important}
        .pp-native-mobile #ppInvoiceScannerStatus{display:none!important}
        .pp-native-mobile body{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}
      `;
      document.head.appendChild(style);
    }

    const adaptMobileUI = () => {
      const title = document.querySelector('#scanModal .scan-area h3');
      if (title && title.textContent.trim() !== 'Photographier ou importer votre facture') {
        title.textContent = 'Photographier ou importer votre facture';
      }
      const input = document.getElementById('invoiceFile');
      if (input) input.setAttribute('accept', 'image/*,application/pdf,.pdf');
    };

    adaptMobileUI();
    if (document.body) {
      const observer = new MutationObserver(adaptMobileUI);
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (isNativeMobileApp()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', enableNativeMobileMode, { once: true });
    } else {
      enableNativeMobileMode();
    }
    return;
  }

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  function isSafari() {
    return /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(navigator.userAgent);
  }

  function injectStyles() {
    if (document.getElementById('ppPwaStyles')) return;
    const style = document.createElement('style');
    style.id = 'ppPwaStyles';
    style.textContent = `
      #ppPwaInstallButton{border:0;border-radius:10px;padding:10px 14px;background:#094B2D;color:#fff;font-weight:750;cursor:pointer;white-space:nowrap;box-shadow:0 4px 12px #094b2d22}
      #ppPwaInstallButton:hover{background:#073d25}
      #ppPwaToast{position:fixed;right:18px;bottom:18px;z-index:100000;display:flex;align-items:center;gap:12px;max-width:min(440px,calc(100vw - 36px));padding:13px 15px;background:#18251b;color:#fff;border:1px solid #ffffff24;border-radius:14px;box-shadow:0 14px 35px #0004;font-size:14px;line-height:1.4;transform:translateY(20px);opacity:0;pointer-events:none;transition:.22s ease}
      #ppPwaToast.pp-show{transform:translateY(0);opacity:1;pointer-events:auto}
      #ppPwaToast button{border:0;border-radius:8px;padding:8px 11px;background:#D9A51E;color:#18251b;font-weight:800;cursor:pointer}
      #ppPwaToast.pp-offline{background:#7a3f00}
      @media(max-width:700px){#ppPwaInstallButton{padding:8px 10px;font-size:12px}#ppPwaToast{right:10px;bottom:10px;max-width:calc(100vw - 20px)}}
      @media print{#ppPwaInstallButton,#ppPwaToast{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function toast(message, options = {}) {
    injectStyles();
    let node = document.getElementById('ppPwaToast');
    if (!node) {
      node = document.createElement('div');
      node.id = 'ppPwaToast';
      node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      document.body.appendChild(node);
    }

    node.className = options.offline ? 'pp-offline' : '';
    node.replaceChildren();
    const label = document.createElement('span');
    label.textContent = message;
    node.appendChild(label);

    if (options.actionLabel && typeof options.onAction === 'function') {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = options.actionLabel;
      button.addEventListener('click', options.onAction, { once: true });
      node.appendChild(button);
    }

    requestAnimationFrame(() => node.classList.add('pp-show'));
    if (options.duration !== 0) {
      window.setTimeout(() => node.classList.remove('pp-show'), options.duration || 4500);
    }
  }

  function installHelp() {
    if (isIOS()) {
      alert('Sur iPhone/iPad : ouvrez le menu Partager de Safari puis choisissez « Sur l’écran d’accueil ».');
      return;
    }
    if (isSafari()) {
      alert('Sur Mac : dans Safari, ouvrez Fichier puis choisissez « Ajouter au Dock ».');
      return;
    }
    alert('Ouvrez le menu du navigateur puis choisissez « Installer Pause & Plate » ou « Installer l’application ».');
  }

  async function installApp() {
    if (!deferredInstallPrompt) {
      installHelp();
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    updateInstallButton();
  }

  function findHeaderActions() {
    return document.querySelector('.header .profile, .top-bar-right, .header-actions, .user-section, header .actions, .topbar') ||
      document.querySelector('header') ||
      document.querySelector('.main-header');
  }

  function updateInstallButton() {
    let button = document.getElementById('ppPwaInstallButton');
    if (isStandalone()) {
      button?.remove();
      return;
    }

    const target = findHeaderActions();
    if (!target || button) return;
    button = document.createElement('button');
    button.id = 'ppPwaInstallButton';
    button.type = 'button';
    button.textContent = '⬇️ Installer';
    button.title = 'Installer Pause & Plate Manager sur cet appareil';
    button.addEventListener('click', installApp);
    target.prepend(button);
  }

  function offerUpdate(registration) {
    if (!registration?.waiting) return;
    toast('Une nouvelle version de Pause & Plate est disponible.', {
      actionLabel: 'Mettre à jour',
      duration: 0,
      onAction: () => registration.waiting.postMessage({ type: 'PP_SKIP_WAITING' })
    });
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
    try {
      const registration = await navigator.serviceWorker.register(PP_SW_URL, { scope: './' });
      offerUpdate(registration);

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            offerUpdate(registration);
          }
        });
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update();
      });
      window.setInterval(() => registration.update(), 60 * 60 * 1000);
    } catch (error) {
      console.warn('PWA non disponible :', error);
    }
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateInstallButton();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    document.getElementById('ppPwaInstallButton')?.remove();
    toast('Pause & Plate Manager est installé avec succès.');
  });

  window.addEventListener('online', () => toast('Connexion rétablie — synchronisation disponible.'));
  window.addEventListener('offline', () => toast('Mode hors connexion — les données restent disponibles localement.', { offline: true, duration: 0 }));

  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  document.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    updateInstallButton();
    window.setTimeout(updateInstallButton, 800);
    if (!navigator.onLine) {
      toast('Mode hors connexion — les données restent disponibles localement.', { offline: true, duration: 0 });
    }
    registerServiceWorker();
  });
})();

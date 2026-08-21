(function initializeTentenPwaInstall(global) {
    'use strict';

    const IOS_CONFIRMED_KEY = 'tenten.pwaInstallConfirmed';
    let deferredInstallPrompt = null;
    let controls = null;

    function translate(key) {
        return typeof global.tentenT === 'function' ? global.tentenT(key) : key;
    }

    function isStandalone() {
        const displayModeStandalone = typeof global.matchMedia === 'function'
            && global.matchMedia('(display-mode: standalone)').matches;
        return displayModeStandalone || global.navigator.standalone === true;
    }

    function isIOS() {
        const userAgent = global.navigator.userAgent || '';
        const classicIOS = /iphone|ipad|ipod/i.test(userAgent);
        const desktopIPad = /macintosh/i.test(userAgent) && global.navigator.maxTouchPoints > 1;
        return classicIOS || desktopIPad;
    }

    function isMobileDevice() {
        return /android|iphone|ipad|ipod|mobile/i.test(global.navigator.userAgent || '')
            || global.navigator.maxTouchPoints > 1 && Math.min(global.screen.width, global.screen.height) < 900;
    }

    function hasConfirmedIOSInstall() {
        try {
            return global.localStorage.getItem(IOS_CONFIRMED_KEY) === 'yes';
        } catch (_error) {
            return false;
        }
    }

    function markIOSInstallConfirmed() {
        try {
            global.localStorage.setItem(IOS_CONFIRMED_KEY, 'yes');
        } catch (_error) {
            // 사생활 보호 모드처럼 저장이 막힌 환경에서도 현재 화면에서는 숨깁니다.
        }
    }

    function closeDialog(dialog) {
        if (!dialog) return;
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
    }

    function openDialog(dialog) {
        if (!dialog) return;
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
    }

    function collectControls() {
        const buttons = Array.from(global.document.querySelectorAll('.pwa-install-button[data-pwa-step]'));
        if (!buttons.length) return null;
        return {
            buttons,
            helpDialog: global.document.getElementById('pwa-install-help-dialog'),
            installedButton: global.document.getElementById('pwa-install-complete-btn'),
            desktopDialog: global.document.getElementById('pwa-desktop-install-dialog'),
            desktopContinue: global.document.getElementById('pwa-desktop-install-continue-btn')
        };
    }

    function refreshButton() {
        if (!controls) controls = collectControls();
        if (!controls) return;

        const ios = isIOS();
        const unavailable = isStandalone() || (ios && hasConfirmedIOSInstall()) || (!ios && !deferredInstallPrompt);
        const activeStep = global.selectionStep || 'stage';
        const labelKey = ios ? 'pwaCreateIconShort' : 'pwaInstallShort';
        const label = translate(labelKey);
        controls.buttons.forEach((button) => {
            const labelElement = button.querySelector('.pwa-install-label');
            if (labelElement) labelElement.textContent = label;
            button.setAttribute('aria-label', label);
            button.title = label;
            button.hidden = unavailable || button.dataset.pwaStep !== activeStep;
        });
    }

    async function runDeferredInstallPrompt() {
        if (!deferredInstallPrompt) return;
        closeDialog(controls.desktopDialog);
        const promptEvent = deferredInstallPrompt;
        deferredInstallPrompt = null;
        try {
            const promptResult = await promptEvent.prompt();
            const choice = promptResult && promptResult.outcome
                ? promptResult
                : await promptEvent.userChoice;
            if (choice && choice.outcome === 'accepted') {
                controls.buttons.forEach((button) => { button.hidden = true; });
                return;
            }
        } catch (error) {
            console.warn('앱 설치 안내를 열지 못했습니다:', error);
        }
        refreshButton();
    }

    async function handleInstallClick() {
        if (isStandalone()) {
            refreshButton();
            return;
        }

        if (deferredInstallPrompt) {
            if (!isMobileDevice()) {
                openDialog(controls.desktopDialog);
                return;
            }
            await runDeferredInstallPrompt();
            return;
        }

        if (isIOS()) openDialog(controls.helpDialog);
    }

    function initializeControls() {
        if (controls) return;
        controls = collectControls();
        if (!controls) return;

        controls.buttons.forEach((button) => button.addEventListener('click', handleInstallClick));
        if (controls.desktopContinue) {
            controls.desktopContinue.addEventListener('click', runDeferredInstallPrompt);
        }
        if (controls.installedButton) {
            controls.installedButton.addEventListener('click', () => {
                markIOSInstallConfirmed();
                closeDialog(controls.helpDialog);
                controls.buttons.forEach((button) => { button.hidden = true; });
            });
        }
        refreshButton();
    }

    global.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
        initializeControls();
        refreshButton();
    });

    global.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        if (controls) controls.buttons.forEach((button) => { button.hidden = true; });
    });

    if (typeof global.matchMedia === 'function') {
        const displayMode = global.matchMedia('(display-mode: standalone)');
        if (typeof displayMode.addEventListener === 'function') {
            displayMode.addEventListener('change', refreshButton);
        }
    }

    if ('serviceWorker' in global.navigator && (global.isSecureContext || global.location.hostname === 'localhost' || global.location.hostname === '127.0.0.1')) {
        global.addEventListener('load', () => {
            global.navigator.serviceWorker.register('./service-worker.js', { scope: './' })
                .catch((error) => console.warn('앱 설치 준비 실패:', error));
        }, { once: true });
    }

    if (global.document.readyState === 'loading') {
        global.document.addEventListener('DOMContentLoaded', initializeControls, { once: true });
    } else {
        initializeControls();
    }

    global.TentenPwaInstall = {
        isStandalone,
        isIOS,
        refresh: refreshButton,
        setScreen(step) {
            if (step === 'stage' || step === 'section') global.selectionStep = step;
            refreshButton();
        }
    };
})(window);

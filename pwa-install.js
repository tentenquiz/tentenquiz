// =====================================================================
// TentenQuiz 설치 유도(PWA) 컨트롤러
// ---------------------------------------------------------------------
// 설계 메모
//  · 예전에는 카드 좌측 상단에 10px 짜리 알약 버튼을 붙였는데,
//    화면 모서리는 사용자가 "광고/닫기"로 학습해 걸러내는 자리라 아무도
//    누르지 않았습니다. 지금은 두 곳의 "배너"로 바꿨습니다.
//      ① 홈: 스테이지/섹션 그리드 바로 아래
//      ② 결과: 10문제 만점을 맞힌 순간(동기가 가장 높은 지점)
//  · beforeinstallprompt 가 오지 않는 브라우저(iOS 사파리, fetch 핸들러가
//    없는 서비스워커를 쓰는 크롬 등)에서도 배너는 그대로 뜨고, 대신
//    플랫폼별 수동 설치 방법을 안내합니다. 즉 설치 동선이 브라우저 사정에
//    끌려다니지 않습니다.
//  · 오프라인 캐시는 꺼져 있으므로 "오프라인에서도 사용" 류의 문구는
//    쓰지 않습니다(사실이 아닙니다).
// =====================================================================
(function initializeTentenPwaInstall(global) {
    'use strict';

    const IOS_CONFIRMED_KEY = 'tenten.pwaInstallConfirmed';
    const INSTALLED_KEY = 'tenten.pwaInstalled';
    const DISMISSED_KEY = 'tenten.pwaBannerDismissedAt';
    const DISMISS_DAYS = 7;

    let deferredInstallPrompt = null;
    let controls = null;

    function translate(key) {
        return typeof global.tentenT === 'function' ? global.tentenT(key) : '';
    }

    function readStorage(key) {
        try {
            return global.localStorage.getItem(key);
        } catch (_error) {
            return null;
        }
    }

    function writeStorage(key, value) {
        try {
            global.localStorage.setItem(key, value);
        } catch (_error) {
            // 사생활 보호 모드에서는 저장이 막히지만 현재 화면에서는 숨겨집니다.
        }
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
            || (global.navigator.maxTouchPoints > 1 && Math.min(global.screen.width, global.screen.height) < 900);
    }

    // 'ios' | 'mobile'(안드로이드 등) | 'desktop'
    function platform() {
        if (isIOS()) return 'ios';
        return isMobileDevice() ? 'mobile' : 'desktop';
    }

    function hasConfirmedIOSInstall() {
        return readStorage(IOS_CONFIRMED_KEY) === 'yes';
    }

    function hasInstalled() {
        return readStorage(INSTALLED_KEY) === 'yes';
    }

    function isDismissedRecently() {
        const raw = Number(readStorage(DISMISSED_KEY));
        if (!Number.isFinite(raw) || raw <= 0) return false;
        const elapsedDays = (Date.now() - raw) / 86400000;
        // 기기 시계를 과거로 돌려도 배너가 영원히 잠기지 않도록 음수는 무시합니다.
        return elapsedDays >= 0 && elapsedDays < DISMISS_DAYS;
    }

    function bannerCopy(slot) {
        const kind = platform();
        const desktop = kind === 'desktop';
        return {
            title: slot === 'result'
                ? translate('pwaBannerResultTitle')
                : translate(desktop ? 'pwaBannerTitleDesktop' : 'pwaBannerTitleMobile'),
            benefit: slot === 'result'
                ? translate('pwaBannerResultBenefit')
                : translate(desktop ? 'pwaBannerBenefitDesktop' : 'pwaBannerBenefitMobile'),
            cta: translate(desktop ? 'pwaBannerCtaDesktop' : kind === 'ios' ? 'pwaBannerCtaIos' : 'pwaBannerCtaAndroid'),
            ctaIcon: desktop ? '💻' : '📲',
            close: translate('pwaBannerClose')
        };
    }

    function guideCopy() {
        const kind = platform();
        if (kind === 'ios') {
            return {
                title: translate('pwaIosTitle'),
                desc: translate('pwaIosDescription'),
                step1: translate('pwaIosStepShare'),
                step2: translate('pwaIosStepAdd'),
                done: translate('pwaIosDone')
            };
        }
        if (kind === 'desktop') {
            return {
                title: translate('pwaPcTitle'),
                desc: translate('pwaBannerBenefitDesktop'),
                step1: translate('pwaPcStep1'),
                step2: translate('pwaPcStep2'),
                done: ''
            };
        }
        return {
            title: translate('pwaAndroidTitle'),
            desc: translate('pwaBannerBenefitMobile'),
            step1: translate('pwaAndroidStep1'),
            step2: translate('pwaAndroidStep2'),
            done: ''
        };
    }

    function closeDialog(dialog) {
        if (!dialog) return;
        if (typeof dialog.close === 'function' && dialog.open) dialog.close();
        else dialog.removeAttribute('open');
    }

    function openDialog(dialog) {
        if (!dialog) return;
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
    }

    function collectControls() {
        const banners = Array.from(global.document.querySelectorAll('[data-pwa-banner]'));
        if (!banners.length) return null;
        return {
            banners,
            helpDialog: global.document.getElementById('pwa-install-help-dialog'),
            guideDone: global.document.getElementById('pwa-install-complete-btn'),
            desktopDialog: global.document.getElementById('pwa-desktop-install-dialog'),
            desktopContinue: global.document.getElementById('pwa-desktop-install-continue-btn'),
            resultCard: global.document.getElementById('result-card')
        };
    }

    // 결과 배너는 "10문제 만점"일 때만 나타납니다. 매번 띄우면 잔소리가 됩니다.
    function isPerfectResultVisible() {
        if (!controls || !controls.resultCard) return false;
        if (controls.resultCard.style.display === 'none' || !controls.resultCard.offsetParent) return false;
        const score = Number((global.document.getElementById('score-text') || {}).textContent);
        const wrong = Number((global.document.getElementById('wrong-count-text') || {}).textContent);
        return Number.isFinite(score) && Number.isFinite(wrong) && score > 0 && wrong === 0;
    }

    function isEligible() {
        if (isStandalone() || hasInstalled()) return false;
        if (platform() === 'ios' && hasConfirmedIOSInstall()) return false;
        return !isDismissedRecently();
    }

    function refreshBanners() {
        if (!controls) controls = collectControls();
        if (!controls) return;

        const eligible = isEligible();
        controls.banners.forEach((banner) => {
            const slot = banner.dataset.pwaBanner;
            const visible = eligible && (slot !== 'result' || isPerfectResultVisible());
            banner.hidden = !visible;
            if (!visible) return;

            const copy = bannerCopy(slot);
            const titleElement = banner.querySelector('[data-pwa-banner-title]');
            const benefitElement = banner.querySelector('[data-pwa-banner-benefit]');
            const ctaLabel = banner.querySelector('[data-pwa-banner-cta-label]');
            const ctaIcon = banner.querySelector('[data-pwa-banner-cta-icon]');
            const closeButton = banner.querySelector('[data-pwa-banner-close]');
            if (titleElement) titleElement.textContent = copy.title;
            if (benefitElement) benefitElement.textContent = copy.benefit;
            if (ctaLabel) ctaLabel.textContent = copy.cta;
            if (ctaIcon) ctaIcon.textContent = copy.ctaIcon;
            if (closeButton) {
                closeButton.setAttribute('aria-label', copy.close);
                closeButton.title = copy.close;
            }
        });
    }

    function hideAllBanners() {
        if (!controls) return;
        controls.banners.forEach((banner) => { banner.hidden = true; });
    }

    function fillGuideDialog() {
        const copy = guideCopy();
        const dialog = controls && controls.helpDialog;
        if (!dialog) return;
        const set = (selector, value) => {
            const element = dialog.querySelector(selector);
            if (element && value) element.textContent = value;
        };
        set('[data-pwa-guide-title]', copy.title);
        set('[data-pwa-guide-desc]', copy.desc);
        set('[data-pwa-guide-step1]', copy.step1);
        set('[data-pwa-guide-step2]', copy.step2);
        set('[data-pwa-guide-done]', copy.done);
        // iOS 는 "아이콘을 만들었어요" 확인이 필요하지만, 안드로이드·PC 는
        // 다이얼로그 자체의 '닫기'만 있으면 됩니다. 그대로 두면 '닫기'가 두 개 생깁니다.
        const doneButton = dialog.querySelector('[data-pwa-guide-done]');
        if (doneButton) doneButton.hidden = platform() !== 'ios';
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
                writeStorage(INSTALLED_KEY, 'yes');
                hideAllBanners();
                return;
            }
        } catch (error) {
            console.warn('앱 설치 안내를 열지 못했습니다:', error);
        }
        refreshBanners();
    }

    async function handleInstallClick() {
        if (isStandalone()) {
            refreshBanners();
            return;
        }

        if (deferredInstallPrompt) {
            // PC 는 설치창에서 '바탕화면 바로가기 만들기'를 놓치기 쉬워 한 번 짚어 줍니다.
            if (platform() === 'desktop') {
                openDialog(controls.desktopDialog);
                return;
            }
            await runDeferredInstallPrompt();
            return;
        }

        // beforeinstallprompt 가 없는 브라우저: 플랫폼별 수동 설치 안내
        fillGuideDialog();
        openDialog(controls.helpDialog);
    }

    function handleDismiss() {
        writeStorage(DISMISSED_KEY, String(Date.now()));
        hideAllBanners();
    }

    function watchResultCard() {
        if (!controls || !controls.resultCard || typeof global.MutationObserver !== 'function') return;
        // 결과 카드는 style.display 로 열고 닫히므로 그 변화를 지켜봅니다.
        const observer = new global.MutationObserver(() => {
            global.setTimeout(refreshBanners, 60);
        });
        observer.observe(controls.resultCard, { attributes: true, attributeFilter: ['style'] });
    }

    function initializeControls() {
        if (controls) return;
        controls = collectControls();
        if (!controls) return;

        controls.banners.forEach((banner) => {
            const cta = banner.querySelector('[data-pwa-banner-cta]');
            const close = banner.querySelector('[data-pwa-banner-close]');
            if (cta) cta.addEventListener('click', handleInstallClick);
            if (close) close.addEventListener('click', handleDismiss);
        });
        if (controls.desktopContinue) {
            controls.desktopContinue.addEventListener('click', runDeferredInstallPrompt);
        }
        if (controls.guideDone) {
            controls.guideDone.addEventListener('click', () => {
                if (platform() === 'ios') {
                    writeStorage(IOS_CONFIRMED_KEY, 'yes');
                    hideAllBanners();
                }
                closeDialog(controls.helpDialog);
            });
        }
        watchResultCard();
        refreshBanners();
    }

    global.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
        initializeControls();
        refreshBanners();
    });

    global.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        writeStorage(INSTALLED_KEY, 'yes');
        hideAllBanners();
    });

    if (typeof global.matchMedia === 'function') {
        const displayMode = global.matchMedia('(display-mode: standalone)');
        if (typeof displayMode.addEventListener === 'function') {
            displayMode.addEventListener('change', refreshBanners);
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
        platform,
        refresh: refreshBanners,
        setScreen(step) {
            if (step === 'stage' || step === 'section') global.selectionStep = step;
            refreshBanners();
        }
    };
})(window);

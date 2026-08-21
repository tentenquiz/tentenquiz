(function initializeGooglePrivacySettings() {
    'use strict';

    const controls = Array.from(document.querySelectorAll('[data-google-privacy-settings]'));
    if (controls.length === 0) return;

    window.googlefc = window.googlefc || {};
    window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];

    function setControlsVisible(visible) {
        controls.forEach((control) => {
            control.hidden = !visible;
        });
    }

    function showPrivacySettings() {
        if (typeof window.googlefc.showRevocationMessage !== 'function') {
            setControlsVisible(false);
            return;
        }
        window.googlefc.showRevocationMessage();
    }

    function connectToConsentApi() {
        if (typeof window.__tcfapi !== 'function') return;

        window.__tcfapi('addEventListener', 0, (tcData, success) => {
            setControlsVisible(Boolean(success && tcData && tcData.gdprApplies === true));
        });
    }

    controls.forEach((control) => {
        control.hidden = true;
        control.addEventListener('click', showPrivacySettings);
    });

    window.googlefc.callbackQueue.push({
        CONSENT_API_READY: connectToConsentApi
    });
})();

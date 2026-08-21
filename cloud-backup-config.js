(function configureTentenCloudBackup(global) {
    'use strict';

    const runtime = global.__TENTEN_CLOUD_BACKUP_CONFIG__ || {};
    const projectFirebaseConfig = {
        // 아래 네 값을 Firebase 콘솔 > 프로젝트 설정 > 내 앱 > 웹 앱에서 복사해 넣습니다.
        apiKey: 'AIzaSyAsHCUOXYd-P0KF_dsw6EApERB-wRIFtQE',
        authDomain: 'tentenquiz-537f9.firebaseapp.com',
        projectId: 'tentenquiz-537f9',
        appId: '1:338154168566:web:4c521fa1039d0e8b244cd7'
    };
    const firebaseConfig = runtime.firebaseConfig || projectFirebaseConfig;

    global.TENTEN_CLOUD_BACKUP_CONFIG = Object.freeze({
        // Firebase Web SDK의 공개 식별값이며 서비스 계정 비밀키가 아닙니다.
        firebaseConfig: Object.freeze({
            apiKey: String(firebaseConfig.apiKey || ''),
            authDomain: String(firebaseConfig.authDomain || ''),
            projectId: String(firebaseConfig.projectId || ''),
            appId: String(firebaseConfig.appId || '')
        }),
        // Firebase App Check를 적용할 경우 reCAPTCHA 사이트 키를 입력합니다.
        appCheckSiteKey: String(runtime.appCheckSiteKey || '6LdqfZAtAAAAAD9JXzsgPixJq0Mg9EdP-c25YNkS'),
        collectionName: String(runtime.collectionName || 'tentenCloudBackups'),
        firebaseSdkVersion: String(runtime.firebaseSdkVersion || '12.17.0'),
        maxEncryptedBytes: Number(runtime.maxEncryptedBytes) > 0
            ? Number(runtime.maxEncryptedBytes)
            : Math.floor(7.5 * 1024 * 1024)
    });
})(window);

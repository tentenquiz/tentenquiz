const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { webcrypto } = require('crypto');

const projectRoot = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(projectRoot, 'cloud-backup.js'), 'utf8');
const storage = new Map();
const listeners = new Map();
const window = {
    TENTEN_CLOUD_BACKUP_CONFIG: {
        firebaseConfig: {},
        maxEncryptedBytes: 10 * 1024 * 1024
    },
    __TENTEN_FIRESTORE_TEST_ADAPTER__: {},
    crypto: webcrypto,
    localStorage: {
        getItem: (key) => storage.has(key) ? storage.get(key) : null,
        setItem: (key, value) => storage.set(key, String(value)),
        removeItem: (key) => storage.delete(key)
    },
    navigator: { onLine: true },
    location: { origin: 'https://tentenquiz.example', pathname: '/', search: '', hash: '' },
    history: { replaceState: () => {} },
    document: {
        readyState: 'loading',
        visibilityState: 'visible',
        addEventListener: (name, callback) => listeners.set(`document:${name}`, callback),
        getElementById: () => null
    },
    addEventListener: (name, callback) => listeners.set(name, callback),
    setTimeout,
    clearTimeout,
    btoa: (value) => Buffer.from(value, 'binary').toString('base64'),
    atob: (value) => Buffer.from(value, 'base64').toString('binary'),
    CompressionStream,
    DecompressionStream,
    Blob,
    Response,
    fetch: async () => { throw new Error('Network should not be used in crypto unit test'); }
};

const context = {
    window,
    console,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    Date,
    Intl,
    JSON,
    Promise,
    Error,
    Blob,
    Response,
    CompressionStream,
    DecompressionStream
};
vm.createContext(context);
vm.runInContext(source, context);

(async () => {
    const cloud = window.TentenCloudBackup;
    if (!cloud || !cloud.isConfigured()) throw new Error('cloud-backup API was not initialized');

    const recoveryCode = await cloud.createRecoveryCode();
    if (!/^(?:[0-9A-HJKMNP-TV-Z]{4}-){6}[0-9A-HJKMNP-TV-Z]{4}$/.test(recoveryCode)) {
        throw new Error(`unexpected recovery-code format: ${recoveryCode}`);
    }
    const parsed = await cloud.parseRecoveryCode(recoveryCode.toLowerCase().replaceAll('-', ' '));
    if (parsed.formatted !== recoveryCode) throw new Error('recovery-code normalization failed');

    const firstCredentials = await cloud.deriveCredentials(recoveryCode);
    const secondCredentials = await cloud.deriveCredentials(recoveryCode);
    if (firstCredentials.backupId !== secondCredentials.backupId || firstCredentials.writeToken !== secondCredentials.writeToken) {
        throw new Error('credential derivation is not deterministic');
    }
    if (firstCredentials.backupId === firstCredentials.writeToken) {
        throw new Error('lookup id and write token must be separated');
    }

    const payload = {
        format: 'tentenquiz-learning-records',
        version: 1,
        exportedAt: '2026-08-19T12:00:00.000Z',
        recordCount: 1,
        preferences: { interfaceLanguage: 'ko', learningLanguage: 'vi', chineseReading: 'pinyin' },
        databases: []
    };
    const encrypted = await cloud.encryptPayload(payload, recoveryCode);
    if (encrypted.body.includes('interfaceLanguage') || encrypted.body.includes('tentenquiz-learning-records')) {
        throw new Error('plaintext learning data leaked into the server envelope');
    }
    const decrypted = await cloud.decryptPayload(encrypted.body, recoveryCode);
    if (JSON.stringify(decrypted.payload) !== JSON.stringify(payload)) {
        throw new Error('encrypted cloud backup did not round-trip');
    }

    const otherCode = await cloud.createRecoveryCode();
    let wrongCodeRejected = false;
    try {
        await cloud.decryptPayload(encrypted.body, otherCode);
    } catch (_error) {
        wrongCodeRejected = true;
    }
    if (!wrongCodeRejected) throw new Error('a different recovery code decrypted the backup');

    const cleaned = recoveryCode.replaceAll('-', '');
    const altered = `${cleaned.slice(0, -1)}${cleaned.endsWith('0') ? '1' : '0'}`;
    let checksumRejected = false;
    try {
        await cloud.parseRecoveryCode(altered);
    } catch (_error) {
        checksumRejected = true;
    }
    if (!checksumRejected) throw new Error('recovery-code checksum did not reject a typo');

    console.log('OK: 128-bit recovery codes normalize and reject typing errors');
    console.log('OK: lookup, write, and encryption credentials are separated');
    console.log('OK: learning records round-trip through AES-GCM without plaintext server data');
    console.log('OK: the wrong recovery code cannot decrypt a backup');
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

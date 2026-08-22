(function initializeTentenCloudBackup(global) {
    'use strict';

    const CONFIG = global.TENTEN_CLOUD_BACKUP_CONFIG || {};
    const PROFILE_KEY = 'tenten.cloudBackupProfile.v1';
    const CLOUD_FORMAT = 'tentenquiz-encrypted-learning-records';
    const CLOUD_VERSION = 1;
    const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    const CODE_DATA_LENGTH = 26;
    const CODE_CHECKSUM_LENGTH = 2;
    const ENCRYPTION_CONTEXT = 'TentenQuiz cloud backup encryption v1';
    const BACKUP_ID_CONTEXT = 'TentenQuiz cloud backup id v1';
    const WRITE_TOKEN_CONTEXT = 'TentenQuiz cloud backup write token v1';
    const ADDITIONAL_DATA = new TextEncoder().encode('tentenquiz-cloud-backup-v1');
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const FIRESTORE_CHUNK_CHARACTERS = 600000;
    const FIRESTORE_SCHEMA = 'tentenquiz-firestore-backup';
    let milestoneSyncTimer = null;
    let milestoneEventPromise = Promise.resolve();
    let recoveryPromptTimer = null;
    let backupToastTimer = null;
    let syncPromise = null;
    let controls = null;
    let firebaseStorePromise = null;

    class CloudBackupConflictError extends Error {}

    function translate(key, values = {}) {
        return typeof global.tentenT === 'function' ? global.tentenT(key, values) : key;
    }

    function isConfigured() {
        if (global.__TENTEN_FIRESTORE_TEST_ADAPTER__) return true;
        const config = CONFIG.firebaseConfig || {};
        return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
    }

    function concatBytes(...parts) {
        const length = parts.reduce((total, part) => total + part.length, 0);
        const result = new Uint8Array(length);
        let offset = 0;
        parts.forEach((part) => {
            result.set(part, offset);
            offset += part.length;
        });
        return result;
    }

    async function sha256(...parts) {
        return new Uint8Array(await global.crypto.subtle.digest('SHA-256', concatBytes(...parts)));
    }

    function encodeBase32(bytes) {
        let bits = 0;
        let value = 0;
        let output = '';
        bytes.forEach((byte) => {
            value = (value << 8) | byte;
            bits += 8;
            while (bits >= 5) {
                output += CODE_ALPHABET[(value >>> (bits - 5)) & 31];
                bits -= 5;
            }
        });
        if (bits > 0) output += CODE_ALPHABET[(value << (5 - bits)) & 31];
        return output;
    }

    function decodeBase32(value) {
        let bits = 0;
        let buffer = 0;
        const bytes = [];
        for (const character of value) {
            const index = CODE_ALPHABET.indexOf(character);
            if (index < 0) throw new Error('Invalid recovery code character');
            buffer = (buffer << 5) | index;
            bits += 5;
            if (bits >= 8) {
                bytes.push((buffer >>> (bits - 8)) & 255);
                bits -= 8;
            }
        }
        return new Uint8Array(bytes);
    }

    function toBase64Url(bytes) {
        let binary = '';
        const chunkSize = 0x8000;
        for (let index = 0; index < bytes.length; index += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
        }
        return global.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }

    function fromBase64Url(value) {
        const padded = String(value).replace(/-/g, '+').replace(/_/g, '/')
            + '='.repeat((4 - (String(value).length % 4)) % 4);
        const binary = global.atob(padded);
        return Uint8Array.from(binary, (character) => character.charCodeAt(0));
    }

    function formatRecoveryCode(value) {
        return String(value).match(/.{1,4}/g).join('-');
    }

    function cleanRecoveryCode(value) {
        return String(value || '')
            .toUpperCase()
            .replace(/[O]/g, '0')
            .replace(/[IL]/g, '1')
            .replace(/[^0-9A-Z]/g, '');
    }

    async function checksumForSecret(secret) {
        return encodeBase32(await sha256(encoder.encode('TentenQuiz recovery checksum v1'), secret))
            .slice(0, CODE_CHECKSUM_LENGTH);
    }

    async function createRecoveryCode() {
        const secret = global.crypto.getRandomValues(new Uint8Array(16));
        const data = encodeBase32(secret);
        const checksum = await checksumForSecret(secret);
        return formatRecoveryCode(data + checksum);
    }

    async function parseRecoveryCode(value) {
        const cleaned = cleanRecoveryCode(value);
        if (cleaned.length !== CODE_DATA_LENGTH + CODE_CHECKSUM_LENGTH) {
            throw new Error('Invalid recovery code length');
        }
        const data = cleaned.slice(0, CODE_DATA_LENGTH);
        const checksum = cleaned.slice(CODE_DATA_LENGTH);
        const secret = decodeBase32(data);
        if (secret.length !== 16 || encodeBase32(secret) !== data || await checksumForSecret(secret) !== checksum) {
            throw new Error('Invalid recovery code checksum');
        }
        return { secret, formatted: formatRecoveryCode(cleaned) };
    }

    async function deriveCredentials(recoveryCode) {
        const parsed = await parseRecoveryCode(recoveryCode);
        const encryptionBytes = await sha256(encoder.encode(ENCRYPTION_CONTEXT), parsed.secret);
        const backupIdBytes = await sha256(encoder.encode(BACKUP_ID_CONTEXT), parsed.secret);
        const writeTokenBytes = await sha256(encoder.encode(WRITE_TOKEN_CONTEXT), parsed.secret);
        const encryptionKey = await global.crypto.subtle.importKey(
            'raw', encryptionBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
        );
        return {
            recoveryCode: parsed.formatted,
            encryptionKey,
            backupId: toBase64Url(backupIdBytes),
            writeToken: toBase64Url(writeTokenBytes)
        };
    }

    async function compressBytes(bytes) {
        if (typeof global.CompressionStream !== 'function') {
            return { compression: 'none', bytes };
        }
        const stream = new global.Blob([bytes]).stream().pipeThrough(new global.CompressionStream('gzip'));
        return { compression: 'gzip', bytes: new Uint8Array(await new global.Response(stream).arrayBuffer()) };
    }

    async function decompressBytes(bytes, compression) {
        if (compression === 'none') return bytes;
        if (compression !== 'gzip' || typeof global.DecompressionStream !== 'function') {
            throw new Error('Unsupported cloud backup compression');
        }
        const stream = new global.Blob([bytes]).stream().pipeThrough(new global.DecompressionStream('gzip'));
        return new Uint8Array(await new global.Response(stream).arrayBuffer());
    }

    async function encryptPayload(payload, recoveryCode) {
        const credentials = await deriveCredentials(recoveryCode);
        const packed = await compressBytes(encoder.encode(JSON.stringify(payload)));
        const iv = global.crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = new Uint8Array(await global.crypto.subtle.encrypt({
            name: 'AES-GCM',
            iv,
            additionalData: ADDITIONAL_DATA
        }, credentials.encryptionKey, packed.bytes));
        const envelope = {
            format: CLOUD_FORMAT,
            version: CLOUD_VERSION,
            encryption: 'AES-GCM',
            compression: packed.compression,
            iv: toBase64Url(iv),
            ciphertext: toBase64Url(ciphertext),
            exportedAt: payload.exportedAt,
            recordCount: payload.recordCount
        };
        return { credentials, envelope, body: JSON.stringify(envelope) };
    }

    async function decryptPayload(envelopeValue, recoveryCode) {
        const envelope = typeof envelopeValue === 'string' ? JSON.parse(envelopeValue) : envelopeValue;
        if (
            !envelope || envelope.format !== CLOUD_FORMAT || envelope.version !== CLOUD_VERSION
            || envelope.encryption !== 'AES-GCM' || !['gzip', 'none'].includes(envelope.compression)
        ) {
            throw new Error('Invalid encrypted cloud backup');
        }
        const credentials = await deriveCredentials(recoveryCode);
        const plaintext = new Uint8Array(await global.crypto.subtle.decrypt({
            name: 'AES-GCM',
            iv: fromBase64Url(envelope.iv),
            additionalData: ADDITIONAL_DATA
        }, credentials.encryptionKey, fromBase64Url(envelope.ciphertext)));
        const unpacked = await decompressBytes(plaintext, envelope.compression);
        return { credentials, payload: JSON.parse(decoder.decode(unpacked)) };
    }

    function readProfile() {
        try {
            const profile = JSON.parse(global.localStorage.getItem(PROFILE_KEY) || 'null');
            return profile && typeof profile.recoveryCode === 'string' ? profile : null;
        } catch (_error) {
            return null;
        }
    }

    function writeProfile(profile) {
        global.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        return profile;
    }

    function clearProfile() {
        global.localStorage.removeItem(PROFILE_KEY);
    }

    function storeError(code, message) {
        const error = new Error(message);
        error.code = code;
        return error;
    }

    function newRevision() {
        return toBase64Url(global.crypto.getRandomValues(new Uint8Array(16)));
    }

    function splitFirestoreBody(body) {
        const chunks = [];
        for (let offset = 0; offset < body.length; offset += FIRESTORE_CHUNK_CHARACTERS) {
            chunks.push(body.slice(offset, offset + FIRESTORE_CHUNK_CHARACTERS));
        }
        return chunks.length > 0 ? chunks : [''];
    }

    function chunkDocumentId(index) {
        return String(index).padStart(4, '0');
    }

    async function bodyFingerprint(body) {
        return toBase64Url(await sha256(encoder.encode(body)));
    }

    function createFirebaseStore(db, firestore) {
        const collectionName = String(CONFIG.collectionName || 'tentenCloudBackups');
        if (!/^[A-Za-z][A-Za-z0-9_-]{2,63}$/.test(collectionName)) {
            throw new Error('Invalid Firestore backup collection name');
        }

        const metadataRef = (backupId) => firestore.doc(db, collectionName, backupId);
        const chunkRef = (backupId, index) => firestore.doc(
            db, collectionName, backupId, 'chunks', chunkDocumentId(index)
        );

        return {
            async putBackup({ backupId, writeToken, body, expectedRevision, exportedAt, recordCount }) {
                const chunks = splitFirestoreBody(body);
                const byteLength = encoder.encode(body).byteLength;
                const fingerprint = await bodyFingerprint(body);
                const ownerVerifier = toBase64Url(await sha256(encoder.encode(writeToken)));
                const revision = newRevision();
                const reference = metadataRef(backupId);

                await firestore.runTransaction(db, async (transaction) => {
                    const currentSnapshot = await transaction.get(reference);
                    const current = currentSnapshot.exists() ? currentSnapshot.data() : null;
                    if (current) {
                        if (!expectedRevision || current.revision !== expectedRevision) {
                            throw storeError('conflict', 'A newer Firestore backup exists');
                        }
                        if (current.ownerVerifier !== ownerVerifier) {
                            throw storeError('forbidden', 'Recovery code does not own this backup');
                        }
                    } else if (expectedRevision) {
                        throw storeError('conflict', 'Firestore backup was removed');
                    }

                    chunks.forEach((data, index) => {
                        transaction.set(chunkRef(backupId, index), {
                            schema: FIRESTORE_SCHEMA,
                            version: 1,
                            revision,
                            index,
                            total: chunks.length,
                            data
                        });
                    });
                    const previousChunkCount = current && Number(current.chunkCount) || 0;
                    for (let index = chunks.length; index < previousChunkCount; index += 1) {
                        transaction.delete(chunkRef(backupId, index));
                    }
                    transaction.set(reference, {
                        schema: FIRESTORE_SCHEMA,
                        version: 1,
                        revision,
                        ownerVerifier,
                        chunkCount: chunks.length,
                        byteLength,
                        bodySha256: fingerprint,
                        exportedAt: String(exportedAt || ''),
                        recordCount: Number(recordCount) || 0,
                        createdAt: current && current.createdAt || firestore.serverTimestamp(),
                        updatedAt: firestore.serverTimestamp()
                    });
                });
                return { revision };
            },

            async getBackup({ backupId, writeToken }) {
                const snapshot = await firestore.getDoc(metadataRef(backupId));
                if (!snapshot.exists()) throw storeError('not-found', 'Firestore backup not found');
                const metadata = snapshot.data();
                const ownerVerifier = toBase64Url(await sha256(encoder.encode(writeToken)));
                if (
                    !metadata || metadata.schema !== FIRESTORE_SCHEMA || metadata.version !== 1
                    || metadata.ownerVerifier !== ownerVerifier
                    || !Number.isInteger(metadata.chunkCount) || metadata.chunkCount < 1 || metadata.chunkCount > 20
                    || !Number.isInteger(metadata.byteLength) || metadata.byteLength < 1
                    || metadata.byteLength > Number(CONFIG.maxEncryptedBytes || Math.floor(7.5 * 1024 * 1024))
                ) {
                    throw storeError('invalid', 'Invalid Firestore backup metadata');
                }
                const snapshots = await Promise.all(Array.from(
                    { length: metadata.chunkCount },
                    (_, index) => firestore.getDoc(chunkRef(backupId, index))
                ));
                const chunks = snapshots.map((chunkSnapshot, index) => {
                    if (!chunkSnapshot.exists()) throw storeError('invalid', 'Firestore backup chunk is missing');
                    const chunk = chunkSnapshot.data();
                    if (
                        !chunk || chunk.schema !== FIRESTORE_SCHEMA || chunk.version !== 1
                        || chunk.revision !== metadata.revision || chunk.index !== index
                        || chunk.total !== metadata.chunkCount || typeof chunk.data !== 'string'
                    ) {
                        throw storeError('invalid', 'Invalid Firestore backup chunk');
                    }
                    return chunk.data;
                });
                const body = chunks.join('');
                if (
                    encoder.encode(body).byteLength !== metadata.byteLength
                    || await bodyFingerprint(body) !== metadata.bodySha256
                ) {
                    throw storeError('invalid', 'Firestore backup integrity check failed');
                }
                return { body, revision: metadata.revision };
            },

            // 메타데이터 문서 1개만 읽어 현재 revision 과 소유 여부를 확인합니다.
            // 청크를 전부 받아오는 getBackup 과 달리 읽기 1회로 끝나므로
            // 충돌 자가 복구 경로에서 사용합니다.
            async headBackup({ backupId, writeToken }) {
                const snapshot = await firestore.getDoc(metadataRef(backupId));
                if (!snapshot.exists()) return { exists: false, revision: '', owned: false };
                const metadata = snapshot.data() || {};
                const ownerVerifier = toBase64Url(await sha256(encoder.encode(writeToken)));
                return {
                    exists: true,
                    revision: String(metadata.revision || ''),
                    owned: metadata.ownerVerifier === ownerVerifier
                };
            },

            async deleteBackup({ backupId, writeToken, expectedRevision }) {
                const reference = metadataRef(backupId);
                const ownerVerifier = toBase64Url(await sha256(encoder.encode(writeToken)));
                await firestore.runTransaction(db, async (transaction) => {
                    const snapshot = await transaction.get(reference);
                    if (!snapshot.exists()) return;
                    const metadata = snapshot.data();
                    if (expectedRevision && metadata.revision !== expectedRevision) {
                        throw storeError('conflict', 'A newer Firestore backup exists');
                    }
                    if (metadata.ownerVerifier !== ownerVerifier) {
                        throw storeError('forbidden', 'Recovery code does not own this backup');
                    }
                    const chunkCount = Math.min(Math.max(Number(metadata.chunkCount) || 0, 0), 20);
                    for (let index = 0; index < chunkCount; index += 1) {
                        transaction.delete(chunkRef(backupId, index));
                    }
                    transaction.delete(reference);
                });
            }
        };
    }

    async function getFirebaseStore() {
        if (global.__TENTEN_FIRESTORE_TEST_ADAPTER__) return global.__TENTEN_FIRESTORE_TEST_ADAPTER__;
        if (!isConfigured()) throw new Error('Firebase is not configured');
        if (firebaseStorePromise) return firebaseStorePromise;

        firebaseStorePromise = (async () => {
            const version = /^\d+\.\d+\.\d+$/.test(String(CONFIG.firebaseSdkVersion || ''))
                ? String(CONFIG.firebaseSdkVersion)
                : '12.17.0';
            const [firebaseApp, firestore] = await Promise.all([
                import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
                import(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore.js`)
            ]);
            const appName = 'tentenquiz-cloud-backup';
            const existingApp = firebaseApp.getApps().find((app) => app.name === appName);
            const app = existingApp || firebaseApp.initializeApp(CONFIG.firebaseConfig, appName);

            if (CONFIG.appCheckSiteKey) {
                const appCheck = await import(`https://www.gstatic.com/firebasejs/${version}/firebase-app-check.js`);
                try {
                    appCheck.initializeAppCheck(app, {
                        provider: new appCheck.ReCaptchaV3Provider(CONFIG.appCheckSiteKey),
                        isTokenAutoRefreshEnabled: true
                    });
                } catch (error) {
                    if (!String(error && error.code || '').includes('already-initialized')) throw error;
                }
            }
            return createFirebaseStore(firestore.getFirestore(app), firestore);
        })();
        return firebaseStorePromise;
    }

    // 업로드 트랜잭션이 서버에서는 커밋됐는데 응답이 도착하기 전에 네트워크가
    // 끊기면, 로컬 revision 만 옛 값으로 남아 이후 모든 동기화가 'conflict' 로
    // 막히고 삭제 버튼까지 함께 잠깁니다.
    // 원격 백업이 "같은 복구 코드 소유"임이 확인되면 실제 충돌이 아니라
    // 응답 유실이므로, 서버의 현재 revision 을 다시 읽어 한 번만 재시도합니다.
    async function resolveOwnedRemoteRevision(credentials) {
        const store = await getFirebaseStore();
        if (typeof store.headBackup !== 'function') return null;
        try {
            const head = await store.headBackup({
                backupId: credentials.backupId,
                writeToken: credentials.writeToken
            });
            if (!head.exists || !head.owned) return null;
            return head.revision || '';
        } catch (_error) {
            return null;
        }
    }

    async function uploadProfile(profile) {
        if (!isConfigured()) throw new Error('Cloud backup is not configured');
        const records = global.TentenLearningRecords;
        if (!records || typeof records.createBackupPayload !== 'function') throw new Error('Learning records are not ready');
        const payload = await records.createBackupPayload();
        const encrypted = await encryptPayload(payload, profile.recoveryCode);
        const byteLength = encoder.encode(encrypted.body).byteLength;
        if (byteLength > Number(CONFIG.maxEncryptedBytes || Math.floor(7.5 * 1024 * 1024))) {
            const tooLarge = new Error('Cloud backup is too large');
            tooLarge.code = 'too-large';
            throw tooLarge;
        }

        const put = (expectedRevision) => getFirebaseStore().then((store) => store.putBackup({
            backupId: encrypted.credentials.backupId,
            writeToken: encrypted.credentials.writeToken,
            body: encrypted.body,
            expectedRevision,
            exportedAt: payload.exportedAt,
            recordCount: payload.recordCount
        }));

        let stored;
        try {
            stored = await put(profile.revision || '');
        } catch (error) {
            if (!error || error.code !== 'conflict') throw error;

            const ownedRevision = await resolveOwnedRemoteRevision(encrypted.credentials);
            if (ownedRevision === null) {
                // 원격 백업이 없거나 다른 복구 코드 소유 → 진짜 충돌.
                throw new CloudBackupConflictError('Cloud backup conflict');
            }
            try {
                stored = await put(ownedRevision);
                console.info('클라우드 백업 revision 자가 복구 완료');
            } catch (retryError) {
                if (retryError && retryError.code === 'conflict') {
                    throw new CloudBackupConflictError('Cloud backup conflict');
                }
                throw retryError;
            }
        }
        return writeProfile({
            ...profile,
            recoveryCode: encrypted.credentials.recoveryCode,
            revision: stored.revision,
            lastSyncedAt: new Date().toISOString(),
            recordCount: payload.recordCount,
            dirty: false,
            conflict: false,
            pendingMilestones: []
        });
    }

    async function fetchCloudBackup(recoveryCode) {
        const credentials = await deriveCredentials(recoveryCode);
        const stored = await (await getFirebaseStore()).getBackup({
            backupId: credentials.backupId,
            writeToken: credentials.writeToken
        });
        const decrypted = await decryptPayload(stored.body, recoveryCode);
        return { ...decrypted, revision: stored.revision };
    }

    async function deleteCloudBackup(profile, options = {}) {
        if (!profile.revision) {
            clearProfile();
            return;
        }
        const credentials = await deriveCredentials(profile.recoveryCode);
        // 충돌 상태에서는 로컬 revision 이 이미 낡았으므로 그대로 보내면
        // 삭제까지 conflict 로 실패해 사용자가 빠져나갈 방법이 없어집니다.
        // 이때는 revision 검사를 생략합니다. ownerVerifier 검사는 그대로 유지되므로
        // 남의 백업을 지울 수는 없습니다.
        const expectedRevision = options.force ? '' : (profile.revision || '');
        await (await getFirebaseStore()).deleteBackup({
            backupId: credentials.backupId,
            writeToken: credentials.writeToken,
            expectedRevision
        });
        clearProfile();
    }

    function setStatus(key, values = {}, compactKey = key, compactValues = values) {
        if (!controls) return;
        if (controls.status) controls.status.textContent = translate(compactKey, compactValues);
        if (controls.manageStatus) controls.manageStatus.textContent = translate(key, values);
    }

    function formatDate(value) {
        if (!value) return '';
        const locale = global.document.documentElement.lang || undefined;
        return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
    }

    function updateControls() {
        if (!controls) return;
        const profile = readProfile();
        controls.showCode.hidden = false;
        if (!profile) {
            setStatus('cloudBackupMilestoneReady', {}, 'cloudBackupCompactStatus');
        } else if (profile.conflict) {
            setStatus('cloudBackupConflict');
        } else if (
            Array.isArray(profile.pendingMilestones) && profile.pendingMilestones.length > 0
            && !hasSyncedToday(profile)
        ) {
            // 오늘 이미 백업했다면 대기 중 마커가 남아 있어도 "대기 중"으로 보이지 않게 합니다.
            setStatus(global.navigator.onLine ? 'cloudBackupWaiting' : 'cloudBackupOffline');
        } else if (profile.lastSyncedAt) {
            setStatus('cloudBackupMilestoneLastSaved', { date: formatDate(profile.lastSyncedAt) }, 'cloudBackupCompactStatus');
        } else {
            setStatus('cloudBackupMilestoneReady', {}, 'cloudBackupCompactStatus');
        }
    }

    function setBusy(busy, statusKey) {
        if (!controls) return;
        controls.section.setAttribute('aria-busy', String(busy));
        [controls.manageOpen, controls.showCode, controls.restoreOpen, controls.manageClose]
            .filter(Boolean)
            .forEach((button) => { button.disabled = busy; });
        if (statusKey) setStatus(statusKey);
    }

    function openDialog(dialog) {
        if (!dialog || dialog.open || dialog.hasAttribute('open')) return;
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
    }

    function closeDialog(dialog) {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
    }

    function recoveryUrl(recoveryCode) {
        return `${global.location.origin}${global.location.pathname}#tenten-recover=${encodeURIComponent(recoveryCode)}`;
    }

    function renderRecoveryQr(recoveryCode) {
        if (!controls || !controls.qr) return;
        controls.qr.replaceChildren();
        if (typeof global.qrcode !== 'function') return;
        const qr = global.qrcode(0, 'M');
        qr.addData(recoveryUrl(recoveryCode));
        qr.make();
        controls.qr.innerHTML = qr.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
        const svg = controls.qr.querySelector('svg');
        if (svg) svg.setAttribute('aria-label', translate('cloudBackupQrLabel'));
    }

    function showRecoveryCode(recoveryCode, options = {}) {
        if (!controls || !recoveryCode) return;
        if (options.acknowledgePrompt) {
            const profile = readProfile();
            if (profile && profile.needsRecoveryPrompt) {
                writeProfile({ ...profile, needsRecoveryPrompt: false });
            }
        }
        controls.recoveryCode.textContent = recoveryCode;
        renderRecoveryQr(recoveryCode);
        openDialog(controls.recoveryDialog);
    }

    function showMilestoneBackupToast() {
        let toast = global.document.getElementById('cloud-backup-toast');
        if (!toast) {
            toast = global.document.createElement('div');
            toast.id = 'cloud-backup-toast';
            toast.className = 'cloud-backup-toast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            global.document.body.appendChild(toast);
        }
        global.clearTimeout(backupToastTimer);
        toast.textContent = translate('cloudBackupMilestoneSaved');
        toast.classList.add('is-visible');
        backupToastTimer = global.setTimeout(() => toast.classList.remove('is-visible'), 2800);
    }

    function scheduleRecoveryPrompt() {
        global.clearTimeout(recoveryPromptTimer);
        const attempt = () => {
            const profile = readProfile();
            if (!profile || !profile.needsRecoveryPrompt || !profile.lastSyncedAt) return;
            const quizCard = global.document.getElementById('quiz-card');
            const quizIsVisible = quizCard && quizCard.style.display !== 'none';
            if (quizIsVisible) {
                recoveryPromptTimer = global.setTimeout(attempt, 1200);
                return;
            }
            showRecoveryCode(profile.recoveryCode, { acknowledgePrompt: true });
        };
        recoveryPromptTimer = global.setTimeout(attempt, 700);
    }

    async function getOrCreateLocalRecoveryProfile() {
        const existing = readProfile();
        if (existing) return existing;
        const profile = writeProfile({
            recoveryCode: await createRecoveryCode(),
            revision: '',
            lastSyncedAt: '',
            recordCount: 0,
            dirty: false,
            conflict: false,
            pendingMilestones: [],
            needsRecoveryPrompt: false
        });
        await (global.navigator.storage && global.navigator.storage.persist
            ? global.navigator.storage.persist().catch(() => false)
            : false);
        updateControls();
        return profile;
    }

    async function saveLatestRecordsBeforeShowingRecoveryCode() {
        let profile = await getOrCreateLocalRecoveryProfile();
        if (profile.conflict) {
            throw new CloudBackupConflictError('A newer cloud backup must be loaded first.');
        }
        if (!global.navigator.onLine) {
            const error = new Error('The device is offline.');
            error.code = 'offline';
            throw error;
        }

        // 복구 코드는 다른 기기로 옮길 때 쓰므로, 표시 전에 현재 기록을 반드시 새로 올립니다.
        const pendingMilestones = Array.from(new Set([
            ...(Array.isArray(profile.pendingMilestones) ? profile.pendingMilestones : []),
            'recovery-code-view'
        ])).slice(-100);
        profile = writeProfile({ ...profile, dirty: true, pendingMilestones });
        updateControls();

        const updated = await syncNow({ force: true });
        if (!updated || !updated.revision) {
            throw new Error('The latest cloud backup was not confirmed.');
        }
        return updated;
    }

    async function copyText(value) {
        if (global.navigator.clipboard && typeof global.navigator.clipboard.writeText === 'function') {
            await global.navigator.clipboard.writeText(value);
            return;
        }
        const textarea = global.document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        global.document.body.appendChild(textarea);
        textarea.select();
        global.document.execCommand('copy');
        textarea.remove();
    }

    function downloadRecoveryCard(recoveryCode) {
        const content = `${translate('cloudBackupRecoveryFileTitle')}\n\n${recoveryCode}\n\n${recoveryUrl(recoveryCode)}\n\n${translate('cloudBackupRecoveryFileWarning')}\n`;
        const blob = new global.Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = global.URL.createObjectURL(blob);
        const anchor = global.document.createElement('a');
        anchor.href = url;
        anchor.download = 'tentenquiz-recovery-code.txt';
        anchor.hidden = true;
        global.document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        global.setTimeout(() => global.URL.revokeObjectURL(url), 1000);
    }

    function localDateKey(value) {
        const date = value ? new Date(value) : new Date();
        if (Number.isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 마일스톤마다 전체 기록을 다시 암호화해 올리면 1회당 최대 15문서 쓰기입니다.
    // 25문항 섹션 완료는 하루에 수십 번 발생할 수 있어 "서버 비용 최소화"라는
    // 목표와 정면으로 어긋납니다. 마커는 계속 쌓되 실제 업로드는 하루 1회로 묶습니다.
    // (마커는 pendingMilestones 에 누적되므로 유실되지 않습니다.)
    function hasSyncedToday(profile) {
        if (!profile || !profile.lastSyncedAt) return false;
        const synced = localDateKey(profile.lastSyncedAt);
        return Boolean(synced) && synced === localDateKey();
    }

    async function syncNow(options = {}) {
        if (syncPromise) return syncPromise;
        const profile = readProfile();
        const pendingMilestones = profile && Array.isArray(profile.pendingMilestones)
            ? profile.pendingMilestones
            : [];
        if (!profile || profile.conflict || !global.navigator.onLine || pendingMilestones.length === 0) return null;
        if (!options.force && hasSyncedToday(profile)) return null;
        syncPromise = (async () => {
            setBusy(true, 'cloudBackupSaving');
            try {
                const updated = await uploadProfile(profile);
                updateControls();
                showMilestoneBackupToast();
                if (updated.needsRecoveryPrompt) scheduleRecoveryPrompt();
                return updated;
            } catch (error) {
                if (error instanceof CloudBackupConflictError) {
                    writeProfile({ ...profile, dirty: true, conflict: true });
                    setStatus('cloudBackupConflict');
                } else if (error.code === 'too-large') {
                    writeProfile({ ...profile, dirty: true });
                    setStatus('cloudBackupTooLarge');
                } else {
                    writeProfile({ ...profile, dirty: true });
                    setStatus(global.navigator.onLine ? 'cloudBackupError' : 'cloudBackupOffline');
                }
                if (options.alertOnError) global.alert(translate(error instanceof CloudBackupConflictError ? 'cloudBackupConflict' : 'cloudBackupError'));
                throw error;
            } finally {
                syncPromise = null;
                setBusy(false);
            }
        })();
        return syncPromise;
    }

    function markLocalRecordsDirty() {
        const profile = readProfile();
        if (!profile) return;
        writeProfile({ ...profile, dirty: true });
        updateControls();
    }

    function milestoneIdFromDetail(detail = {}) {
        const nativeLanguage = String(detail.nativeLanguage || '');
        const learningLanguage = String(detail.learningLanguage || '');
        const stage = Number(detail.stage);
        const section = String(detail.section || '');
        if (!nativeLanguage || !learningLanguage || !Number.isInteger(stage) || stage < 1 || !section) return '';
        return `${nativeLanguage}:${learningLanguage}:${stage}:${section}`;
    }

    function dailyQuizAchievementIdFromDetail(detail = {}) {
        const nativeLanguage = String(detail.nativeLanguage || '');
        const learningLanguage = String(detail.learningLanguage || '');
        const dateKey = String(detail.dateKey || '');
        if (
            !nativeLanguage || !learningLanguage || nativeLanguage === learningLanguage
            || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)
            || Number(detail.questionCount) !== 10 || Number(detail.score) !== 10
        ) return '';
        return `daily:${nativeLanguage}:${learningLanguage}:${dateKey}`;
    }

    async function queueBackupMarker(markerId) {
        if (!markerId) return null;
        let profile = readProfile();
        if (profile && profile.conflict) return null;
        if (!profile) {
            profile = {
                recoveryCode: await createRecoveryCode(),
                revision: '',
                lastSyncedAt: '',
                recordCount: 0,
                dirty: true,
                conflict: false,
                pendingMilestones: [],
                needsRecoveryPrompt: true
            };
            await (global.navigator.storage && global.navigator.storage.persist
                ? global.navigator.storage.persist().catch(() => false)
                : false);
        }

        const pendingMilestones = Array.from(new Set([
            ...(Array.isArray(profile.pendingMilestones) ? profile.pendingMilestones : []),
            markerId
        ])).slice(-100);
        profile = writeProfile({ ...profile, dirty: true, pendingMilestones });
        updateControls();

        if (!global.navigator.onLine) return profile;
        global.clearTimeout(milestoneSyncTimer);
        milestoneSyncTimer = global.setTimeout(() => {
            syncNow().catch((error) => console.warn('성과 백업 보류:', error));
        }, 1200);
        return profile;
    }

    async function queueMilestoneBackup(detail) {
        const milestoneId = milestoneIdFromDetail(detail);
        if (!milestoneId || Number(detail.questionCount) !== 25) return null;
        return queueBackupMarker(milestoneId);
    }

    async function queueDailyQuizBackup(detail) {
        return queueBackupMarker(dailyQuizAchievementIdFromDetail(detail));
    }

    function handleSectionCompleted(event) {
        milestoneEventPromise = milestoneEventPromise
            .then(() => queueMilestoneBackup(event && event.detail || {}))
            .catch((error) => console.error('섹션 완료 백업 준비 실패:', error));
    }

    function handleDailyQuizCompleted(event) {
        milestoneEventPromise = milestoneEventPromise
            .then(() => queueDailyQuizBackup(event && event.detail || {}))
            .catch((error) => console.error('오늘의 퀴즈 기록 백업 준비 실패:', error));
    }

    // 서버/네트워크 문제와 "코드가 틀렸다"를 구분합니다.
    // 여기서 쓰는 키는 모두 i18n.js 에 이미 존재하는 키입니다.
    const TRANSIENT_FIRESTORE_CODES = [
        'permission-denied', 'unauthenticated', 'resource-exhausted',
        'unavailable', 'deadline-exceeded', 'internal', 'aborted', 'cancelled'
    ];

    function classifyCloudBackupError(error) {
        if (!global.navigator.onLine) return 'cloudBackupOffline';

        const code = String((error && error.code) || '');
        if (code === 'not-found') return 'cloudBackupNotFound';
        if (TRANSIENT_FIRESTORE_CODES.includes(code)) return 'cloudBackupError';
        // firebase SDK 는 'firestore/unavailable' 형태로 붙여 오기도 합니다.
        if (TRANSIENT_FIRESTORE_CODES.some((known) => code.endsWith(`/${known}`))) return 'cloudBackupError';

        // fetch 자체 실패는 TypeError 로 올라옵니다.
        if (error instanceof TypeError) return 'cloudBackupError';

        const message = String((error && error.message) || '');
        if (/network|fetch|timeout|offline/i.test(message)) return 'cloudBackupError';

        // 나머지(코드 파싱 실패, 복호화 실패, 무결성 검사 실패)는 코드 문제로 봅니다.
        return 'cloudBackupInvalidCode';
    }

    async function restoreFromCode(recoveryCode) {
        setBusy(true, 'cloudBackupLoading');
        try {
            const remote = await fetchCloudBackup(recoveryCode);
            const records = global.TentenLearningRecords;
            const incoming = records.validateBackupPayload(remote.payload);
            const confirmed = global.confirm(translate('cloudBackupLoadConfirm', {
                date: formatDate(incoming.exportedAt), count: incoming.recordCount
            }));
            if (!confirmed) return false;

            const current = await records.createBackupPayload();
            if (
                (current.recordCount > 0 || (current.dailyQuizAchievements || []).length > 0)
                && typeof records.downloadPayload === 'function'
            ) {
                records.downloadPayload(current, 'tentenquiz-before-cloud-restore');
            }
            try {
                await records.replaceAllLearningRecords(incoming);
            } catch (restoreError) {
                await records.replaceAllLearningRecords(current).catch((rollbackError) => {
                    console.error('클라우드 복원 자동 되돌리기 실패:', rollbackError);
                });
                throw restoreError;
            }
            writeProfile({
                recoveryCode: remote.credentials.recoveryCode,
                revision: remote.revision,
                lastSyncedAt: new Date().toISOString(),
                recordCount: incoming.recordCount,
                dirty: false,
                conflict: false,
                pendingMilestones: [],
                needsRecoveryPrompt: false
            });
            global.alert(translate('cloudBackupLoadSuccess', { count: incoming.recordCount }));
            if (typeof records.reloadWithRestoredPreferences === 'function') records.reloadWithRestoredPreferences();
            else global.location.reload();
            return true;
        } catch (error) {
            console.error('클라우드 백업 불러오기 실패:', error);
            // 예전에는 not-found 가 아닌 모든 오류를 "잘못된 복구 코드"로 표시했습니다.
            // 네트워크 장애나 App Check 거부까지 "코드가 틀렸다"로 보이면
            // 사용자는 맞는 코드를 들고도 재시도를 포기합니다.
            const key = classifyCloudBackupError(error);
            setStatus(key);
            global.alert(translate(key));
            return false;
        } finally {
            setBusy(false);
        }
    }

    function collectControls() {
        const section = global.document.getElementById('cloud-backup-section');
        if (!section) return null;
        return {
            section,
            status: global.document.getElementById('cloud-backup-status'),
            manageStatus: global.document.getElementById('cloud-backup-manage-status'),
            manageOpen: global.document.getElementById('cloud-backup-manage-open-btn'),
            manageDialog: global.document.getElementById('cloud-backup-manage-dialog'),
            manageClose: global.document.getElementById('cloud-backup-manage-close-btn'),
            showCode: global.document.getElementById('cloud-backup-show-code-btn'),
            restoreOpen: global.document.getElementById('cloud-backup-restore-open-btn'),
            recoveryDialog: global.document.getElementById('cloud-backup-recovery-dialog'),
            recoveryCode: global.document.getElementById('cloud-backup-recovery-code'),
            qr: global.document.getElementById('cloud-backup-qr'),
            copyCode: global.document.getElementById('cloud-backup-copy-code-btn'),
            downloadCode: global.document.getElementById('cloud-backup-download-code-btn'),
            recoveryClose: global.document.getElementById('cloud-backup-recovery-close-btn'),
            restoreDialog: global.document.getElementById('cloud-backup-restore-dialog'),
            restoreForm: global.document.getElementById('cloud-backup-restore-form'),
            restoreInput: global.document.getElementById('cloud-backup-restore-code-input'),
            restoreCancel: global.document.getElementById('cloud-backup-restore-cancel-btn')
        };
    }

    function initializeControls() {
        controls = collectControls();
        if (!controls) return;
        if (!isConfigured()) {
            controls.section.hidden = true;
            return;
        }
        controls.section.hidden = false;
        updateControls();

        controls.manageOpen.addEventListener('click', () => {
            updateControls();
            openDialog(controls.manageDialog);
        });
        controls.manageClose.addEventListener('click', () => closeDialog(controls.manageDialog));
        controls.showCode.addEventListener('click', async () => {
            setBusy(true, 'cloudBackupSaving');
            try {
                const profile = await saveLatestRecordsBeforeShowingRecoveryCode();
                closeDialog(controls.manageDialog);
                showRecoveryCode(profile.recoveryCode);
            } catch (error) {
                console.error('복구 코드 준비 실패:', error);
                if (error instanceof CloudBackupConflictError) setStatus('cloudBackupConflict');
                else if (error && error.code === 'too-large') setStatus('cloudBackupTooLarge');
                else setStatus(global.navigator.onLine ? 'cloudBackupError' : 'cloudBackupOffline');
            } finally {
                setBusy(false);
            }
        });
        controls.restoreOpen.addEventListener('click', () => {
            closeDialog(controls.manageDialog);
            controls.restoreInput.value = '';
            openDialog(controls.restoreDialog);
            controls.restoreInput.focus();
        });
        controls.restoreCancel.addEventListener('click', () => closeDialog(controls.restoreDialog));
        controls.recoveryClose.addEventListener('click', () => closeDialog(controls.recoveryDialog));
        controls.copyCode.addEventListener('click', async () => {
            await copyText(controls.recoveryCode.textContent);
            setStatus('cloudBackupCodeCopied');
        });
        controls.downloadCode.addEventListener('click', () => downloadRecoveryCard(controls.recoveryCode.textContent));
        controls.restoreForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const code = controls.restoreInput.value;
            if (!code) return;
            const restored = await restoreFromCode(code);
            if (restored) closeDialog(controls.restoreDialog);
        });
        const hashMatch = global.location.hash.match(/^#tenten-recover=(.+)$/);
        if (hashMatch) {
            const code = decodeURIComponent(hashMatch[1]);
            global.history.replaceState(null, '', `${global.location.pathname}${global.location.search}`);
            controls.restoreInput.value = code;
            openDialog(controls.restoreDialog);
        }

        const profile = readProfile();
        if (profile && Array.isArray(profile.pendingMilestones) && profile.pendingMilestones.length > 0 && !profile.conflict) {
            global.setTimeout(() => syncNow().catch(() => {}), 1500);
        }
        if (profile && profile.needsRecoveryPrompt && profile.lastSyncedAt) scheduleRecoveryPrompt();
    }

    global.TentenCloudBackup = {
        isConfigured,
        createRecoveryCode,
        parseRecoveryCode,
        deriveCredentials,
        encryptPayload,
        decryptPayload,
        createFirebaseStore,
        fetchCloudBackup,
        restoreFromCode,
        queueMilestoneBackup,
        queueDailyQuizBackup,
        syncNow,
        readProfile
    };

    global.addEventListener('tenten-learning-records-changed', markLocalRecordsDirty);
    global.addEventListener('tenten-section-completed', handleSectionCompleted);
    global.addEventListener('tenten-daily-quiz-completed', handleDailyQuizCompleted);
    global.addEventListener('online', () => {
        const profile = readProfile();
        if (
            profile && Array.isArray(profile.pendingMilestones) && profile.pendingMilestones.length > 0
            && !profile.conflict
        ) {
            syncNow().catch(() => {});
        }
    });

    if (global.document.readyState === 'loading') {
        global.document.addEventListener('DOMContentLoaded', initializeControls, { once: true });
    } else {
        initializeControls();
    }
})(window);

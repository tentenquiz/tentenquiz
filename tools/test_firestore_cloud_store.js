const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { webcrypto } = require('crypto');

const projectRoot = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(projectRoot, 'cloud-backup.js'), 'utf8');
const documents = new Map();
let timestampCounter = 0;

function snapshotFor(reference) {
    return {
        exists: () => documents.has(reference.path),
        data: () => documents.get(reference.path)
    };
}

const firestore = {
    doc: (_db, ...parts) => ({ path: parts.join('/') }),
    serverTimestamp: () => ({ serverTimestamp: ++timestampCounter }),
    getDoc: async (reference) => snapshotFor(reference),
    runTransaction: async (_db, callback) => {
        const mutations = [];
        const transaction = {
            get: async (reference) => snapshotFor(reference),
            set: (reference, value) => mutations.push({ type: 'set', path: reference.path, value }),
            delete: (reference) => mutations.push({ type: 'delete', path: reference.path })
        };
        const result = await callback(transaction);
        mutations.forEach((mutation) => {
            if (mutation.type === 'set') documents.set(mutation.path, mutation.value);
            else documents.delete(mutation.path);
        });
        return result;
    }
};

const window = {
    TENTEN_CLOUD_BACKUP_CONFIG: {
        firebaseConfig: {},
        collectionName: 'tentenCloudBackups',
        maxEncryptedBytes: 10 * 1024 * 1024
    },
    __TENTEN_FIRESTORE_TEST_ADAPTER__: {},
    crypto: webcrypto,
    localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
    },
    navigator: { onLine: true },
    location: { origin: 'https://tentenquiz.example', pathname: '/', search: '', hash: '' },
    history: { replaceState: () => {} },
    document: {
        readyState: 'loading',
        visibilityState: 'visible',
        addEventListener: () => {},
        getElementById: () => null
    },
    addEventListener: () => {},
    setTimeout,
    clearTimeout,
    btoa: (value) => Buffer.from(value, 'binary').toString('base64'),
    atob: (value) => Buffer.from(value, 'base64').toString('binary')
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
    Error
};
vm.createContext(context);
vm.runInContext(source, context);

(async () => {
    const cloud = window.TentenCloudBackup;
    if (!cloud || typeof cloud.createFirebaseStore !== 'function') {
        throw new Error('production Firestore adapter was not exported');
    }

    const store = cloud.createFirebaseStore({ name: 'mock-firestore' }, firestore);
    const backupId = 'A'.repeat(43);
    const writeToken = 'B'.repeat(43);
    const metadataPath = `tentenCloudBackups/${backupId}`;
    const firstChunkPath = `${metadataPath}/chunks/0000`;
    const secondChunkPath = `${metadataPath}/chunks/0001`;
    const largeBody = `{"ciphertext":"${'x'.repeat(600100)}"}`;

    const firstWrite = await store.putBackup({
        backupId,
        writeToken,
        body: largeBody,
        expectedRevision: '',
        exportedAt: '2026-08-19T12:00:00.000Z',
        recordCount: 2
    });
    if (!documents.has(metadataPath) || !documents.has(firstChunkPath) || !documents.has(secondChunkPath)) {
        throw new Error('large encrypted backup was not split into Firestore documents');
    }
    if (documents.get(metadataPath).chunkCount !== 2) {
        throw new Error('Firestore metadata has the wrong chunk count');
    }

    const firstRead = await store.getBackup({ backupId, writeToken });
    if (firstRead.body !== largeBody || firstRead.revision !== firstWrite.revision) {
        throw new Error('chunked Firestore backup did not round-trip');
    }

    let staleWriteRejected = false;
    try {
        await store.putBackup({
            backupId,
            writeToken,
            body: '{"ciphertext":"stale"}',
            expectedRevision: 'stale-revision',
            exportedAt: '2026-08-19T12:01:00.000Z',
            recordCount: 3
        });
    } catch (error) {
        staleWriteRejected = error && error.code === 'conflict';
    }
    if (!staleWriteRejected || documents.get(metadataPath).revision !== firstWrite.revision) {
        throw new Error('stale Firestore writer was not blocked transactionally');
    }

    const smallerBody = '{"ciphertext":"newer"}';
    const secondWrite = await store.putBackup({
        backupId,
        writeToken,
        body: smallerBody,
        expectedRevision: firstWrite.revision,
        exportedAt: '2026-08-19T12:02:00.000Z',
        recordCount: 3
    });
    if (documents.has(secondChunkPath) || documents.get(metadataPath).chunkCount !== 1) {
        throw new Error('obsolete Firestore chunks were not removed after a smaller backup');
    }
    const secondRead = await store.getBackup({ backupId, writeToken });
    if (secondRead.body !== smallerBody || secondRead.revision !== secondWrite.revision) {
        throw new Error('updated Firestore backup did not round-trip');
    }

    let wrongOwnerRejected = false;
    try {
        await store.deleteBackup({
            backupId,
            writeToken: 'C'.repeat(43),
            expectedRevision: secondWrite.revision
        });
    } catch (error) {
        wrongOwnerRejected = error && error.code === 'forbidden';
    }
    if (!wrongOwnerRejected || !documents.has(metadataPath)) {
        throw new Error('a different write credential deleted the Firestore backup');
    }

    await store.deleteBackup({ backupId, writeToken, expectedRevision: secondWrite.revision });
    if (documents.has(metadataPath) || documents.has(firstChunkPath)) {
        throw new Error('Firestore backup documents were not deleted');
    }

    let consumedRevisionRejected = false;
    try {
        await store.deleteBackup({ backupId, writeToken, expectedRevision: secondWrite.revision });
    } catch (error) {
        consumedRevisionRejected = error && error.code === 'not-found';
    }
    if (!consumedRevisionRejected) {
        throw new Error('an already-consumed Firestore revision was accepted a second time');
    }

    console.log('OK: encrypted backups are chunked and reassembled within Firestore limits');
    console.log('OK: Firestore transactions reject stale writers without changing stored data');
    console.log('OK: smaller updates remove obsolete chunks and valid deletion removes the cloud copy');
    console.log('OK: an already-consumed Firestore revision cannot be claimed twice');
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

// =====================================================================
// tools/test_deployment_readiness.js
//
// 배포 타깃: Cloudflare Pages + R2  (Firebase Hosting 아님)
//
// 이 스크립트는 이전 버전이 firebase.json 만 검사하던 문제를 대체합니다.
// 배포 타깃이 바뀐 뒤에도 옛 설정을 보고 "OK"를 출력하던 것이
// 가장 위험한 상태였습니다.
//
//   실행: node tools/test_deployment_readiness.js
//   실패 시 exit code 1
// =====================================================================

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const failures = [];
const warnings = [];

function fail(message) { failures.push(message); }
function warn(message) { warnings.push(message); }
function read(relativePath) { return fs.readFileSync(path.join(root, relativePath), 'utf8'); }
function exists(relativePath) { return fs.existsSync(path.join(root, relativePath)); }

// Cloudflare Pages 배포당 파일 수 한도
const CLOUDFLARE_PAGES_FILE_LIMIT = 20000;
// 한도에 근접하면 미리 경고할 임계값
const FILE_COUNT_WARN_THRESHOLD = 18000;

// ---------------------------------------------------------------------
// _headers 파서
// "/path" 로 시작하는 줄이 블록을 열고, 들여쓴 "Key: value" 줄이 그 블록에 속합니다.
// ---------------------------------------------------------------------
function parseHeadersFile(source) {
    const blocks = new Map();
    let current = null;

    source.split(/\r?\n/).forEach((rawLine) => {
        const line = rawLine.replace(/\s+$/, '');
        if (!line.trim() || line.trim().startsWith('#')) return;

        if (!/^\s/.test(line)) {
            current = line.trim();
            if (!blocks.has(current)) blocks.set(current, new Map());
            return;
        }

        if (!current) return;
        const separatorIndex = line.indexOf(':');
        if (separatorIndex < 0) return;
        const key = line.slice(0, separatorIndex).trim().toLowerCase();
        const value = line.slice(separatorIndex + 1).trim();
        blocks.get(current).set(key, value);
    });

    return blocks;
}

// =====================================================================
// 1. _headers — 보안 헤더와 서비스 워커 캐시 정책
// =====================================================================
if (!exists('_headers')) {
    fail('_headers 파일이 없습니다. Cloudflare Pages 는 firebase.json 을 읽지 않으므로 '
        + '보안 헤더와 service-worker no-cache 설정이 전부 사라집니다.');
} else {
    const blocks = parseHeadersFile(read('_headers'));

    const globalBlock = blocks.get('/*');
    if (!globalBlock) {
        fail('_headers 에 전역 규칙 "/*" 블록이 없습니다.');
    } else {
        const requiredGlobalHeaders = {
            'x-content-type-options': 'nosniff',
            'referrer-policy': 'strict-origin-when-cross-origin',
            'x-frame-options': 'SAMEORIGIN'
        };
        Object.entries(requiredGlobalHeaders).forEach(([key, expected]) => {
            const actual = globalBlock.get(key);
            if (!actual) {
                fail(`_headers "/*" 블록에 ${key} 헤더가 없습니다.`);
            } else if (actual.toLowerCase() !== expected.toLowerCase()) {
                fail(`_headers "/*" 의 ${key} 값이 "${expected}" 가 아닙니다 (현재: "${actual}").`);
            }
        });
        // Referrer-Policy 는 Google CMP(동의 관리) 요구사항이라 특히 중요합니다.
        if (!globalBlock.has('permissions-policy')) {
            warn('_headers "/*" 에 Permissions-Policy 가 없습니다. 카메라/마이크/위치 권한이 열려 있습니다.');
        }
    }

    const serviceWorkerBlock = blocks.get('/service-worker.js');
    if (!serviceWorkerBlock) {
        fail('_headers 에 "/service-worker.js" 블록이 없습니다. '
            + '서비스 워커가 캐시되면 이후 모든 배포가 사용자에게 도달하지 않습니다.');
    } else {
        const cacheControl = String(serviceWorkerBlock.get('cache-control') || '').toLowerCase();
        if (!cacheControl.includes('no-store') && !cacheControl.includes('no-cache')) {
            fail(`서비스 워커의 Cache-Control 이 캐시를 막지 않습니다 (현재: "${cacheControl}").`);
        }
    }

    ['/cloud-backup.js', '/i18n.js'].forEach((scriptPath) => {
        const block = blocks.get(scriptPath);
        if (!block) {
            fail(`_headers 에 "${scriptPath}" 캐시 재검증 규칙이 없습니다.`);
            return;
        }
        const cacheControl = String(block.get('cache-control') || '').toLowerCase();
        if (!cacheControl.includes('max-age=0') && !cacheControl.includes('no-cache') && !cacheControl.includes('no-store')) {
            fail(`${scriptPath} 의 Cache-Control 이 새 배포를 즉시 재검증하지 않습니다 (현재: "${cacheControl}").`);
        }
    });

    ['/assets/*', '/vendor/*'].forEach((pattern) => {
        const block = blocks.get(pattern);
        if (!block || !String(block.get('cache-control') || '').includes('immutable')) {
            warn(`_headers 의 ${pattern} 에 immutable 캐시 정책이 없습니다. 불필요한 재다운로드가 발생합니다.`);
        }
    });
}

// =====================================================================
// 2. _redirects — legacy x-default 경로를 건드리지 않았는지
// =====================================================================
const LEGACY_PATHS = ['/about', '/guide', '/contact', '/privacy', '/terms'];
if (!exists('_redirects')) {
    warn('_redirects 가 없습니다. www→apex 정규화가 없으면 중복 콘텐츠가 생길 수 있습니다.');
} else {
    const redirects = read('_redirects');
    redirects.split(/\r?\n/).forEach((rawLine, index) => {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) return;
        const from = line.split(/\s+/)[0];
        // legacy .html 경로는 hreflang="x-default" 타깃이므로 200 으로 서빙되어야 합니다.
        if (LEGACY_PATHS.includes(from)) {
            fail(`_redirects:${index + 1} 이 ${from} 을 리다이렉트합니다. `
                + '이 경로는 hreflang="x-default" 타깃이라 리다이렉트하면 12개 언어 hreflang 클러스터가 깨집니다.');
        }
    });
}

// =====================================================================
// 3. 오디오가 R2 절대 URL 을 사용하는지
// =====================================================================
const globalConfig = read('global-config.js');
const script = read('script.js');

const audioBaseMatch = globalConfig.match(/DEFAULT_AUDIO_BASE_URL\s*=\s*'([^']*)'/);
if (!audioBaseMatch) {
    fail('global-config.js 에 DEFAULT_AUDIO_BASE_URL 이 정의되어 있지 않습니다. R2 전환이 반영되지 않았습니다.');
} else if (!/^https:\/\/[^/]+$/i.test(audioBaseMatch[1])) {
    fail(`DEFAULT_AUDIO_BASE_URL 이 https 절대 URL 이 아닙니다 (현재: "${audioBaseMatch[1]}").`);
}

if (!globalConfig.includes('window.TENTEN_AUDIO_BASE_URL')) {
    fail('global-config.js 가 window.TENTEN_AUDIO_BASE_URL 을 노출하지 않습니다.');
}
if (!script.includes('window.TENTEN_AUDIO_BASE_URL')) {
    fail('script.js 의 resolveTentenAssetUrl 이 오디오 베이스 URL 을 사용하지 않습니다. '
        + '음성 요청이 여전히 같은 오리진으로 나갑니다.');
}
if (!globalConfig.includes('window.TENTEN_DIALOGUE_AUDIO_ENABLED')) {
    fail('global-config.js 에 TENTEN_DIALOGUE_AUDIO_ENABLED 플래그가 없습니다.');
}
// audio_dialogue 자산이 실제로 없는데 플래그가 켜져 있으면 404 폭탄이 납니다.
if (/__TENTEN_DIALOGUE_AUDIO_ENABLED__\s*===\s*true/.test(globalConfig)
    && !exists('audio_dialogue')
    && /window\.__TENTEN_DIALOGUE_AUDIO_ENABLED__\s*=\s*true/.test(script + globalConfig)) {
    fail('회화 음원 플래그가 켜져 있는데 audio_dialogue 자산을 찾을 수 없습니다.');
}

// =====================================================================
// 4. 배포 파일 수 — Cloudflare Pages 20,000개 한도
// =====================================================================
function listGitTrackedFiles() {
    try {
        const output = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
        return output.split(/\r?\n/).filter(Boolean);
    } catch (_error) {
        return null;
    }
}

const trackedFiles = listGitTrackedFiles();
if (!trackedFiles) {
    warn('git ls-files 를 실행할 수 없어 배포 파일 수를 검증하지 못했습니다. '
        + 'Cloudflare Pages 의 20,000개 한도를 수동으로 확인하세요.');
} else {
    if (trackedFiles.length > CLOUDFLARE_PAGES_FILE_LIMIT) {
        fail(`Git 추적 파일이 ${trackedFiles.length}개로 Cloudflare Pages 한도(${CLOUDFLARE_PAGES_FILE_LIMIT})를 초과합니다. `
            + '배포가 업로드 단계에서 실패합니다.');
    } else if (trackedFiles.length > FILE_COUNT_WARN_THRESHOLD) {
        warn(`Git 추적 파일이 ${trackedFiles.length}개입니다. 한도(${CLOUDFLARE_PAGES_FILE_LIMIT})에 근접했습니다.`);
    }

    const trackedAudio = trackedFiles.filter((file) => /^audio(_dialogue)?\//.test(file));
    if (trackedAudio.length > 0) {
        fail(`음성 파일 ${trackedAudio.length}개가 아직 Git 에 추적되고 있습니다 (예: ${trackedAudio[0]}). `
            + 'R2 로 옮겼다면 .gitignore 에 audio/ 를 추가하고 git rm -r --cached audio 를 실행하세요.');
    }

    const trackedBackups = trackedFiles.filter((file) => /\.backup\.|\.before-/.test(file));
    if (trackedBackups.length > 0) {
        fail(`백업 파일 ${trackedBackups.length}개가 Git 에 추적되고 있습니다 (예: ${trackedBackups[0]}). `
            + '배포되면 소스가 그대로 공개됩니다.');
    }
}

// =====================================================================
// 5. .gitignore
// =====================================================================
const gitignore = read('.gitignore');
const requiredIgnores = ['.secrets/', 'backups/', 'tts-build/', 'tts-review/', '**/*.backup.*', '**/*.before-*', 'audio/'];
requiredIgnores.forEach((rule) => {
    if (!gitignore.includes(rule)) {
        fail(`.gitignore 에 ${rule} 규칙이 없습니다.`);
    }
});

// =====================================================================
// 6. Firestore 보안 — App Check
// =====================================================================
const cloudConfig = read('cloud-backup-config.js');
const appCheckMatch = cloudConfig.match(/appCheckSiteKey\s*:\s*String\(runtime\.appCheckSiteKey\s*\|\|\s*'([^']*)'\)/);
if (!appCheckMatch || !appCheckMatch[1]) {
    fail('cloud-backup-config.js 의 appCheckSiteKey 가 비어 있습니다. '
        + 'App Check 없이는 누구나 Firestore 에 무제한으로 문서를 생성할 수 있습니다(비용 폭탄). '
        + '키를 채운 뒤 Firebase 콘솔에서 Firestore 를 "적용(Enforce)" 으로 전환하세요.');
}

const firestoreRules = read('firestore.rules');
if (!/request\.app\s*!=\s*null/.test(firestoreRules) && !/request\.auth\s*!=\s*null/.test(firestoreRules)) {
    fail('firestore.rules 에 request.app / request.auth 검사가 없습니다. '
        + 'tentenCloudBackups 컬렉션에 익명 쓰기가 무제한 허용됩니다.');
}

// =====================================================================
// 7. 필수 배포 산출물
// =====================================================================
const requiredPublicFiles = [
    'index.html', '404.html', 'robots.txt', 'sitemap.xml', 'service-worker.js',
    'manifest.webmanifest', 'script.js', 'style.css', 'cloud-backup.js',
    '_headers'
];
requiredPublicFiles.forEach((fileName) => {
    if (!exists(fileName)) fail(`배포 필수 파일이 없습니다: ${fileName}`);
});

// firestore.rules 는 배포 산출물이 아니라 firebase deploy --only firestore:rules 용입니다.
if (!exists('firestore.rules')) {
    fail('firestore.rules 가 없습니다.');
}

// =====================================================================
// 8. 소셜 공유 미리보기 (og:image)
// =====================================================================
const indexHtml = read('index.html');
if (!/property=["']og:image["']/i.test(indexHtml)) {
    fail('index.html 에 og:image 가 없습니다. 카카오톡/페이스북 공유 미리보기가 아예 뜨지 않습니다.');
}

// =====================================================================
// 9. 서비스 워커 내비게이션 캐시 오염 방지
// =====================================================================
const serviceWorker = read('service-worker.js');
if (/cache\.put\(\s*'\.\/index\.html'\s*,/.test(serviceWorker)) {
    fail('service-worker.js 가 모든 내비게이션 응답을 "./index.html" 한 키에 저장합니다. '
        + '72개 다국어 페이지가 서로 덮어써서 오프라인에서 엉뚱한 언어가 표시됩니다.');
}

// =====================================================================
// 10. 옛 배포 설정이 남아 혼동을 주는지
// =====================================================================
if (exists('firebase.json')) {
    warn('firebase.json 이 아직 남아 있습니다. Cloudflare Pages 는 이 파일을 읽지 않습니다. '
        + 'Firestore 규칙 배포용으로만 남길 거라면 hosting 블록을 제거해 혼동을 없애세요.');
}

// =====================================================================
// 결과 출력
// =====================================================================
warnings.forEach((message) => console.warn(`WARN: ${message}`));

if (failures.length > 0) {
    console.error('');
    failures.forEach((message, index) => console.error(`FAIL ${index + 1}: ${message}`));
    console.error(`\n배포 준비 검사 실패: ${failures.length}건`);
    process.exit(1);
}

console.log('OK: Cloudflare Pages 헤더/리다이렉트 설정 확인');
console.log('OK: 오디오가 R2 절대 URL 로 전환됨');
console.log(trackedFiles
    ? `OK: 배포 파일 ${trackedFiles.length}개 (한도 ${CLOUDFLARE_PAGES_FILE_LIMIT})`
    : 'OK: 파일 수 검증은 건너뜀');
console.log('OK: Firestore App Check 및 보안 규칙 확인');
console.log('OK: 필수 배포 산출물과 소셜 미리보기 태그 확인');
if (warnings.length > 0) console.log(`(경고 ${warnings.length}건 — 위 WARN 참고)`);

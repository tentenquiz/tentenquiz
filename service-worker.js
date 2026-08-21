// =====================================================================
// TentenQuiz service worker — 오프라인 캐시 비활성화 버전
// ---------------------------------------------------------------------
// 오프라인 지원은 일시 중단합니다. 이 워커는 아무것도 캐시하지 않고
// 모든 요청을 네트워크로 그대로 흘려보냅니다.
//
// ★ service-worker.js 를 삭제하면 안 됩니다 ★
// 이미 사용자 브라우저에 설치된 옛 워커는 파일을 지워도 계속 살아남아
// 낡은 캐시를 내줍니다. 이 "빈 워커"로 교체해야 기존 설치분이
// activate 시점에 옛 캐시를 스스로 지우고 무해해집니다.
//
// 오프라인을 다시 켜려면 git 히스토리의 이전 버전을 되살리되,
// 반드시 app JS(script.js, i18n.js, db.js, learning-records.js 등)를
// 프리캐시 목록에 포함해야 합니다. CSS 만 프리캐시하면 화면은 뜨는데
// 앱이 동작하지 않는 상태가 됩니다.
// =====================================================================

const LEGACY_CACHE_PREFIX = 'tentenquiz-shell-';

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        // 이 워커가 만들었던 옛 캐시를 모두 제거합니다.
        const keys = await caches.keys();
        await Promise.all(
            keys
                .filter((key) => key.startsWith(LEGACY_CACHE_PREFIX))
                .map((key) => caches.delete(key))
        );
        await self.clients.claim();
    })());
});

// fetch 는 가로채지 않습니다. 브라우저 기본 동작을 그대로 사용합니다.

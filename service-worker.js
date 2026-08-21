const CACHE_NAME = 'tentenquiz-shell-20260821-redirect-fix-1';

// 오프라인 폴백으로 쓰는 기본 셸. 언어 경로별 페이지는 방문 시 각자의 키로 캐시됩니다.
//
// ★ './index.html' 을 쓰면 안 됩니다 ★
// Cloudflare Pages 는 /index.html 을 / 로 308 리다이렉트합니다.
// cache.add() 는 리다이렉트를 따라가 저장까지는 성공하지만, 저장된 응답은
// response.redirected === true 상태입니다.
// 내비게이션 요청은 redirect 모드가 "manual" 이라, 그런 응답을 FetchEvent 에
// 돌려주면 브라우저가 다음 오류로 거부합니다:
//   "a redirected response was used for a request whose redirect mode is not follow"
// 즉 캐시는 채워지는데 오프라인에서는 항상 실패하는 상태가 됩니다.
// '/' 는 리다이렉트 없이 200 을 주므로 이쪽을 씁니다.
const OFFLINE_FALLBACK = './';

// 반드시 있어야 설치가 의미 있는 자산.
const CRITICAL_SHELL = [
    './',
    './style.css',
    './manifest.webmanifest'
];

// 리다이렉트를 거친 응답은 내비게이션에 그대로 쓸 수 없으므로
// 본문만 복사해 깨끗한 Response 로 다시 만듭니다. (최후 방어선)
async function toNavigationSafeResponse(response) {
    if (!response) return null;
    if (!response.redirected) return response;
    const body = await response.blob();
    return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
    });
}

// 있으면 좋지만 없다고 설치를 실패시킬 이유는 없는 자산.
const OPTIONAL_SHELL = [
    './vendor/canvas-confetti/confetti.browser.min.js',
    './assets/ui/perfect-score-100.svg',
    './assets/ui/daily-quiz-spark.svg',
    './assets/favicon/favicon-192x192.png',
    './assets/favicon/favicon-512x512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);

        // cache.addAll 은 목록 중 하나라도 404 면 전체가 실패하고
        // 서비스 워커가 영영 활성화되지 않습니다.
        // 필수 자산만 원자적으로 받고, 선택 자산은 개별 실패를 허용합니다.
        await cache.addAll(CRITICAL_SHELL);
        await Promise.all(OPTIONAL_SHELL.map((url) => (
            cache.add(url).catch((error) => {
                console.warn('[sw] 선택 자산 캐시 실패:', url, error);
            })
        )));

        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key.startsWith('tentenquiz-shell-') && key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    if (url.pathname.includes('/audio/') || url.pathname.includes('/data/')) return;

    if (request.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                const response = await fetch(request);

                // 성공 응답만 캐시합니다. 예전에는 이 검사가 없어서
                // 404.html 이나 500 에러 페이지가 앱 셸로 저장됐습니다.
                // 리다이렉트를 거친 응답은 저장해도 나중에 내비게이션에 쓸 수 없습니다.
                if (response.ok && !response.redirected) {
                    const copy = response.clone();
                    // 키를 request 로 둡니다. 예전에는 모든 내비게이션을
                    // './index.html' 한 키에 저장해서 /ja/about/ 를 방문하면
                    // 그 페이지가 /ko/ 의 오프라인 응답으로 나왔습니다.
                    caches.open(CACHE_NAME)
                        .then((cache) => cache.put(request, copy))
                        .catch(() => {});
                }
                return response;
            } catch (_error) {
                // 오프라인: 같은 URL 의 캐시 → 없으면 기본 셸 순으로 폴백.
                const cache = await caches.open(CACHE_NAME);
                const exact = await toNavigationSafeResponse(
                    await cache.match(request, { ignoreSearch: true })
                );
                if (exact) return exact;

                const fallback = await toNavigationSafeResponse(
                    await cache.match(OFFLINE_FALLBACK, { ignoreSearch: true })
                );
                if (fallback) return fallback;

                return new Response('', { status: 504, statusText: 'Offline' });
            }
        })());
        return;
    }

    if (!['script', 'style', 'image', 'manifest'].includes(request.destination)) return;
    event.respondWith(
        fetch(request)
            .then((response) => {
                // 리다이렉트를 거친 응답은 저장해도 나중에 내비게이션에 쓸 수 없습니다.
                if (response.ok && !response.redirected) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                }
                return response;
            })
            .catch(() => caches.match(request, { ignoreSearch: true }))
    );
});

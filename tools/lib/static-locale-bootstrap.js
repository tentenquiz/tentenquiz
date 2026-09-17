// 정적 페이지가 global-config.js 를 로드하기 전에 interfaceLanguage 를
// 알 수 있도록 하는 부트스트랩 스크립트를 주입합니다.
// build-multilingual-seo.js(레거시 about/guide/contact/privacy/terms/home)와
// build-word-dictionary.js(/words/ 사전 132페이지)가 동일한 로직을 공유합니다.
// src 가 상대경로("global-config.js")든 절대경로("/global-config.js")든
// 모두 매치하도록 슬래시를 옵셔널로 둡니다.
function injectStaticLocaleBootstrap(html, locale, localePathMap) {
    html = html.replace(/\s*<script\b[^>]*data-tenten-static-locale[^>]*>[\s\S]*?<\/script>\s*/gi, '\n');
    const serializedPaths = JSON.stringify(localePathMap).replace(/</g, '\\u003c');
    const bootstrap = `    <script data-tenten-static-locale>\n` +
        `        window.__TENTEN_STATIC_INTERFACE_LANGUAGE__ = ${JSON.stringify(locale.code)};\n` +
        `        window.__TENTEN_STATIC_LOCALE_PATHS__ = ${serializedPaths};\n` +
        `    </script>\n`;
    const firstRuntimeScript = /(?=\s*<script\b[^>]*src=["']\/?(?:global-config|content-translations)\.js)/i;
    return firstRuntimeScript.test(html)
        ? html.replace(firstRuntimeScript, `\n${bootstrap}`)
        : html.replace('</head>', `${bootstrap}</head>`);
}

module.exports = { injectStaticLocaleBootstrap };

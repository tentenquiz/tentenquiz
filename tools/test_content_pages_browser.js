const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const projectRoot = path.resolve(__dirname, '..');
const mimeTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.ico': 'image/x-icon',
    '.png': 'image/png'
};

const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    let filePath = path.resolve(projectRoot, relativePath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
    if (!filePath.startsWith(projectRoot) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        response.writeHead(404);
        response.end('Not found');
        return;
    }
    response.setHeader('Content-Type', mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
    fs.createReadStream(filePath).pipe(response);
});

function findBrowserExecutable() {
    const candidates = [
        chromium.executablePath(),
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];
    return candidates.find((candidate) => candidate && fs.existsSync(candidate));
}

const expectedAboutTitles = {
    en: 'About TentenQuiz',
    ko: '텐텐퀴즈 소개',
    ja: 'TentenQuizについて',
    'zh-CN': '关于TentenQuiz',
    'zh-TW': '關於TentenQuiz',
    fr: 'À propos de TentenQuiz',
    de: 'Über TentenQuiz',
    es: 'Acerca de TentenQuiz',
    vi: 'Giới thiệu TentenQuiz',
    ar: 'حول TentenQuiz',
    it: 'Informazioni su TentenQuiz',
    ru: 'О TentenQuiz'
};

const localeRoutes = {
    en: { slug: 'en', htmlLang: 'en' },
    ko: { slug: 'ko', htmlLang: 'ko' },
    ja: { slug: 'ja', htmlLang: 'ja' },
    'zh-CN': { slug: 'zh-cn', htmlLang: 'zh-Hans' },
    'zh-TW': { slug: 'zh-tw', htmlLang: 'zh-Hant' },
    fr: { slug: 'fr', htmlLang: 'fr' },
    de: { slug: 'de', htmlLang: 'de' },
    es: { slug: 'es', htmlLang: 'es' },
    vi: { slug: 'vi', htmlLang: 'vi' },
    ar: { slug: 'ar', htmlLang: 'ar' },
    it: { slug: 'it', htmlLang: 'it' },
    ru: { slug: 'ru', htmlLang: 'ru' }
};

(async () => {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    let browser;
    try {
        const executablePath = findBrowserExecutable();
        if (!executablePath) throw new Error('No Chromium-based browser is available');
        browser = await chromium.launch({ headless: true, executablePath });
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await context.newPage();
        const pageErrors = [];
        page.on('pageerror', (error) => pageErrors.push(error.message));

        for (const [code, expectedTitle] of Object.entries(expectedAboutTitles)) {
            const locale = localeRoutes[code];
            await page.goto(`${origin}/${locale.slug}/about/`, { waitUntil: 'domcontentloaded' });
            const state = await page.evaluate(() => ({
                lang: document.documentElement.lang,
                dir: document.documentElement.dir,
                title: document.querySelector('h1').textContent.trim(),
                selected: document.querySelector('#content-language-select').value,
                options: document.querySelectorAll('#content-language-select option').length,
                currentNav: document.querySelector('.legal-footer-nav strong').textContent.trim(),
                canonical: document.querySelector('link[rel="canonical"]').href,
                alternates: document.querySelectorAll('link[rel="alternate"][hreflang]').length
            }));
            if (state.lang !== locale.htmlLang || state.selected !== code) throw new Error(`${code}: selected language was not applied`);
            if (state.dir !== (code === 'ar' ? 'rtl' : 'ltr')) throw new Error(`${code}: text direction is wrong`);
            if (state.title !== expectedTitle) throw new Error(`${code}: translated About title is wrong: ${state.title}`);
            if (state.options !== 12 || state.alternates !== 13) throw new Error(`${code}: selector or hreflang is incomplete`);
            if (!state.canonical.endsWith(`/${locale.slug}/about/`)) throw new Error(`${code}: canonical URL lost its clean language route`);
        }

        const pageChecks = [
            ['about.html', 'about', 7],
            ['guide.html', 'guide', 9],
            ['contact.html', 'contact', 7],
            ['privacy.html', 'privacy', 10],
            ['terms.html', 'terms', 11]
        ];
        for (const [fileName, pageKey, sectionCount] of pageChecks) {
            await page.goto(`${origin}/en/${pageKey}/`, { waitUntil: 'domcontentloaded' });
            const state = await page.evaluate(() => ({
                sections: document.querySelectorAll('article.legal-document > section').length,
                description: document.querySelector('meta[name="description"]').content,
                email: Boolean(document.querySelector('a[href="mailto:support@tentenquiz.com"]')),
                scriptsLoaded: Boolean(window.TENTEN_CONTENT_TRANSLATIONS)
            }));
            if (state.sections !== sectionCount) throw new Error(`${pageKey}: expected ${sectionCount} sections, got ${state.sections}`);
            if (state.description.length < 40 || !state.email || !state.scriptsLoaded) throw new Error(`${pageKey}: translated metadata or support link is incomplete`);
        }

        await page.goto(`${origin}/about.html?lang=en`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => localStorage.setItem('tenten.interfaceLanguage', 'vi'));
        await page.goto(`${origin}/guide.html`, { waitUntil: 'domcontentloaded' });
        if (await page.getAttribute('html', 'lang') !== 'vi') throw new Error('content pages did not inherit the main interface language');

        await page.selectOption('#content-language-select', 'ja');
        await page.waitForURL(/\/ja\/guide\/$/);
        const linkState = await page.evaluate(() => ({
            lang: document.documentElement.lang,
            aboutHref: document.querySelector('.legal-footer-nav a[href$="/about/"]').getAttribute('href'),
            homeHref: document.querySelector('.legal-footer-nav a[href="/ja/"]').getAttribute('href')
        }));
        if (linkState.lang !== 'ja' || linkState.aboutHref !== '/ja/about/' || linkState.homeHref !== '/ja/') {
            throw new Error('language selector or internal links did not preserve Japanese');
        }

        await page.goto(`${origin}/ar/privacy/`, { waitUntil: 'domcontentloaded' });
        const layout = await page.evaluate(() => {
            const header = document.querySelector('.legal-header-inner').getBoundingClientRect();
            const brand = document.querySelector('.legal-brand').getBoundingClientRect();
            const actions = document.querySelector('.legal-header-actions').getBoundingClientRect();
            return { header, brand, actions, width: document.documentElement.scrollWidth, viewport: window.innerWidth };
        });
        if (layout.width > layout.viewport + 1) throw new Error('localized page causes horizontal overflow on mobile');
        if (layout.brand.left < layout.header.left - 1 || layout.actions.right > layout.header.right + 1) throw new Error('mobile header controls overflow');
        if (pageErrors.length) throw new Error(`browser page errors: ${pageErrors.join(' | ')}`);

        await context.close();
        console.log('OK: all 12 About-page languages render with localized titles, selector, direction, and metadata');
        console.log('OK: all 5 translated page types render their complete section sets');
        console.log('OK: saved-language inheritance, selector navigation, internal links, RTL, and mobile layout passed');
    } finally {
        if (browser) await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

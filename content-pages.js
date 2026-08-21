(function initializeTentenContentPages() {
    'use strict';

    const content = window.TENTEN_CONTENT_TRANSLATIONS;
    const article = document.querySelector('article[data-content-page]');
    if (!content || !article) return;

    const pageKey = article.dataset.contentPage;
    const supportedLanguages = Object.keys(content.common || {});
    const headingIds = {
        about: 'about-tentenquiz-title',
        guide: 'learning-guide-title',
        contact: 'contact-support-title',
        privacy: 'privacy-policy-title',
        terms: 'terms-of-service-title'
    };
    const fileToPage = {
        'about.html': 'about',
        'guide.html': 'guide',
        'contact.html': 'contact',
        'privacy.html': 'privacy',
        'terms.html': 'terms'
    };
    const defaultLocalePaths = {
        en: 'en', ko: 'ko', ja: 'ja', 'zh-CN': 'zh-cn', 'zh-TW': 'zh-tw',
        fr: 'fr', de: 'de', es: 'es', vi: 'vi', ar: 'ar', it: 'it', ru: 'ru'
    };

    function normalizeLanguage(value) {
        const raw = String(value || '').trim();
        if (supportedLanguages.includes(raw)) return raw;
        const lower = raw.toLowerCase();
        if (lower.startsWith('zh-tw') || lower.startsWith('zh-hk') || lower.startsWith('zh-hant')) return 'zh-TW';
        if (lower.startsWith('zh')) return 'zh-CN';
        const short = lower.split('-')[0];
        return supportedLanguages.find((code) => code.toLowerCase() === short) || '';
    }

    function readStoredInterfaceLanguage() {
        try {
            return normalizeLanguage(localStorage.getItem('tenten.interfaceLanguage'));
        } catch (error) {
            return '';
        }
    }

    const staticLanguage = normalizeLanguage(window.__TENTEN_STATIC_INTERFACE_LANGUAGE__);
    const requestedLanguage = normalizeLanguage(new URLSearchParams(location.search).get('lang'));
    const browserLanguage = normalizeLanguage((navigator.languages && navigator.languages[0]) || navigator.language);
    const language = staticLanguage || requestedLanguage || readStoredInterfaceLanguage() || browserLanguage || 'ko';
    const common = content.common[language] || content.common.en;
    const direction = language === 'ar' ? 'rtl' : 'ltr';

    const htmlLanguage = language === 'zh-CN' ? 'zh-Hans' : language === 'zh-TW' ? 'zh-Hant' : language;
    document.documentElement.lang = htmlLanguage;
    document.documentElement.dir = direction;

    function renderTranslatedArticle() {
        if (language === 'ko') return;
        const page = content.pages && content.pages[language] && content.pages[language][pageKey];
        if (!page) return;

        const headingId = headingIds[pageKey] || `${pageKey}-page-title`;
        article.setAttribute('aria-labelledby', headingId);
        article.innerHTML = `
            <header>
                <h1 id="${headingId}">${page.title}</h1>
                <p class="legal-effective-date">${page.kicker}</p>
            </header>
            <p class="legal-intro">${page.intro}</p>
            ${page.sections.map((section) => `
                <section>
                    <h2>${section.title}</h2>
                    ${section.html}
                </section>
            `).join('')}
        `;

        document.title = page.metaTitle;
        const description = document.querySelector('meta[name="description"]');
        if (description) description.content = page.description;
    }

    function addLanguageSelector() {
        const headerInner = document.querySelector('.legal-header-inner');
        const homeLink = document.querySelector('.legal-home-link');
        if (!headerInner || !homeLink) return;

        const actions = document.createElement('div');
        actions.className = 'legal-header-actions';

        const label = document.createElement('label');
        label.className = 'content-language-picker';
        const hiddenLabel = document.createElement('span');
        hiddenLabel.className = 'content-visually-hidden';
        hiddenLabel.textContent = common.languageLabel;

        const select = document.createElement('select');
        select.id = 'content-language-select';
        select.setAttribute('aria-label', common.languageLabel);
        content.languageNames.forEach((item) => {
            const option = document.createElement('option');
            option.value = item.code;
            option.textContent = item.name;
            select.appendChild(option);
        });
        select.value = language;
        select.addEventListener('change', () => {
            const next = normalizeLanguage(select.value) || 'ko';
            const localePaths = window.__TENTEN_STATIC_LOCALE_PATHS__ || defaultLocalePaths;
            const localizedSlug = localePaths && localePaths[next];
            if (localizedSlug) {
                location.href = `/${localizedSlug}/${pageKey}/`;
                return;
            }
            const url = new URL(location.href);
            if (next === 'ko') url.searchParams.delete('lang');
            else url.searchParams.set('lang', next);
            location.href = url.toString();
        });

        label.append(hiddenLabel, select);
        homeLink.before(actions);
        actions.append(label, homeLink);
    }

    function localizeChromeAndLinks() {
        const brand = document.querySelector('.legal-brand');
        const homeLink = document.querySelector('.legal-home-link');
        const footerNav = document.querySelector('.legal-footer-nav');
        if (brand) brand.setAttribute('aria-label', common.brandHomeLabel);
        if (homeLink) homeLink.textContent = common.backToQuiz;
        if (footerNav) footerNav.setAttribute('aria-label', common.navigationLabel);
        document.querySelectorAll('[data-google-privacy-settings]').forEach((control) => {
            control.textContent = common.privacyCookieSettings;
        });

        document.querySelectorAll('.legal-footer-nav a[href], .legal-footer-nav strong').forEach((element) => {
            if (element.tagName === 'STRONG') {
                element.textContent = common[pageKey] || element.textContent;
                return;
            }
            const fileName = String(element.getAttribute('href') || '').split(/[?#]/)[0];
            const targetPage = fileName === 'index.html' ? 'home' : fileToPage[fileName];
            if (targetPage && common[targetPage]) element.textContent = common[targetPage];
        });

        document.querySelectorAll('a[href]').forEach((link) => {
            const rawHref = link.getAttribute('href');
            if (!rawHref || /^(?:https?:|mailto:|tel:|data:|#)/i.test(rawHref)) return;
            if (staticLanguage && rawHref.startsWith('/')) return;
            const url = new URL(rawHref, location.href);
            const fileName = url.pathname.split('/').pop();
            if (fileName === 'index.html' || fileName === '') {
                url.searchParams.set('native', language);
                url.searchParams.delete('lang');
            } else if (fileToPage[fileName]) {
                if (language === 'ko') url.searchParams.delete('lang');
                else url.searchParams.set('lang', language);
            }
            link.setAttribute('href', `${fileName || 'index.html'}${url.search}${url.hash}`);
        });
    }

    function updateSearchMetadata() {
        if (document.querySelector('link[data-tenten-static-hreflang]')) return;
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical && language !== 'ko') {
            const canonicalUrl = new URL(canonical.href);
            canonicalUrl.searchParams.set('lang', language);
            canonical.href = canonicalUrl.toString();
        }

        const localePaths = window.__TENTEN_STATIC_LOCALE_PATHS__ || defaultLocalePaths;
        supportedLanguages.forEach((code) => {
            const alternate = document.createElement('link');
            alternate.rel = 'alternate';
            alternate.hreflang = code;
            alternate.href = `${location.origin}/${localePaths[code]}/${pageKey}/`;
            document.head.appendChild(alternate);
        });
    }

    renderTranslatedArticle();
    addLanguageSelector();
    localizeChromeAndLinks();
    updateSearchMetadata();
})();

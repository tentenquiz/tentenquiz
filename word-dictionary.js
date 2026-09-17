// /[locale]/words/ 정적 사전 페이지 전용 클라이언트 스크립트.
// global-config.js 가 먼저 로드되어 window.tentenGlobal 을 실제 상태
// (query > 이 페이지의 __TENTEN_STATIC_INTERFACE_LANGUAGE__ > localStorage >
// 브라우저 감지 > 기본값)로 채워둔 뒤에 실행됩니다.
//
// 이 스크립트는 두 가지만 합니다:
//   1) 페이지 내부 링크(허브의 섹션 목록, 섹션의 "퀴즈로 돌아가기", 홈/사전
//      footer 링크)에 현재 preference 를 실어 보냅니다. 언어 필드 선택이나
//      쿼리 규칙은 새로 만들지 않고 window.buildTentenPreferenceUrl 을 그대로
//      호출한 결과에 words 경로만 이어붙입니다.
//   2) 이 페이지를 정적 빌드할 때 쓴 기본 언어쌍(data-static-*)과 지금 이
//      브라우저의 실제 tentenGlobal 이 다르면, 같은 data/{section}.json 을
//      불러와 window.resolveGlobalQuizItem 으로 다시 계산해 카드 텍스트만
//      갈아 끼웁니다. 단어 필드 선택 규칙은 여기서 재구현하지 않습니다.
(function initializeWordDictionaryPage() {
    if (!window.tentenGlobal
        || typeof window.resolveGlobalQuizItem !== 'function'
        || typeof window.buildTentenPreferenceUrl !== 'function') {
        return;
    }

    const tentenGlobal = window.tentenGlobal;
    const prefRootUrl = new URL(window.buildTentenPreferenceUrl(`${window.location.origin}/`, tentenGlobal));

    function buildWordsHref(suffixPath) {
        const url = new URL(prefRootUrl.toString());
        url.pathname = url.pathname.replace(/\/?$/, '/') + String(suffixPath || '').replace(/^\/+/, '');
        return `${url.pathname}${url.search}`;
    }

    function rewriteInternalLinks() {
        document.querySelectorAll('.word-dict-container a[href^="/"]').forEach((link) => {
            const href = link.getAttribute('href') || '';
            const sectionMatch = /^\/[a-z-]+\/words\/([a-z-]+)\/$/.exec(href);
            const hubMatch = /^\/[a-z-]+\/words\/$/.exec(href);
            const homeMatch = /^\/[a-z-]+\/$/.exec(href);

            if (sectionMatch) {
                link.setAttribute('href', buildWordsHref(`words/${sectionMatch[1]}/`));
            } else if (hubMatch) {
                link.setAttribute('href', buildWordsHref('words/'));
            } else if (homeMatch) {
                link.setAttribute('href', `${prefRootUrl.pathname}${prefRootUrl.search}`);
            }
        });
    }

    function setWordCardHeadline(wordEl, headword, gloss) {
        wordEl.innerHTML = '';
        wordEl.appendChild(document.createTextNode(headword));
        const arrow = document.createElement('span');
        arrow.className = 'stage-preview-arrow';
        arrow.textContent = '—';
        wordEl.appendChild(arrow);
        wordEl.appendChild(document.createTextNode(gloss));
    }

    async function rehydrateWords() {
        const container = document.querySelector('[data-word-dict-section]');
        if (!container) return;

        const staticState = {
            learningLanguage: container.getAttribute('data-static-learning'),
            interfaceLanguage: container.getAttribute('data-static-native'),
            chineseReading: container.getAttribute('data-static-chinese-reading')
        };
        const alreadyMatches = tentenGlobal.learningLanguage === staticState.learningLanguage
            && tentenGlobal.interfaceLanguage === staticState.interfaceLanguage
            && tentenGlobal.chineseReading === staticState.chineseReading;
        if (alreadyMatches) return;

        const sectionKey = container.getAttribute('data-word-dict-section');
        let words;
        try {
            const response = await fetch(`/data/${sectionKey}.json`);
            if (!response.ok) return;
            words = await response.json();
        } catch (error) {
            return;
        }
        if (!Array.isArray(words)) return;

        const byId = new Map(words.map((word) => [String(word.id), word]));
        document.querySelectorAll('.stage-preview-card[data-word-id]').forEach((card) => {
            const word = byId.get(card.getAttribute('data-word-id'));
            if (!word) return;
            const resolved = window.resolveGlobalQuizItem(word);
            if (!resolved.targetWord || !resolved.meaning) return;

            const wordEl = card.querySelector('.stage-preview-word');
            let readingEl = card.querySelector('.stage-preview-reading');
            const noteEl = card.querySelector('.stage-preview-note');

            if (wordEl) {
                wordEl.setAttribute('lang', resolved.learningLanguage);
                setWordCardHeadline(wordEl, resolved.targetWord, resolved.meaning);
            }

            const hasReading = Boolean(resolved.targetReading) && resolved.targetReading !== resolved.targetWord;
            if (hasReading) {
                if (!readingEl) {
                    readingEl = document.createElement('p');
                    readingEl.className = 'stage-preview-reading';
                    if (wordEl) wordEl.insertAdjacentElement('afterend', readingEl);
                }
                readingEl.setAttribute('lang', resolved.learningLanguage);
                readingEl.textContent = resolved.targetReading;
            } else if (readingEl) {
                readingEl.remove();
            }

            if (noteEl) noteEl.textContent = resolved.note;
        });

        container.setAttribute('data-static-learning', tentenGlobal.learningLanguage);
        container.setAttribute('data-static-native', tentenGlobal.interfaceLanguage);
        container.setAttribute('data-static-chinese-reading', tentenGlobal.chineseReading);
    }

    rewriteInternalLinks();
    rehydrateWords();
})();

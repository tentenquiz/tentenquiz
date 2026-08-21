(function initializeGlobalConfig() {
    // ===== 오디오 CDN (Cloudflare R2) =====
    // 음성 파일은 Cloudflare Pages의 배포당 20,000파일 제한을 피하기 위해
    // R2 버킷(audio.tentenquiz.com)으로 분리되어 있습니다.
    // 버킷 내부 구조는 기존 로컬 폴더 구조를 그대로 미러링합니다.
    //   R2:  /audio/<section>/<file>.mp3
    //        /audio_dialogue/<file>.mp3
    // 프리뷰/로컬에서 다른 오리진을 쓰려면 이 스크립트보다 먼저
    // window.__TENTEN_AUDIO_BASE_URL__ 를 정의하세요. 빈 문자열('')로 두면
    // 기존처럼 같은 오리진의 상대 경로를 사용합니다.
    const DEFAULT_AUDIO_BASE_URL = 'https://audio.tentenquiz.com';
    const runtimeAudioBase = typeof window.__TENTEN_AUDIO_BASE_URL__ === 'string'
        ? window.__TENTEN_AUDIO_BASE_URL__
        : DEFAULT_AUDIO_BASE_URL;
    window.TENTEN_AUDIO_BASE_URL = String(runtimeAudioBase || '').trim().replace(/\/+$/, '');

    // 회화 음원(audio_dialogue/)은 아직 R2에 업로드되지 않았습니다.
    // 켜두면 존재하지 않는 파일에 대해 R2 Class B 요청이 계속 발생하므로
    // (404도 과금 대상입니다) 자산이 올라간 뒤에 true로 바꾸세요.
    window.TENTEN_DIALOGUE_AUDIO_ENABLED = window.__TENTEN_DIALOGUE_AUDIO_ENABLED__ === true;

    const languages = [
        { code: 'en', suffix: 'en', label: 'English', englishLabel: 'English', direction: 'ltr' },
        { code: 'ko', suffix: 'ko', label: '한국어', englishLabel: 'Korean', direction: 'ltr' },
        { code: 'ja', suffix: 'ja', label: '日本語', englishLabel: 'Japanese', direction: 'ltr' },
        { code: 'zh-CN', suffix: 'zh_cn', label: '简体中文', englishLabel: 'Simplified Chinese', direction: 'ltr' },
        { code: 'zh-TW', suffix: 'zh_tw', label: '繁體中文', englishLabel: 'Traditional Chinese', direction: 'ltr' },
        { code: 'fr', suffix: 'fr', label: 'Français', englishLabel: 'French', direction: 'ltr' },
        { code: 'de', suffix: 'de', label: 'Deutsch', englishLabel: 'German', direction: 'ltr' },
        { code: 'es', suffix: 'es', label: 'Español', englishLabel: 'Spanish', direction: 'ltr' },
        { code: 'vi', suffix: 'vi', label: 'Tiếng Việt', englishLabel: 'Vietnamese', direction: 'ltr' },
        { code: 'ar', suffix: 'ar', label: 'العربية', englishLabel: 'Arabic', direction: 'rtl' },
        { code: 'it', suffix: 'it', label: 'Italiano', englishLabel: 'Italian', direction: 'ltr' },
        { code: 'ru', suffix: 'ru', label: 'Русский', englishLabel: 'Russian', direction: 'ltr' }
    ];

    const byCode = Object.fromEntries(languages.map((language) => [language.code, language]));
    const defaultLocalePaths = {
        en: 'en', ko: 'ko', ja: 'ja', 'zh-CN': 'zh-cn', 'zh-TW': 'zh-tw',
        fr: 'fr', de: 'de', es: 'es', vi: 'vi', ar: 'ar', it: 'it', ru: 'ru'
    };
    const query = new URLSearchParams(window.location.search);
    const savedLearningLanguage = localStorage.getItem('tenten.learningLanguage');
    const savedInterfaceLanguage = localStorage.getItem('tenten.interfaceLanguage');
    const savedChineseReading = localStorage.getItem('tenten.chineseReading');

    const requestedLearningLanguage = query.get('learn') || savedLearningLanguage || 'ja';
    const staticInterfaceLanguage = String(window.__TENTEN_STATIC_INTERFACE_LANGUAGE__ || '').trim();
    const requestedInterfaceLanguage = query.get('native') || staticInterfaceLanguage || savedInterfaceLanguage || 'ko';
    const requestedChineseReading = query.get('zhReading') || savedChineseReading || 'pinyin';

    const interfaceLanguage = byCode[requestedInterfaceLanguage] ? requestedInterfaceLanguage : 'ko';
    const requestedLearning = byCode[requestedLearningLanguage] ? requestedLearningLanguage : 'ja';
    const learningLanguage = requestedLearning !== interfaceLanguage
        ? requestedLearning
        : languages.find((language) => language.code !== interfaceLanguage).code;

    window.TENTEN_LANGUAGES = languages;
    window.tentenGlobal = {
        learningLanguage,
        interfaceLanguage,
        chineseReading: requestedChineseReading === 'zhuyin' ? 'zhuyin' : 'pinyin'
    };

    window.getTentenLearningLanguages = function getTentenLearningLanguages(nativeLanguageCode) {
        return languages.filter((language) => language.code !== nativeLanguageCode);
    };

    window.getTentenLearningLanguageLabel = function getTentenLearningLanguageLabel(code) {
        const language = byCode[code] || byCode.en;
        return language.label === language.englishLabel
            ? language.label
            : `${language.label} (${language.englishLabel})`;
    };

    window.getTentenLanguage = function getTentenLanguage(code) {
        return byCode[code] || byCode.en;
    };

    window.getGlobalFieldSuffix = function getGlobalFieldSuffix(code) {
        return window.getTentenLanguage(code).suffix;
    };

    window.setTentenGlobalPreference = function setTentenGlobalPreference(key, value) {
        if (key === 'learningLanguage' || key === 'interfaceLanguage') {
            if (!byCode[value]) return false;
        } else if (key === 'chineseReading') {
            if (value !== 'pinyin' && value !== 'zhuyin') return false;
        } else {
            return false;
        }

        window.tentenGlobal[key] = value;
        localStorage.setItem(`tenten.${key}`, value);
        return true;
    };

    window.buildTentenPreferenceUrl = function buildTentenPreferenceUrl(currentUrl) {
        const url = new URL(currentUrl || window.location.href);
        url.searchParams.set('learn', window.tentenGlobal.learningLanguage);
        const localePaths = window.__TENTEN_STATIC_LOCALE_PATHS__ || defaultLocalePaths;
        const localizedSlug = localePaths && localePaths[window.tentenGlobal.interfaceLanguage];
        if (localizedSlug) {
            url.pathname = `/${localizedSlug}/`;
            url.searchParams.delete('native');
        } else {
            url.searchParams.set('native', window.tentenGlobal.interfaceLanguage);
        }
        url.searchParams.set('zhReading', window.tentenGlobal.chineseReading);
        return url.toString();
    };

    window.resolveGlobalQuizItem = function resolveGlobalQuizItem(item) {
        const learning = window.getTentenLanguage(window.tentenGlobal.learningLanguage);
        const interfaceLanguage = window.getTentenLanguage(window.tentenGlobal.interfaceLanguage);
        const targetWord = String(item[`word_${learning.suffix}`] || '').trim();
        const standardReading = String(item[`reading_${learning.suffix}`] || targetWord).trim();
        const targetReading = learning.code === 'zh-TW' && window.tentenGlobal.chineseReading === 'zhuyin'
            ? String(item.zhuyin_zh_tw || standardReading).trim()
            : standardReading;
        const quizText = ['ja', 'zh-CN', 'zh-TW'].includes(learning.code)
            ? targetReading
            : targetWord;

        return {
            targetWord,
            targetReading,
            quizText,
            meaning: String(item[`word_${interfaceLanguage.suffix}`] || '').trim(),
            note: String(item[`note_${interfaceLanguage.suffix}`] || '').trim(),
            audioFile: String(item[`audioFile_${learning.suffix}`] || '').trim(),
            answerAudioFile: String(item[`audioFile_${interfaceLanguage.suffix}`] || '').trim(),
            learningLanguage: learning.code,
            interfaceLanguage: interfaceLanguage.code,
            direction: interfaceLanguage.direction
        };
    };

    window.getTentenDistractorPool = function getTentenDistractorPool(items, item) {
        const selectedStage = Number(item && item.stage);
        const selectedSection = String((item && (item.category || item.section)) || '');
        const correctMeaning = String((item && item.meaning) || '').trim();
        const uniqueMeanings = new Set();

        (Array.isArray(items) ? items : []).forEach((candidate) => {
            if (Number(candidate && candidate.stage) !== selectedStage) return;
            const candidateSection = String((candidate && (candidate.category || candidate.section)) || '');
            if (selectedSection && candidateSection !== selectedSection) return;
            const meaning = String((candidate && candidate.meaning) || '').trim();
            if (!meaning || meaning === correctMeaning) return;
            uniqueMeanings.add(meaning);
        });

        return Array.from(uniqueMeanings);
    };

    window.getTentenResultHeadword = function getTentenResultHeadword(question) {
        if (!question) return '';
        return question.isGlobalData
            ? String(question.hanzi || question.reading || '')
            : String(question.reading || question.hanzi || '');
    };

    window.getTentenInQuizRevealSecondary = function getTentenInQuizRevealSecondary(question) {
        const learningLanguage = String((question && question.learningLanguage) || '');
        if (['ja', 'zh-CN', 'zh-TW'].includes(learningLanguage)) return '';
        return window.getTentenResultHeadword(question);
    };

    window.mergeTentenStoredItem = function mergeTentenStoredItem(storedItem, currentItem) {
        if (!currentItem) return storedItem;
        return {
            ...storedItem,
            hanzi: currentItem.hanzi || storedItem.hanzi || '',
            reading: currentItem.reading || storedItem.reading || '',
            pinyin: currentItem.pinyin || storedItem.pinyin || '',
            meaning: currentItem.meaning || storedItem.meaning || '',
            note: currentItem.note || storedItem.note || '',
            options: Array.isArray(currentItem.options) ? [...currentItem.options] : storedItem.options,
            correct: Number.isInteger(currentItem.correct) ? currentItem.correct : storedItem.correct,
            audioFile: currentItem.audioFile || '',
            answerAudioFile: currentItem.answerAudioFile || storedItem.answerAudioFile || '',
            category: storedItem.category || currentItem.category || '',
            section: storedItem.section || currentItem.section || '',
            learningLanguage: currentItem.learningLanguage || storedItem.learningLanguage || '',
            interfaceLanguage: currentItem.interfaceLanguage || storedItem.interfaceLanguage || '',
            isGlobalData: Boolean(currentItem.isGlobalData || storedItem.isGlobalData)
        };
    };
})();

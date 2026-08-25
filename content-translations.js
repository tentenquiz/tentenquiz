(function registerTentenContentTranslations(root) {
    'use strict';

    const s = (title, html) => ({ title, html });
    const page = (metaTitle, description, title, kicker, intro, sections) => ({
        metaTitle,
        description,
        title,
        kicker,
        intro,
        sections
    });

    const common = {
        en: { home: 'Home', about: 'About', guide: 'Learning guide', contact: 'Help & contact', privacy: 'Privacy policy', terms: 'Terms of service', backToQuiz: 'Back to quiz', brandHomeLabel: 'Go to TentenQuiz home', navigationLabel: 'Site information', languageLabel: 'Page language', privacyCookieSettings: 'Privacy & cookie settings' },
        ko: { home: '홈', about: '사이트 소개', guide: '학습 안내', contact: '문의·도움말', privacy: '개인정보처리방침', terms: '이용약관', backToQuiz: '퀴즈로 돌아가기', brandHomeLabel: 'TentenQuiz 홈으로 이동', navigationLabel: '사이트 안내', languageLabel: '페이지 언어', privacyCookieSettings: '개인정보·쿠키 설정' },
        ja: { home: 'ホーム', about: 'サイトについて', guide: '学習ガイド', contact: 'お問い合わせ・ヘルプ', privacy: 'プライバシーポリシー', terms: '利用規約', backToQuiz: 'クイズに戻る', brandHomeLabel: 'TentenQuiz ホームへ', navigationLabel: 'サイト案内', languageLabel: 'ページの言語', privacyCookieSettings: 'プライバシーとCookieの設定' },
        'zh-CN': { home: '首页', about: '网站介绍', guide: '学习指南', contact: '帮助与联系', privacy: '隐私政策', terms: '服务条款', backToQuiz: '返回测验', brandHomeLabel: '前往 TentenQuiz 首页', navigationLabel: '网站信息', languageLabel: '页面语言', privacyCookieSettings: '隐私和 Cookie 设置' },
        'zh-TW': { home: '首頁', about: '網站介紹', guide: '學習指南', contact: '說明與聯絡', privacy: '隱私權政策', terms: '服務條款', backToQuiz: '返回測驗', brandHomeLabel: '前往 TentenQuiz 首頁', navigationLabel: '網站資訊', languageLabel: '頁面語言', privacyCookieSettings: '隱私權與 Cookie 設定' },
        fr: { home: 'Accueil', about: 'À propos', guide: 'Guide d’apprentissage', contact: 'Aide et contact', privacy: 'Confidentialité', terms: 'Conditions d’utilisation', backToQuiz: 'Retour au quiz', brandHomeLabel: 'Aller à l’accueil TentenQuiz', navigationLabel: 'Informations du site', languageLabel: 'Langue de la page', privacyCookieSettings: 'Paramètres de confidentialité et des cookies' },
        de: { home: 'Startseite', about: 'Über uns', guide: 'Lernanleitung', contact: 'Hilfe & Kontakt', privacy: 'Datenschutz', terms: 'Nutzungsbedingungen', backToQuiz: 'Zurück zum Quiz', brandHomeLabel: 'Zur TentenQuiz-Startseite', navigationLabel: 'Website-Informationen', languageLabel: 'Seitensprache', privacyCookieSettings: 'Datenschutz- und Cookie-Einstellungen' },
        es: { home: 'Inicio', about: 'Acerca de', guide: 'Guía de aprendizaje', contact: 'Ayuda y contacto', privacy: 'Privacidad', terms: 'Términos de servicio', backToQuiz: 'Volver al quiz', brandHomeLabel: 'Ir al inicio de TentenQuiz', navigationLabel: 'Información del sitio', languageLabel: 'Idioma de la página', privacyCookieSettings: 'Configuración de privacidad y cookies' },
        vi: { home: 'Trang chủ', about: 'Giới thiệu', guide: 'Hướng dẫn học', contact: 'Trợ giúp & liên hệ', privacy: 'Quyền riêng tư', terms: 'Điều khoản sử dụng', backToQuiz: 'Quay lại câu đố', brandHomeLabel: 'Đến trang chủ TentenQuiz', navigationLabel: 'Thông tin trang web', languageLabel: 'Ngôn ngữ trang', privacyCookieSettings: 'Cài đặt quyền riêng tư và cookie' },
        ar: { home: 'الرئيسية', about: 'حول الموقع', guide: 'دليل التعلّم', contact: 'المساعدة والتواصل', privacy: 'سياسة الخصوصية', terms: 'شروط الاستخدام', backToQuiz: 'العودة إلى الاختبار', brandHomeLabel: 'الانتقال إلى صفحة TentenQuiz الرئيسية', navigationLabel: 'معلومات الموقع', languageLabel: 'لغة الصفحة', privacyCookieSettings: 'إعدادات الخصوصية وملفات تعريف الارتباط' },
        it: { home: 'Home', about: 'Informazioni', guide: 'Guida allo studio', contact: 'Aiuto e contatti', privacy: 'Privacy', terms: 'Termini di servizio', backToQuiz: 'Torna al quiz', brandHomeLabel: 'Vai alla home di TentenQuiz', navigationLabel: 'Informazioni sul sito', languageLabel: 'Lingua della pagina', privacyCookieSettings: 'Impostazioni privacy e cookie' },
        ru: { home: 'Главная', about: 'О сайте', guide: 'Руководство', contact: 'Помощь и контакты', privacy: 'Конфиденциальность', terms: 'Условия использования', backToQuiz: 'Вернуться к тесту', brandHomeLabel: 'На главную TentenQuiz', navigationLabel: 'Информация о сайте', languageLabel: 'Язык страницы', privacyCookieSettings: 'Настройки конфиденциальности и файлов cookie' }
    };

    const languageNames = [
        { code: 'en', name: 'English' },
        { code: 'ko', name: '한국어' },
        { code: 'ja', name: '日本語' },
        { code: 'zh-CN', name: '简体中文' },
        { code: 'zh-TW', name: '繁體中文' },
        { code: 'fr', name: 'Français' },
        { code: 'de', name: 'Deutsch' },
        { code: 'es', name: 'Español' },
        { code: 'vi', name: 'Tiếng Việt' },
        { code: 'ar', name: 'العربية' },
        { code: 'it', name: 'Italiano' },
        { code: 'ru', name: 'Русский' }
    ];

    const pages = {
        en: {
            about: page(
                'About | TentenQuiz',
                'Learn what TentenQuiz offers: 2,500 everyday concepts in 12 languages, short quizzes, review tools, and account-free progress storage.',
                'About TentenQuiz',
                'Last updated: August 20, 2026',
                'TentenQuiz is a free web learning service for practising everyday vocabulary in 12 languages through short, repeatable quizzes. Choose your own language and a language to learn, with no account required.',
                [
                    s('1. What kind of service is it?', `<p>TentenQuiz focuses on recalling words briefly and often. Each round contains 10 questions with 10 seconds per question, helping learners connect a word with its meaning in small, manageable sessions.</p><p>It supports English, Korean, Japanese, Simplified Chinese, Traditional Chinese, French, German, Spanish, Vietnamese, Arabic, Italian, and Russian. Your own language and learning language cannot be the same, and records for different language pairs stay separate.</p>`),
                    s('2. What can I learn?', `<p class="legal-highlight"><strong>2,500 core everyday concepts</strong> are available across all 12 languages. They are arranged into 10 stages and 10 practical topics rather than shown as an unstructured list.</p><ul><li>10 topics covering nature, people, health, food, home, activities, places, school, shopping, and time</li><li>10 stages that move from familiar words to less frequent but useful vocabulary</li><li>25 words for every topic in each stage</li><li>Pronunciation audio that connects spelling and sound</li></ul>`),
                    s('3. How does learning work?', `<ul><li>Complete up to 10 questions in a normal quiz round.</li><li>Use <strong>Practice missed questions</strong> to solve missed or timed-out questions again.</li><li>Add important words to <strong>My wordbook</strong> and repeat them until you choose to stop.</li><li>See the correct answer immediately after a wrong choice or timeout.</li><li>Receive a small celebration after completing all 25 words in a topic and a perfect-score celebration after 10 correct answers.</li></ul>`),
                    s('4. How is the vocabulary prepared?', `<p>We favour common everyday words that learners around ages 13–15 can understand and picture. Highly specialised terms, narrowly regional expressions, forced translations, and unnecessary duplicates are excluded where possible.</p><p>We systematically check that each concept aligns across 12 languages and that spelling, reading, and audio paths are present. Language varies by region and context, so we welcome reports of unnatural translations or pronunciation.</p>`),
                    s('5. How is progress kept without an account?', `<p>Language settings, progress, wrong answers, and wordbook entries are first stored automatically in your browser. No name, phone number, or email account is needed.</p><p>When you complete a set of 25 topic questions for the first time, the browser can encrypt your current records and create a secure cloud backup. A recovery code lets you restore them on another device; the recovery code itself is not sent to the server. See the <a href="privacy.html">Privacy policy</a> for details.</p>`),
                    s('6. How is the free service supported?', `<p>Core learning features are free. TentenQuiz may use advertising services such as Google AdSense to help cover hosting and content-improvement costs. Ads are kept visually separate from answers and learning controls.</p>`),
                    s('7. Questions and feedback', `<p>For translation, pronunciation, technical, or accessibility issues, follow the instructions on the <a href="contact.html">Help & contact</a> page.</p><p class="legal-contact"><strong>TentenQuiz operator</strong><br><strong>Email:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            guide: page(
                'Learning guide | TentenQuiz',
                'How to use stages, topic quizzes, Practice missed questions, My wordbook, audio, and encrypted progress backups in TentenQuiz.',
                'TentenQuiz Learning Guide',
                'Step-by-step instructions for new learners',
                'TentenQuiz trains quick recall: answer within 10 seconds, solve missed questions again, and repeat chosen words in your wordbook. This guide explains the full path from language selection to progress recovery.',
                [
                    s('1. Quick start', `<ol><li>Choose <strong>My language</strong>, which is used for meanings and interface text.</li><li>Choose the language you want to learn.</li><li>Select a stage that matches your level.</li><li>Select an everyday topic.</li><li>Listen or read, then choose the correct meaning from four options within 10 seconds.</li></ol><p class="legal-highlight"><strong>New learner tip:</strong> begin with one topic in Stage 1, complete a 10-question round, and review the wrong answers before continuing.</p>`),
                    s('2. Stages and topics', `<p>The learning map contains <strong>10 stages × 10 topics × 25 words</strong>: 250 concepts per stage and 2,500 in total.</p><ul><li>Nature / Weather</li><li>People / Relationships</li><li>Body / Health</li><li>Food / Drink</li><li>Home / Daily life</li><li>Activities / Leisure</li><li>Places / Transport</li><li>School / Work</li><li>Shopping / Money</li><li>Time / Calendar</li></ul><p>A <strong>stage</strong> marks the learning order; a <strong>topic</strong> groups words by everyday situation. Topics within the same stage may be studied in any order and keep separate progress.</p>`),
                    s('3. The 10-second, 10-question quiz', `<p>A normal round presents up to 10 words in random order. Use the speaker to hear the learning-language pronunciation again. A correct answer advances quickly. A wrong answer or timeout reveals the correct meaning and adds the word to that stage’s wrong-answer list.</p><p>After all 25 words in a topic have been attempted, its button shows completion and a small celebration. A 10/10 round starts the perfect-score celebration.</p>`),
                    s('4. Practice missed questions', `<ol><li>Wrong and timed-out questions are saved automatically.</li><li>Open <strong>Practice missed questions</strong> from the current stage.</li><li>Answer correctly to remove a word from the list.</li><li>If it is missed again, it remains available for another review.</li></ol><p>Try bringing the counter back to zero before moving far into new material.</p>`),
                    s('5. My wordbook', `<p>Add any word you want to remember from the results screen. Wordbook questions reshuffle and repeat until you stop the session. On a wrong answer or timeout, the answer still pops up and is spoken once in your own language before the next question.</p><p>Wordbooks are separated by your language, learning language, and stage. For example, Japanese-to-Chinese entries do not mix with Korean-to-Chinese entries.</p>`),
                    s('6. A practical review routine', `<ol><li>Answer 10 new questions.</li><li>Clear the wrong-answer list immediately.</li><li>Add confusing or important words to your wordbook.</li><li>Finish all 25 words in the topic.</li><li>Repeat your wordbook briefly the next day.</li></ol><p>Regular short returns matter more than finishing an entire stage in one sitting.</p>`),
                    s('7. Saving and restoring progress', `<p>Settings, progress, wrong answers, and wordbook entries are stored automatically in the current browser. When a 25-word topic is completed for the first time, an encrypted cloud backup is also created. Keep the recovery code private so you can load your records on another device.</p><ul><li>Never share the recovery code.</li><li>Without both the old device and the code, the operator cannot locate your anonymous backup.</li><li>Take extra care when using a shared computer.</li></ul>`),
                    s('8. Frequently asked questions', `<h3>Can I mix topics within one stage?</h3><p>Yes. Each topic tracks its own 25 words.</p><h3>Do records mix when I switch languages?</h3><p>No. They are separated by your language, learning language, and stage.</p><h3>Does a wrong answer count toward topic progress?</h3><p>Progress shows that a word was attempted. Missed words remain in Practice missed questions for mastery review.</p><h3>What if audio is silent?</h3><p>Check media volume and browser site-mute settings. Some browsers require one screen tap before the first sound.</p><h3>Can I install it like an app?</h3><p>On supported browsers, use the small install prompt. Once installed, open TentenQuiz from its desktop shortcut or Home Screen icon.</p>`),
                    s('9. Need more help?', `<p>For a spelling, translation, pronunciation, recovery, or accessibility issue, see <a href="contact.html">Help & contact</a>. Include your device, browser, own language, and learning language when reporting a technical problem.</p><p class="legal-contact"><strong>Email:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            contact: page(
                'Help & contact | TentenQuiz',
                'Get help with TentenQuiz translations, pronunciation, technical issues, learning records, accessibility, and policies.',
                'Help & Contact',
                'Tell us when something makes learning difficult.',
                'Check the quick help below if a translation or pronunciation seems wrong, a feature does not work as expected, or you have questions about saved learning records. Unresolved issues can be sent by email.',
                [
                    s('Email support', `<p class="legal-contact"><strong>Email:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a><br>Use a subject such as <strong>[Pronunciation]</strong>, <strong>[Translation]</strong>, <strong>[Technical issue]</strong>, or <strong>[Learning records]</strong>.</p>`),
                    s('1. Quick checks before contacting us', `<ul><li>Refresh once after checking the Internet connection.</li><li>For silent audio, check media volume, site mute, and the in-app sound setting.</li><li>If records look different, confirm your current own language, learning language, and stage.</li><li>The install prompt is hidden on a device where TentenQuiz is already installed.</li><li>See the <a href="guide.html">Learning guide</a> for stages, review tools, and recovery.</li></ul>`),
                    s('2. What can I report?', `<ul><li><strong>Translation:</strong> word, language pair, displayed meaning, and suggested wording</li><li><strong>Pronunciation:</strong> word, learning language, stage/topic, and whether audio is missing, clipped, or wrong</li><li><strong>Technical issue:</strong> device, operating system, browser, steps, and screenshot if useful</li><li><strong>Learning records:</strong> language pair, stage, feature, and the message shown</li><li><strong>Accessibility:</strong> assistive technology and the difficult screen or control</li><li><strong>Advertising or policy:</strong> screen, time, country, and a privacy-safe screenshot if possible</li></ul>`),
                    s('3. How to describe a technical problem', `<ol><li>Name the screen where it happened.</li><li>List the actions immediately before the problem.</li><li>Separate what you expected from what actually happened.</li><li>Include device and browser names.</li><li>Hide recovery codes and personal information in screenshots.</li></ol>`),
                    s('4. Information you must not send', `<p class="legal-highlight"><strong>Never email your full recovery code.</strong> It is the secret key to your encrypted learning records. The operator will not ask for that code, an account password, payment data, or identification.</p><p>Do not send government ID numbers, card details, passwords, or unnecessary addresses and phone numbers. Learners under 13 should ask a parent or guardian to handle any message containing personal information.</p>`),
                    s('5. Common help questions', `<h3>Can the operator find a lost recovery code?</h3><p>No. There is no member account and the code is not sent to the server.</p><h3>Can deleted browser data be restored?</h3><p>Only if a cloud backup was created and you still have its recovery code.</p><h3>Do multiple language records mix?</h3><p>No. Select the same own language, learning language, and stage used before.</p><h3>Will every message receive a reply?</h3><p>Reports are reviewed for service improvement, but duplicate, promotional, or insufficiently detailed messages may not receive an individual response.</p>`),
                    s('6. How inquiry information is handled', `<p>Your sender address and message may be processed to reply and troubleshoot. See the <a href="privacy.html">Privacy policy</a> for purpose and retention details.</p><p class="legal-contact"><strong>TentenQuiz operator</strong><br><strong>Email:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            privacy: page(
                'Privacy policy | TentenQuiz',
                'How TentenQuiz handles local learning records, encrypted backups, cookies, Google AdSense, inquiries, and children’s privacy.',
                'Privacy Policy',
                'Effective: August 19, 2026',
                'The TentenQuiz operator values privacy and works to follow applicable law and Google publisher policies. This policy explains how information is handled on the TentenQuiz website and related services.',
                [
                    s('1. Information handled', `<p>No registration is required, and the service is not designed to directly collect your name, phone number, or address.</p><ul><li><strong>On-device data:</strong> language and reading settings, progress, wrong answers, and wordbook entries may be stored in local storage or IndexedDB.</li><li><strong>Milestone cloud backup:</strong> after you first complete 25 questions in a stage topic, current settings and records are encrypted in the browser and sent as ciphertext. The server may handle a random backup ID, ciphertext, time, size, and integrity value. The recovery code and unencrypted records are not sent.</li><li><strong>Automatically generated data:</strong> hosting, security, and advertising providers may process IP address, browser/device data, access time, activity, cookies, beacons, and advertising identifiers.</li><li><strong>Inquiry data:</strong> an email address and message are processed when you contact support.</li></ul>`),
                    s('2. Purposes', `<p>Information may be used to provide the service, retain settings, back up and restore learning records, fix errors, maintain security, answer inquiries, understand service use, serve ads, and measure advertising performance.</p>`),
                    s('3. Cookies and Google AdSense', `<p>The service may use cookies or similar storage for settings and improvement and may use Google AdSense for advertising. Google and other third-party vendors may use cookies to serve ads based on prior visits to TentenQuiz or other websites. Google’s advertising cookies allow Google and its partners to show personalised ads based on visits to this and other sites.</p><p>Manage personalised ads at <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">Google Ads Settings</a> or participating vendors at <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">AboutAds</a>. Learn how Google uses partner-site information at <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">Google’s partner-sites policy</a>.</p><p>Blocking cookies or browser storage may prevent language settings, progress, wrong answers, or wordbooks from being retained.</p>`),
                    s('4. Retention and deletion', `<ul><li>On-device data remains until you remove it through the browser or service.</li><li>Encrypted cloud backups may remain until deleted through the service or the backup service ends. Without a recovery code, the operator cannot identify a backup by name or email.</li><li>Inquiry emails are kept as needed for support and disputes, or longer where law requires.</li><li>Hosting, security, and advertising providers follow their own retention policies and applicable law.</li></ul>`),
                    s('5. External services and international processing', `<p>Google Firebase and other providers may support hosting, security, performance, advertising, and encrypted backup. Ciphertext, cookie identifiers, IP address, device/browser data, and access or ad interactions may be processed on servers outside your country under provider policies and law.</p><p>Where consent is required in the EEA, United Kingdom, Switzerland, or other regions, choices are provided through a consent management platform in line with applicable rules and Google policy.</p>`),
                    s('6. Children’s privacy', `<p>TentenQuiz is an educational service for a broad audience but does not intentionally collect personal information from children under 13. Such learners should not send personal information directly and should ask a parent or guardian for help. If unauthorised collection is discovered, reasonable steps will be taken to delete it.</p><p>The operator does not intend to create personalised-ad profiles based on activity known to belong to a child under 13 and applies age-related treatment where required.</p>`),
                    s('7. Your choices and rights', `<p>You can view or delete on-device data through browser or service controls, manage encrypted backups with a recovery code, and change cookie and personalised-ad settings. Because backups are not linked to a member account, only a person with the recovery code can restore or delete one. Contact us to request access, correction, or deletion of inquiry data held by the operator.</p>`),
                    s('8. Security', `<p>Reasonable measures include protected transmission, browser-side encryption, hard-to-guess recovery codes, and database access rules. No Internet transmission or electronic storage method can be guaranteed absolutely secure.</p>`),
                    s('9. Policy changes', `<p>This policy may change when the service, law, or relevant policies change. Important revisions will be announced in the service or through an updated effective date.</p>`),
                    s('10. Contact', `<p class="legal-contact"><strong>Privacy contact:</strong> TentenQuiz operator<br><strong>Email:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            terms: page(
                'Terms of service | TentenQuiz',
                'Terms governing use of the TentenQuiz language-learning service, content, learning records, advertising, and responsibilities.',
                'Terms of Service',
                'Effective: August 19, 2026',
                'These terms govern use of the TentenQuiz website and related services provided by the TentenQuiz operator. By using the service, you agree to these terms and the Privacy policy.',
                [
                    s('1. Purpose of the service', `<p>TentenQuiz is a broad-audience educational service for learning everyday vocabulary through short quizzes, wrong-answer review, and a personal wordbook. Materials support general language study and do not guarantee an examination score or particular outcome.</p>`),
                    s('2. Using the service', `<p>You may use the service for personal learning in compliance with law and these terms. Core quizzes require no account. Settings and records may be stored in your browser; completing a 25-question topic for the first time may create an encrypted cloud backup that can be restored with a recovery code.</p><p>Users under 13 should ask a guardian for help when personal information or an external service is involved.</p>`),
                    s('3. User responsibilities', `<p>You must not disrupt operation, bypass security, distribute malware, make excessive automated requests, scrape or redistribute content at scale, infringe rights, generate invalid ad interactions, or use the service unlawfully.</p>`),
                    s('4. Content and intellectual property', `<p>Rights in service design, arrangement, compiled data, explanations, and operator-created content belong to the operator or lawful owners. No claim is made over individual words or general facts. Permission is required for copying, reselling, redistributing, or building a separate database beyond personal learning.</p>`),
                    s('5. Advertising and external services', `<p>The service may display Google AdSense or other third-party advertising to support operating costs. Cookies may be used as explained in the <a href="privacy.html">Privacy policy</a>. External links and services follow their providers’ terms; the operator does not guarantee content or results supplied by third parties.</p>`),
                    s('6. Changes and interruption', `<p>Content or functions may be changed or temporarily suspended for improvement, maintenance, security, or unavoidable operational reasons. Material changes will be announced where reasonably possible.</p>`),
                    s('7. Learning information and limits of responsibility', `<p>Reasonable efforts are made to provide accurate, natural material, but regional, contextual, or technical errors may occur. Do not use the service as the sole basis for professional translation or medical, legal, financial, or official documents.</p><p>You are responsible for keeping the recovery code secret. Without both the old device and code, anonymous backups cannot be found through a name or email. To the extent permitted by law, the operator is not liable for loss caused by disasters, communications failures, device/browser settings, third parties, or a user’s violation of these terms, except where liability cannot lawfully be excluded.</p>`),
                    s('8. Restrictions', `<p>Use may be restricted when a user violates these terms or law, or threatens service safety and operation. Reasons and a way to object will be provided where appropriate unless urgent security concerns prevent it.</p>`),
                    s('9. Changes to these terms', `<p>Terms may be revised for changes in the service, law, or policy. Important revisions are announced in the service or by changing the effective date. Continued use after the effective date constitutes acceptance.</p>`),
                    s('10. Governing law and disputes', `<p>These terms are interpreted under the laws of the Republic of Korea. The parties will first try to resolve disputes through discussion; unresolved matters are handled by the competent courts under Korean law. Mandatory laws in a user’s place of residence remain applicable where required.</p>`),
                    s('11. Contact', `<p class="legal-contact"><strong>TentenQuiz operator</strong><br><strong>Email:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            )
        },
        ja: {
            about: page(
                'サイトについて | テンテンクイズ',
                '12言語・2,500の生活語彙、短いクイズ、復習機能、登録不要の学習記録保存について紹介します。',
                'TentenQuizについて',
                '最終更新：2026年8月20日',
                'TentenQuizは、12言語の生活語彙を短く繰り返すクイズで学べる無料のウェブ学習サービスです。自分の言語と学習言語を選び、登録せずに自分のペースで進められます。',
                [
                    s('1. どのようなサービスですか？', `<p>単語を長時間眺めるのではなく、短時間で思い出し、何度も繰り返すことを重視しています。1回10問、1問10秒なので、小さな学習単位で単語と意味を素早く結び付けます。</p><p>英語・韓国語・日本語・簡体字中国語・繁体字中国語・フランス語・ドイツ語・スペイン語・ベトナム語・アラビア語・イタリア語・ロシア語に対応します。自分の言語と学習言語が同じになることはなく、言語の組み合わせごとに記録を分けます。</p>`),
                    s('2. 何を学べますか？', `<p class="legal-highlight"><strong>2,500の基本的な生活概念</strong>を12言語で提供します。語彙は10段階・10の生活テーマに整理されています。</p><ul><li>自然、人、健康、食事、家、活動、場所、学校、買い物、時間の10テーマ</li><li>身近な語から、頻度は少し低くても役立つ語へ進む10段階</li><li>各段階・各テーマ25語</li><li>文字と音を結ぶ発音音声</li></ul>`),
                    s('3. どのように学びますか？', `<ul><li>通常クイズは最大10問です。</li><li>間違い・時間切れの問題は「間違いをクリア」で再挑戦します。</li><li>覚えたい語は「マイ単語帳」に追加し、終了するまで繰り返せます。</li><li>不正解時には正解がすぐ画面に表示されます。</li><li>テーマ25問の完了時と10問全問正解時に達成演出があります。</li></ul>`),
                    s('4. 語彙と翻訳の方針', `<p>13～15歳程度でも理解し、場面を想像しやすい共通生活語を中心に選びます。専門性が高い語、限定的な地域表現、無理な訳、不要な重複はできるだけ除きます。</p><p>概念が12言語で対応しているか、表記・読み・音声の参照が欠けていないかを体系的に確認します。地域や文脈による違いがあるため、不自然な訳や発音の報告も受け付けています。</p>`),
                    s('5. 登録せずに記録を保存する方法', `<p>言語設定、進捗、間違い、単語帳はまずブラウザに自動保存されます。氏名・電話番号・メールアカウントは必要ありません。</p><p>テーマ25問を初めて完了すると、ブラウザが現在の記録を暗号化し、安全なクラウドバックアップを作成できます。復旧コードを使えば別の端末で読み込めますが、コード自体はサーバーに送信されません。詳しくは<a href="privacy.html">プライバシーポリシー</a>をご覧ください。</p>`),
                    s('6. 無料サービスの運営', `<p>中心となる学習機能は無料です。ホスティングや教材改善の費用を支えるため、Google AdSenseなどの広告を使用する場合があります。広告は正解や操作ボタンと誤認しないよう学習領域と分けます。</p>`),
                    s('7. お問い合わせ', `<p>翻訳・発音・機能・アクセシビリティの問題は、<a href="contact.html">お問い合わせ・ヘルプ</a>の案内をご確認ください。</p><p class="legal-contact"><strong>TentenQuiz運営者</strong><br><strong>メール：</strong><a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            guide: page(
                '学習ガイド | テンテンクイズ',
                '段階、テーマ別クイズ、間違いをクリア、マイ単語帳、音声、暗号化バックアップの使い方を案内します。',
                'TentenQuiz 学習ガイド',
                '初めて使う方のための手順',
                'TentenQuizでは、10秒以内に意味を思い出し、間違えた問題を解き直し、選んだ単語を単語帳で繰り返します。言語選択から記録復旧までの使い方を説明します。',
                [
                    s('1. すぐに始める', `<ol><li>意味と画面表示に使う<strong>自分の言語</strong>を選びます。</li><li>学びたい言語を選びます。</li><li>自分に合う段階を選びます。</li><li>生活テーマを選びます。</li><li>発音を聞くか文字を読み、10秒以内に4つの選択肢から意味を選びます。</li></ol><p class="legal-highlight"><strong>初めての場合：</strong>段階1のテーマを一つ選び、10問を解いた後、次へ進む前に間違いを復習してください。</p>`),
                    s('2. 段階とテーマ', `<p>全体は<strong>10段階 × 10テーマ × 25語</strong>で、1段階250語、合計2,500概念です。</p><ul><li>自然・天気</li><li>人・関係</li><li>体・健康</li><li>食べ物・飲み物</li><li>家・生活</li><li>活動・余暇</li><li>場所・交通</li><li>学校・仕事</li><li>買い物・お金</li><li>時間・暦</li></ul><p><strong>段階</strong>は学習順序、<strong>テーマ</strong>は生活場面を表します。同じ段階のテーマは自由な順序で学べ、進捗は別々に記録されます。</p>`),
                    s('3. 10秒・10問クイズ', `<p>通常の1回は最大10問がランダムに出ます。スピーカーで学習言語の発音を聞き直せます。正解するとすぐ次へ進み、不正解または時間切れでは正解が表示され、その段階の間違い一覧に保存されます。</p><p>テーマ25語をすべて解くと完了表示と小さな演出が出ます。10問全問正解では満点の演出が始まります。</p>`),
                    s('4. 間違いをクリア', `<ol><li>不正解と時間切れは自動保存されます。</li><li>現在の段階で「間違いをクリア」を開きます。</li><li>正解すると一覧から削除されます。</li><li>再び間違えた問題は次回の復習のため残ります。</li></ol><p>新しい範囲へ大きく進む前に、件数を0に戻すことをおすすめします。</p>`),
                    s('5. マイ単語帳', `<p>結果画面から覚えたい語を追加できます。単語帳は順番を変えながら、終了するまで繰り返します。不正解や時間切れでは正解が表示され、自分の言語で意味の音声を1回流してから次へ進みます。</p><p>単語帳は自分の言語・学習言語・段階ごとに分かれます。日本語で中国語を学んだ記録と、韓国語で中国語を学んだ記録は混ざりません。</p>`),
                    s('6. おすすめの復習手順', `<ol><li>新しい10問を解きます。</li><li>すぐに間違いをクリアします。</li><li>重要・紛らわしい語を単語帳に追加します。</li><li>同じテーマの25語を完了します。</li><li>翌日に単語帳を短く繰り返します。</li></ol><p>一度に一段階を終えることより、短時間でも定期的に戻ることが大切です。</p>`),
                    s('7. 記録の保存と復旧', `<p>設定、進捗、間違い、単語帳は現在のブラウザに自動保存されます。テーマ25語を初めて完了すると暗号化クラウドバックアップも作成されます。別端末で読み込めるよう、復旧コードを秘密に保管してください。</p><ul><li>復旧コードを共有しないでください。</li><li>元の端末とコードの両方を失うと、運営者は匿名バックアップを特定できません。</li><li>共有パソコンでは特に注意してください。</li></ul>`),
                    s('8. よくある質問', `<h3>同じ段階でテーマを混ぜてもよいですか？</h3><p>はい。各テーマの25語は別々に記録されます。</p><h3>言語を変えると記録が混ざりますか？</h3><p>いいえ。自分の言語・学習言語・段階で区分します。</p><h3>不正解もテーマ進捗に入りますか？</h3><p>進捗はその語を解いたことを示します。間違いは別に残るため、正解できるまで復習してください。</p><h3>音が出ない場合は？</h3><p>メディア音量とサイトのミュート設定を確認してください。最初の音声前に画面タップが必要なブラウザもあります。</p><h3>アプリのように設置できますか？</h3><p>対応ブラウザでは小さなインストール案内を使い、デスクトップのショートカットやホーム画面のアイコンから起動できます。</p>`),
                    s('9. さらにサポートが必要な場合', `<p>表記・翻訳・発音・復旧・アクセシビリティの問題は<a href="contact.html">お問い合わせ・ヘルプ</a>をご覧ください。技術的な報告には端末、ブラウザ、自分の言語、学習言語を含めてください。</p><p class="legal-contact"><strong>メール：</strong><a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            contact: page(
                'お問い合わせ・ヘルプ | テンテンクイズ',
                '翻訳、発音、機能、学習記録、アクセシビリティ、ポリシーに関するサポート案内です。',
                'お問い合わせ・ヘルプ',
                '学習を妨げる問題をお知らせください。',
                '翻訳や発音が不自然、機能が期待どおり動かない、記録保存が分からない場合は、まず以下をご確認ください。解決しない問題はメールで送れます。',
                [
                    s('メールで問い合わせる', `<p class="legal-contact"><strong>メール：</strong><a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a><br>件名の例：<strong>［発音］</strong>、<strong>［翻訳］</strong>、<strong>［機能エラー］</strong>、<strong>［学習記録］</strong></p>`),
                    s('1. 問い合わせ前の確認', `<ul><li>通信を確認し、ページを一度再読み込みします。</li><li>音が出ない場合は音量、サイトのミュート、アプリ内音声設定を確認します。</li><li>記録が違う場合は、自分の言語・学習言語・段階を確認します。</li><li>設置済みの端末ではインストール案内が隠れます。</li><li>段階、復習、復旧方法は<a href="guide.html">学習ガイド</a>をご覧ください。</li></ul>`),
                    s('2. 報告できる内容', `<ul><li><strong>翻訳：</strong>単語、言語の組み合わせ、表示された意味、提案</li><li><strong>発音：</strong>単語、学習言語、段階・テーマ、無音・途切れ・誤読の別</li><li><strong>機能：</strong>端末、OS、ブラウザ、操作手順、必要なら画面</li><li><strong>記録：</strong>言語の組み合わせ、段階、機能、表示メッセージ</li><li><strong>アクセシビリティ：</strong>支援機能と利用しにくい画面</li><li><strong>広告・ポリシー：</strong>画面、時刻、国、個人情報を隠した画像</li></ul>`),
                    s('3. 機能エラーの伝え方', `<ol><li>問題が起きた画面を書きます。</li><li>直前の操作を順番に書きます。</li><li>期待した結果と実際の結果を分けます。</li><li>端末とブラウザ名を含めます。</li><li>画像では復旧コードや個人情報を隠します。</li></ol>`),
                    s('4. 送ってはいけない情報', `<p class="legal-highlight"><strong>復旧コード全体をメールで送らないでください。</strong>暗号化された学習記録を開く秘密の鍵です。運営者はコード、アカウントのパスワード、支払情報、身分証を要求しません。</p><p>公的番号、カード情報、パスワード、不要な住所・電話番号も送らないでください。13歳未満の方は、個人情報を含む連絡を保護者に依頼してください。</p>`),
                    s('5. よくあるサポート質問', `<h3>失くした復旧コードを探してもらえますか？</h3><p>できません。会員情報がなく、コードもサーバーに送りません。</p><h3>削除したブラウザ記録を復旧できますか？</h3><p>クラウドバックアップがあり、復旧コードを保管している場合に限ります。</p><h3>複数言語の記録は混ざりますか？</h3><p>混ざりません。以前と同じ自分の言語・学習言語・段階を選んでください。</p><h3>すべてのメールに返信がありますか？</h3><p>改善のため確認しますが、重複・宣伝・情報不足の連絡には個別返信できない場合があります。</p>`),
                    s('6. 問い合わせ情報の取扱い', `<p>返信と問題解決のため、送信元アドレスと本文を処理する場合があります。目的と保存方針は<a href="privacy.html">プライバシーポリシー</a>をご覧ください。</p><p class="legal-contact"><strong>TentenQuiz運営者</strong><br><strong>メール：</strong><a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            privacy: page(
                'プライバシーポリシー | テンテンクイズ',
                '端末内学習記録、暗号化バックアップ、Cookie、Google AdSense、問い合わせ、子どものプライバシーについて説明します。',
                'プライバシーポリシー',
                '施行日：2026年8月19日',
                'TentenQuiz運営者は利用者のプライバシーを重視し、適用法令とGoogleパブリッシャーポリシーの遵守に努めます。本方針はウェブサイトと関連サービスにおける情報の取扱いを説明します。',
                [
                    s('1. 取り扱う情報', `<p>会員登録は不要で、氏名・電話番号・住所を直接収集する設計ではありません。</p><ul><li><strong>端末内情報：</strong>言語・読み設定、進捗、間違い、単語帳をLocal StorageまたはIndexedDBに保存する場合があります。</li><li><strong>達成時クラウドバックアップ：</strong>段階のテーマ25問を初めて完了すると、設定と記録をブラウザ内で暗号化して暗号文として送ります。サーバーは無作為ID、暗号文、時刻、容量、整合性値を扱う場合があります。復旧コードと平文記録は送信しません。</li><li><strong>自動生成情報：</strong>ホスティング・セキュリティ・広告提供者がIPアドレス、端末・ブラウザ、時刻、利用履歴、Cookie、ビーコン、広告識別子を処理する場合があります。</li><li><strong>問い合わせ：</strong>メール連絡時にアドレスと本文を処理します。</li></ul>`),
                    s('2. 利用目的', `<p>サービス提供、設定維持、記録のバックアップ・復旧、障害対応、安全確保、問い合わせ対応、利用状況把握、広告配信と効果測定に使用する場合があります。</p>`),
                    s('3. CookieとGoogle AdSense', `<p>設定維持や改善にCookie等を使い、広告にGoogle AdSenseを使用する場合があります。Googleを含む第三者配信事業者は、TentenQuizや他サイトへの過去の訪問に基づく広告を表示するためCookieを使用できます。Googleとパートナーは広告Cookieにより、本サイトや他サイトの訪問に基づくパーソナライズ広告を提供できます。</p><p><a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">Google広告設定</a>または<a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">AboutAds</a>で設定できます。パートナーサイト情報の利用は<a href="https://policies.google.com/technologies/partner-sites?hl=ja" target="_blank" rel="noopener noreferrer">Googleの案内</a>をご覧ください。</p><p>Cookieやブラウザ保存を制限すると、設定や進捗などが維持されない場合があります。</p>`),
                    s('4. 保存と削除', `<ul><li>端末内情報はブラウザまたはサービスで削除するまで保存されます。</li><li>暗号化バックアップは利用者が削除するかバックアップサービス終了まで保存される場合があります。コードがなければ氏名やメールで特定できません。</li><li>問い合わせメールは対応・紛争に必要な期間、または法令が求める期間保存します。</li><li>外部提供者は各方針と法令に従います。</li></ul>`),
                    s('5. 外部サービスと国外処理', `<p>Google Firebaseなどを広告、ホスティング、セキュリティ、性能、暗号化バックアップに利用する場合があります。暗号文、Cookie識別子、IP、端末・ブラウザ、接続・広告操作情報が国外サーバーで処理されることがあります。</p><p>EEA、英国、スイスなど同意が必要な地域では、法令とGoogle方針に従う同意管理プラットフォームで選択肢を提供します。</p>`),
                    s('6. 子どものプライバシー', `<p>幅広い年齢向けの教育サービスですが、13歳未満の個人情報を意図的に収集しません。13歳未満の方は個人情報を直接送らず、保護者に依頼してください。無断収集を知った場合は合理的な削除措置を取ります。</p><p>13歳未満と判明した利用者の行動に基づくパーソナライズ広告プロファイルを意図せず、必要な年齢処理を適用します。</p>`),
                    s('7. 利用者の選択と権利', `<p>ブラウザやサービス機能で端末情報を確認・削除し、復旧コードで暗号化バックアップを復旧・削除し、Cookieや広告設定を変更できます。バックアップは会員情報と結び付かないため、コード保持者だけが操作できます。運営者が持つ問い合わせ情報の開示・訂正・削除はメールで依頼できます。</p>`),
                    s('8. 安全管理', `<p>通信保護、ブラウザ内暗号化、推測しにくい復旧コード、データベース規則など合理的な措置を取りますが、インターネット送信や電子保存の絶対的安全は保証できません。</p>`),
                    s('9. 方針の変更', `<p>サービス、法令、関連方針の変更に応じて改定する場合があります。重要な変更はサービス内告知または施行日の更新で知らせます。</p>`),
                    s('10. お問い合わせ', `<p class="legal-contact"><strong>個人情報窓口：</strong>TentenQuiz運営者<br><strong>メール：</strong><a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            terms: page(
                '利用規約 | テンテンクイズ',
                'TentenQuizの利用条件、コンテンツ、学習記録、広告、利用者と運営者の責任を説明します。',
                '利用規約',
                '施行日：2026年8月19日',
                '本規約はTentenQuiz運営者が提供するウェブサイトと関連サービスの利用条件を定めます。利用により、本規約とプライバシーポリシーに同意したものとみなします。',
                [
                    s('1. サービスの目的', `<p>短いクイズ、間違い復習、個人単語帳で生活語彙を学ぶ幅広い年齢向け教育サービスです。一般的な語学学習を支援しますが、試験点数や特定成果を保証しません。</p>`),
                    s('2. サービスの利用', `<p>法令と規約の範囲で個人学習に利用できます。主要機能は登録不要で、設定と記録をブラウザに保存します。テーマ25問を初めて完了すると暗号化バックアップを作成し、復旧コードで別端末に読み込める場合があります。</p><p>13歳未満の方は個人情報や外部サービスに関わるとき保護者の助けを受けてください。</p>`),
                    s('3. 利用者の義務', `<p>運営妨害、セキュリティ回避、マルウェア、過度な自動要求、大量収集・再配布、権利侵害、不正な広告操作、違法利用をしてはいけません。</p>`),
                    s('4. コンテンツと知的財産', `<p>デザイン、構成、編集データ、説明、運営者制作物の権利は運営者または正当な権利者に帰属します。個々の単語や一般事実への権利は主張しません。個人学習を超える複製、再配布、販売、別データベース化には許可が必要です。</p>`),
                    s('5. 広告と外部サービス', `<p>運営費のためGoogle AdSense等の広告を表示し、<a href="privacy.html">プライバシーポリシー</a>に記載のCookieを使う場合があります。外部リンクや第三者サービスには提供者の条件が適用され、運営者はその内容や結果を保証しません。</p>`),
                    s('6. 変更と中断', `<p>改善、保守、セキュリティ、やむを得ない運営上の理由で内容や機能を変更・一時停止できます。重大な影響がある場合は可能な範囲で告知します。</p>`),
                    s('7. 学習情報と責任の範囲', `<p>正確で自然な教材に努めますが、地域・文脈・技術上の誤りがないとは保証しません。専門翻訳や医療・法律・金融・公文書の唯一の根拠にしないでください。</p><p>復旧コードは利用者が秘密に保管します。元端末とコードを失うと氏名やメールでは匿名バックアップを探せません。法令上排除できない場合を除き、災害、通信障害、端末設定、第三者、規約違反による損失について、故意・重過失がない限り責任を負いません。</p>`),
                    s('8. 利用制限', `<p>規約・法令違反または安全な運営への脅威がある場合、利用を制限できます。緊急の安全上の理由がない限り、必要に応じ理由と異議方法を案内します。</p>`),
                    s('9. 規約の変更', `<p>サービス、法令、方針の変更により改定できます。重要事項は告知または施行日更新で知らせ、施行後の継続利用は変更への同意とみなします。</p>`),
                    s('10. 準拠法と紛争', `<p>大韓民国法に従って解釈します。まず協議で解決を試み、未解決の場合は韓国法上の管轄裁判所で扱います。居住地の強行法規が必要な場合はそれに従います。</p>`),
                    s('11. お問い合わせ', `<p class="legal-contact"><strong>TentenQuiz運営者</strong><br><strong>メール：</strong><a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            )
        },
        'zh-CN': {
            about: page(
                '网站介绍 | TentenQuiz',
                '了解TentenQuiz提供的12种语言、2,500个生活词汇概念、短测验、复习功能和免注册学习记录保存。',
                '关于TentenQuiz',
                '最近更新：2026年8月20日',
                'TentenQuiz是一项免费的网页学习服务，通过简短、可重复的测验帮助用户学习12种语言的生活词汇。无需注册，只要选择自己的语言和学习语言，即可按自己的节奏学习。',
                [
                    s('1. 这是什么样的服务？', `<p>TentenQuiz重视短时间回想和反复练习，而不是长时间盯着单词。每轮10题、每题10秒，让学习者以较小的单位快速连接单词与含义。</p><p>支持英语、韩语、日语、简体中文、繁体中文、法语、德语、西班牙语、越南语、阿拉伯语、意大利语和俄语。自己的语言不能与学习语言相同，不同语言组合的记录也会分开保存。</p>`),
                    s('2. 可以学习什么？', `<p class="legal-highlight">提供12种语言的<strong>2,500个核心生活概念</strong>，并按照10个阶段和10个生活主题整理。</p><ul><li>自然、人物、健康、饮食、家庭、活动、地点、学校、购物和时间10个主题</li><li>从熟悉词汇扩展到较少见但仍实用词汇的10个阶段</li><li>每个阶段的每个主题25个词</li><li>用于连接文字和声音的发音音频</li></ul>`),
                    s('3. 如何学习？', `<ul><li>普通测验每轮最多10题。</li><li>在“清除错题”中重新解答答错或超时的问题。</li><li>把重要单词加入“我的单词本”，直到主动停止前持续循环。</li><li>答错或超时后立即显示正确答案。</li><li>完成主题25题和10题全对时会显示不同的庆祝效果。</li></ul>`),
                    s('4. 词汇与翻译标准', `<p>主要选用约13至15岁学习者能理解、容易联想到生活场景的通用词汇。尽量排除过于专业、地区性过强、翻译生硬或不必要重复的表达。</p><p>我们系统检查同一概念是否在12种语言中正确对应，以及拼写、读音和音频路径是否完整。语言会因地区和语境而不同，因此也欢迎报告不自然的翻译或发音。</p>`),
                    s('5. 不注册如何保存记录？', `<p>语言设置、进度、错题和单词本首先自动保存在浏览器中，不需要姓名、电话号码或邮箱账号。</p><p>首次完成某主题25题时，浏览器可以加密当前记录并创建安全的云端备份。恢复码可在其他设备上恢复记录，但恢复码本身不会发送到服务器。详情请查看<a href="privacy.html">隐私政策</a>。</p>`),
                    s('6. 免费服务如何运营？', `<p>核心学习功能免费提供。为了支持托管和内容改进成本，TentenQuiz可能使用Google AdSense等广告服务。广告会与答案和学习操作区明显分开。</p>`),
                    s('7. 问题与建议', `<p>如有翻译、发音、功能或无障碍问题，请先阅读<a href="contact.html">帮助与联系</a>页面。</p><p class="legal-contact"><strong>TentenQuiz运营者</strong><br><strong>邮箱：</strong><a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            guide: page(
                '学习指南 | TentenQuiz',
                '介绍TentenQuiz阶段、主题测验、清除错题、我的单词本、音频和加密学习记录备份的使用方法。',
                'TentenQuiz学习指南',
                '面向新学习者的分步说明',
                'TentenQuiz通过10秒内回想含义、重新解答错题、反复练习单词本来训练快速记忆。本指南说明从选择语言到恢复进度的完整流程。',
                [
                    s('1. 快速开始', `<ol><li>选择用于显示含义和界面的<strong>我的语言</strong>。</li><li>选择想学习的语言。</li><li>选择适合自己水平的阶段。</li><li>选择一个生活主题。</li><li>听发音或阅读单词，在10秒内从四个选项中选择正确含义。</li></ol><p class="legal-highlight"><strong>初次使用建议：</strong>先选择阶段1的一个主题，完成10题后先复习错题，再继续学习。</p>`),
                    s('2. 阶段与主题', `<p>学习地图由<strong>10个阶段 × 10个主题 × 25个词</strong>组成，每阶段250个概念，共2,500个。</p><ul><li>自然 / 天气</li><li>人物 / 关系</li><li>身体 / 健康</li><li>食物 / 饮料</li><li>家庭 / 生活</li><li>活动 / 休闲</li><li>地点 / 交通</li><li>学校 / 工作</li><li>购物 / 金钱</li><li>时间 / 日历</li></ul><p><strong>阶段</strong>表示学习顺序，<strong>主题</strong>表示生活场景。同一阶段的主题可按任意顺序学习，进度分别记录。</p>`),
                    s('3. 10秒、10题测验', `<p>普通一轮最多随机显示10题。可以按扬声器再次听学习语言发音。答对后快速进入下一题；答错或超时后显示正确含义，并把该词加入当前阶段的错题列表。</p><p>完成主题全部25个词后，按钮会显示完成状态和小型庆祝效果。10题全对则启动满分庆祝。</p>`),
                    s('4. 清除错题', `<ol><li>答错和超时的问题自动保存。</li><li>在当前阶段打开“清除错题”。</li><li>重新答对后，该词从列表删除。</li><li>再次答错则保留，供下次复习。</li></ol><p>建议在大量学习新内容之前，先把错题数量降到0。</p>`),
                    s('5. 我的单词本', `<p>可从结果页面加入任何想记住的单词。单词本会重新打乱并循环，直到你停止。答错或超时时，正确答案仍会弹出，并用自己的语言朗读一次含义后再进入下一题。</p><p>单词本按自己的语言、学习语言和阶段分开。例如，日语学习中文与韩语学习中文的记录不会混合。</p>`),
                    s('6. 推荐复习流程', `<ol><li>完成10道新题。</li><li>立即清除错题。</li><li>把易混淆或重要的词加入单词本。</li><li>完成同一主题的25个词。</li><li>第二天短时间重复单词本。</li></ol><p>定期进行短时间学习，比一次完成整个阶段更重要。</p>`),
                    s('7. 保存与恢复进度', `<p>设置、进度、错题和单词本会自动保存在当前浏览器。首次完成25词主题时，也会创建加密云端备份。请私密保管恢复码，以便在其他设备加载。</p><ul><li>不要分享恢复码。</li><li>如果旧设备和恢复码都丢失，运营者无法定位匿名备份。</li><li>使用公用电脑时要特别谨慎。</li></ul>`),
                    s('8. 常见问题', `<h3>同一阶段可以混合学习不同主题吗？</h3><p>可以。每个主题的25个词分别记录。</p><h3>切换语言后记录会混合吗？</h3><p>不会。记录按自己的语言、学习语言和阶段分开。</p><h3>答错也计入主题进度吗？</h3><p>进度表示已经尝试过该词。答错的词仍留在清除错题中，建议继续复习到答对。</p><h3>听不到声音怎么办？</h3><p>检查媒体音量和浏览器网站静音。有些浏览器首次播放前需要先点击页面。</p><h3>可以像应用一样安装吗？</h3><p>在支持的浏览器中使用小型安装提示，之后可通过桌面快捷方式或主屏幕图标启动。</p>`),
                    s('9. 需要更多帮助？', `<p>如遇拼写、翻译、发音、恢复或无障碍问题，请查看<a href="contact.html">帮助与联系</a>。报告技术问题时请注明设备、浏览器、自己的语言和学习语言。</p><p class="legal-contact"><strong>邮箱：</strong><a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            contact: page(
                '帮助与联系 | TentenQuiz',
                '获取有关TentenQuiz翻译、发音、功能、学习记录、无障碍和政策的帮助。',
                '帮助与联系',
                '遇到影响学习的问题时请告诉我们。',
                '如果翻译或发音不自然、功能未按预期运行，或对记录保存有疑问，请先检查以下内容。仍未解决的问题可通过邮件发送。',
                [
                    s('邮件联系', `<p class="legal-contact"><strong>邮箱：</strong><a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a><br>标题示例：<strong>[发音]</strong>、<strong>[翻译]</strong>、<strong>[功能错误]</strong>、<strong>[学习记录]</strong></p>`),
                    s('1. 联系前快速检查', `<ul><li>检查网络后刷新页面一次。</li><li>无声音时检查媒体音量、网站静音和应用内声音设置。</li><li>记录不同于预期时，确认自己的语言、学习语言和阶段。</li><li>已安装TentenQuiz的设备会自动隐藏安装提示。</li><li>阶段、复习和恢复方法请查看<a href="guide.html">学习指南</a>。</li></ul>`),
                    s('2. 可以报告哪些问题？', `<ul><li><strong>翻译：</strong>单词、语言组合、显示含义和建议表达</li><li><strong>发音：</strong>单词、学习语言、阶段/主题，以及无声、截断或读错</li><li><strong>功能：</strong>设备、系统、浏览器、操作步骤，必要时附截图</li><li><strong>记录：</strong>语言组合、阶段、功能和显示的提示</li><li><strong>无障碍：</strong>使用的辅助功能和难以操作的画面</li><li><strong>广告/政策：</strong>画面、时间、国家和已遮盖个人信息的截图</li></ul>`),
                    s('3. 如何说明功能错误', `<ol><li>写明发生问题的画面。</li><li>按顺序列出问题前的操作。</li><li>分别说明预期结果和实际结果。</li><li>写明设备和浏览器。</li><li>截图中遮住恢复码和个人信息。</li></ol>`),
                    s('4. 不能发送的信息', `<p class="legal-highlight"><strong>请勿通过邮件发送完整恢复码。</strong>它是打开加密学习记录的秘密钥匙。运营者不会索要恢复码、账号密码、支付信息或身份证件。</p><p>请勿发送身份证号码、银行卡资料、密码和非必要的地址或电话号码。13岁以下学习者如需发送可能含个人信息的邮件，应请监护人协助。</p>`),
                    s('5. 常见帮助问题', `<h3>运营者能找回丢失的恢复码吗？</h3><p>不能。服务没有会员账号，恢复码也不会发送到服务器。</p><h3>删除浏览器数据后能恢复吗？</h3><p>仅当已创建云端备份并仍持有恢复码时可以。</p><h3>多种语言的记录会混合吗？</h3><p>不会。请选择与之前相同的自己的语言、学习语言和阶段。</p><h3>每封邮件都会回复吗？</h3><p>报告会用于改进服务，但重复、推广或信息不足的邮件可能无法获得单独回复。</p>`),
                    s('6. 如何处理咨询信息', `<p>为回复和排查问题，可能处理发件地址和邮件内容。目的与保留规则请查看<a href="privacy.html">隐私政策</a>。</p><p class="legal-contact"><strong>TentenQuiz运营者</strong><br><strong>邮箱：</strong><a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            privacy: page(
                '隐私政策 | TentenQuiz',
                '说明TentenQuiz如何处理本地学习记录、加密备份、Cookie、Google AdSense、咨询和儿童隐私。',
                '隐私政策',
                '生效日期：2026年8月19日',
                'TentenQuiz运营者重视用户隐私，并努力遵守适用法律和Google发布商政策。本政策说明网站及相关服务如何处理信息。',
                [
                    s('1. 处理的信息', `<p>无需注册，服务并非为直接收集姓名、电话号码或地址而设计。</p><ul><li><strong>设备内数据：</strong>语言和读音设置、进度、错题及单词本可保存在Local Storage或IndexedDB。</li><li><strong>学习成果云端备份：</strong>首次完成某阶段主题25题后，设置和记录会先在浏览器加密，再以密文发送。服务器可能处理随机备份ID、密文、时间、大小和完整性值。恢复码和未加密记录不会发送。</li><li><strong>自动生成数据：</strong>托管、安全或广告服务商可能处理IP地址、设备/浏览器、访问时间、使用记录、Cookie、信标和广告标识符。</li><li><strong>咨询数据：</strong>发送邮件时会处理邮箱地址与内容。</li></ul>`),
                    s('2. 使用目的', `<p>信息可能用于提供服务、保留设置、备份与恢复、排除故障、维护安全、回复咨询、了解使用情况、投放广告及衡量广告效果。</p>`),
                    s('3. Cookie与Google AdSense', `<p>服务可能为保留设置和改进而使用Cookie等技术，并使用Google AdSense投放广告。Google等第三方供应商可使用Cookie，根据用户此前访问TentenQuiz或其他网站的情况投放广告。Google及其合作伙伴可依据对本网站和其他网站的访问提供个性化广告。</p><p>可在<a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">Google广告设置</a>或<a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">AboutAds</a>管理选项。Google如何使用合作伙伴网站信息请查看<a href="https://policies.google.com/technologies/partner-sites?hl=zh-CN" target="_blank" rel="noopener noreferrer">Google说明</a>。</p><p>限制Cookie或浏览器存储可能导致设置、进度、错题或单词本无法保留。</p>`),
                    s('4. 保留与删除', `<ul><li>设备内数据保留至用户通过浏览器或服务删除。</li><li>加密云端备份可能保留至用户删除或备份服务终止。没有恢复码时，运营者无法按姓名或邮箱查找。</li><li>咨询邮件会在支持、争议处理或法律要求的期限内保留。</li><li>托管、安全和广告服务商按各自政策及法律处理。</li></ul>`),
                    s('5. 外部服务与境外处理', `<p>Google Firebase等外部服务可能用于广告、托管、安全、性能和加密备份。密文、Cookie标识符、IP、设备/浏览器以及访问或广告互动信息可能在境外服务器处理。</p><p>在欧洲经济区、英国、瑞士等需要同意的地区，将依照适用规则和Google政策通过同意管理平台提供选择。</p>`),
                    s('6. 儿童隐私', `<p>TentenQuiz面向广泛年龄的学习者，但不会故意收集13岁以下儿童的个人信息。13岁以下用户不应直接发送个人信息，应请监护人协助。如发现未经授权的收集，将采取合理措施删除。</p><p>运营者无意根据已知属于13岁以下儿童的活动创建个性化广告资料，并在需要时应用年龄相关处理。</p>`),
                    s('7. 用户选择与权利', `<p>用户可通过浏览器或服务查看、删除设备内数据，用恢复码恢复或删除加密备份，并调整Cookie和个性化广告设置。备份不与会员账号关联，只有恢复码持有人可操作。可通过邮件要求访问、更正或删除运营者持有的咨询信息。</p>`),
                    s('8. 安全措施', `<p>采取传输保护、浏览器端加密、难以猜测的恢复码和数据库访问规则等合理措施，但无法保证互联网传输或电子存储绝对安全。</p>`),
                    s('9. 政策变更', `<p>服务、法律或相关政策变化时可能修订。重要变更将通过服务内通知或更新生效日期说明。</p>`),
                    s('10. 联系方式', `<p class="legal-contact"><strong>隐私联系人：</strong>TentenQuiz运营者<br><strong>邮箱：</strong><a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            terms: page(
                '服务条款 | TentenQuiz',
                '说明使用TentenQuiz语言学习服务、内容、学习记录、广告及相关责任的条件。',
                '服务条款',
                '生效日期：2026年8月19日',
                '本条款规定TentenQuiz运营者所提供网站及相关服务的使用条件。使用本服务即表示同意本条款与隐私政策。',
                [
                    s('1. 服务目的', `<p>TentenQuiz是一项面向广泛年龄的教育服务，通过短测验、错题复习和个人单词本学习生活词汇。资料仅用于一般语言学习，不保证考试分数或特定结果。</p>`),
                    s('2. 使用服务', `<p>用户可在遵守法律和本条款的范围内用于个人学习。核心测验无需注册，设置和记录可保存在浏览器。首次完成25题主题时可能创建加密云端备份，并可使用恢复码在其他设备恢复。</p><p>13岁以下用户在涉及个人信息或外部服务时应请监护人协助。</p>`),
                    s('3. 用户义务', `<p>不得干扰服务、绕过安全功能、传播恶意程序、进行过度自动请求、大规模抓取或再分发内容、侵犯权利、制造无效广告互动或违法使用。</p>`),
                    s('4. 内容与知识产权', `<p>服务设计、结构、汇编数据、说明和运营者制作内容的权利归运营者或合法权利人所有。我们不主张对单个词或一般事实的权利。超出个人学习的复制、出售、再分发或另建数据库需要许可。</p>`),
                    s('5. 广告与外部服务', `<p>为支持运营成本，服务可能显示Google AdSense等第三方广告，并按<a href="privacy.html">隐私政策</a>使用Cookie。外部链接和第三方服务适用各提供商条款，运营者不保证其内容或结果。</p>`),
                    s('6. 变更与中断', `<p>因改进、维护、安全或不可避免的运营原因，内容和功能可能变更或暂时中止。对用户有重大影响时，将在合理可行范围内通知。</p>`),
                    s('7. 学习信息与责任范围', `<p>我们努力提供准确自然的资料，但不能保证不存在地区、语境或技术错误。不得将本服务作为专业翻译或医疗、法律、金融、正式文件的唯一依据。</p><p>用户应私密保管恢复码。旧设备和恢复码都丢失后，无法凭姓名或邮箱查找匿名备份。除法律不得排除的责任外，运营者在无故意或重大过失时，不对灾害、通信故障、设备设置、第三方或用户违反条款造成的损失负责。</p>`),
                    s('8. 使用限制', `<p>用户违反条款、法律或威胁服务安全与正常运营时，可能限制使用。除紧急安全情形外，将在适当情况下说明理由和异议方式。</p>`),
                    s('9. 条款变更', `<p>可能因服务、法律或政策变化而修订。重要修改将通过服务通知或更新生效日期公布，生效后继续使用即视为同意。</p>`),
                    s('10. 适用法律与争议', `<p>本条款依大韩民国法律解释。双方首先协商解决争议，未解决时由韩国法律规定的有管辖权法院处理。用户居住地的强制性法律在必要时仍适用。</p>`),
                    s('11. 联系方式', `<p class="legal-contact"><strong>TentenQuiz运营者</strong><br><strong>邮箱：</strong><a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            )
        },
        'zh-TW': {
            about: page(
                '網站介紹 | TentenQuiz',
                '認識TentenQuiz的12種語言、2,500個生活詞彙概念、短測驗、複習功能與免註冊學習記錄保存。',
                '關於TentenQuiz',
                '最近更新：2026年8月20日',
                'TentenQuiz是免費的網頁學習服務，透過簡短而可重複的測驗學習12種語言的生活詞彙。無須註冊，只要選擇自己的語言與學習語言，就能依自己的步調前進。',
                [
                    s('1. 這是什麼樣的服務？', `<p>TentenQuiz重視短時間回想與反覆練習。每回合10題、每題10秒，讓學習者用小單位快速連結單字與意思。</p><p>支援英語、韓語、日語、簡體中文、繁體中文、法語、德語、西班牙語、越南語、阿拉伯語、義大利語與俄語。自己的語言不能與學習語言相同，不同語言組合的記錄也會分開。</p>`),
                    s('2. 可以學到什麼？', `<p class="legal-highlight">以12種語言提供<strong>2,500個核心生活概念</strong>，並整理為10個階段與10個生活主題。</p><ul><li>自然、人物、健康、飲食、家庭、活動、地點、學校、購物與時間10個主題</li><li>從熟悉詞彙進展到較少見但實用詞彙的10個階段</li><li>每個階段、每個主題25個詞</li><li>連結文字與聲音的發音音訊</li></ul>`),
                    s('3. 如何學習？', `<ul><li>普通測驗每回合最多10題。</li><li>用「清除錯題」重新作答答錯或逾時的題目。</li><li>把重要單字加入「我的單字本」，持續循環到主動停止。</li><li>答錯或逾時後立即顯示正確答案。</li><li>完成主題25題與10題全對時會有不同的慶祝效果。</li></ul>`),
                    s('4. 詞彙與翻譯原則', `<p>主要選擇約13至15歲學習者能理解並容易想像的生活詞彙。盡量排除過度專業、地區性太強、生硬翻譯與不必要重複。</p><p>我們系統性檢查概念在12種語言中是否正確對應，以及拼寫、讀音與音訊路徑是否完整。語言會因地區與語境而不同，因此也歡迎回報不自然的翻譯或發音。</p>`),
                    s('5. 不註冊如何保存記錄？', `<p>語言設定、進度、錯題與單字本會先自動儲存在瀏覽器，不需要姓名、電話或電子郵件帳號。</p><p>首次完成某主題25題時，瀏覽器可加密目前記錄並建立安全的雲端備份。復原碼可在其他裝置恢復記錄，但復原碼本身不會送到伺服器。詳情請看<a href="privacy.html">隱私權政策</a>。</p>`),
                    s('6. 免費服務如何營運？', `<p>核心學習功能免費。為支援主機與教材改善成本，可能使用Google AdSense等廣告服務。廣告會與答案及學習操作明確分開。</p>`),
                    s('7. 問題與建議', `<p>翻譯、發音、功能或無障礙問題請先閱讀<a href="contact.html">說明與聯絡</a>。</p><p class="legal-contact"><strong>TentenQuiz營運者</strong><br><strong>電子郵件：</strong><a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            guide: page(
                '學習指南 | TentenQuiz',
                '說明TentenQuiz階段、主題測驗、清除錯題、我的單字本、音訊與加密學習記錄備份。',
                'TentenQuiz學習指南',
                '給新學習者的逐步說明',
                'TentenQuiz透過10秒內回想意思、重做錯題、反覆練習單字本來訓練快速記憶。本指南說明從選擇語言到復原進度的完整流程。',
                [
                    s('1. 快速開始', `<ol><li>選擇用於顯示意思與介面的<strong>我的語言</strong>。</li><li>選擇想學習的語言。</li><li>選擇適合程度的階段。</li><li>選擇生活主題。</li><li>聆聽或閱讀單字，在10秒內從四個選項選出意思。</li></ol><p class="legal-highlight"><strong>第一次使用：</strong>先選階段1的一個主題，完成10題後先複習錯題再繼續。</p>`),
                    s('2. 階段與主題', `<p>學習地圖包含<strong>10個階段 × 10個主題 × 25個詞</strong>，每階段250個概念，共2,500個。</p><ul><li>自然 / 天氣</li><li>人物 / 關係</li><li>身體 / 健康</li><li>食物 / 飲料</li><li>家庭 / 生活</li><li>活動 / 休閒</li><li>地點 / 交通</li><li>學校 / 工作</li><li>購物 / 金錢</li><li>時間 / 日曆</li></ul><p><strong>階段</strong>表示學習順序，<strong>主題</strong>表示生活情境。同階段的主題可自由安排，進度分別記錄。</p>`),
                    s('3. 10秒、10題測驗', `<p>普通回合最多隨機出現10題。可按喇叭再次聽學習語言發音。答對後快速進入下一題；答錯或逾時時顯示正確意思，並將單字加入目前階段的錯題清單。</p><p>完成主題全部25個詞後，按鈕顯示完成狀態與小型慶祝效果。10題全對則啟動滿分慶祝。</p>`),
                    s('4. 清除錯題', `<ol><li>答錯與逾時的題目自動保存。</li><li>在目前階段開啟「清除錯題」。</li><li>重新答對後從清單移除。</li><li>再度答錯則保留，供下次複習。</li></ol><p>建議在大量進入新內容前先把錯題數降到0。</p>`),
                    s('5. 我的單字本', `<p>可從結果畫面加入任何想記住的詞。單字本會重新打亂並循環，直到你停止。答錯或逾時時，答案仍會彈出，並用自己的語言朗讀一次意思後再進入下一題。</p><p>單字本依自己的語言、學習語言與階段分開，例如日語學中文和韓語學中文不會混在一起。</p>`),
                    s('6. 建議複習流程', `<ol><li>完成10道新題。</li><li>立即清除錯題。</li><li>把易混淆或重要詞加入單字本。</li><li>完成同主題25個詞。</li><li>隔天短時間重複單字本。</li></ol><p>規律的短時間回訪，比一次完成整個階段更重要。</p>`),
                    s('7. 保存與復原進度', `<p>設定、進度、錯題與單字本會自動儲存在目前瀏覽器。首次完成25詞主題時也會建立加密雲端備份。請私密保管復原碼，以便在其他裝置載入。</p><ul><li>不要分享復原碼。</li><li>舊裝置與復原碼都遺失時，營運者無法定位匿名備份。</li><li>使用共用電腦時請特別小心。</li></ul>`),
                    s('8. 常見問題', `<h3>同一階段可以混合不同主題嗎？</h3><p>可以。每個主題的25個詞分別記錄。</p><h3>切換語言後記錄會混合嗎？</h3><p>不會。依自己的語言、學習語言與階段分開。</p><h3>答錯也算主題進度嗎？</h3><p>進度表示已嘗試該詞。錯題會留在清除錯題中，請繼續複習。</p><h3>沒有聲音怎麼辦？</h3><p>檢查媒體音量與網站靜音。部分瀏覽器首次播放前需要點一下畫面。</p><h3>可以像應用程式一樣安裝嗎？</h3><p>在支援的瀏覽器使用小型安裝提示，之後可從桌面捷徑或主畫面圖示啟動。</p>`),
                    s('9. 需要更多協助？', `<p>拼寫、翻譯、發音、復原或無障礙問題請查看<a href="contact.html">說明與聯絡</a>。回報技術問題時請附上裝置、瀏覽器、自己的語言與學習語言。</p><p class="legal-contact"><strong>電子郵件：</strong><a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            contact: page(
                '說明與聯絡 | TentenQuiz',
                '取得TentenQuiz翻譯、發音、功能、學習記錄、無障礙與政策相關協助。',
                '說明與聯絡',
                '遇到影響學習的問題時請告訴我們。',
                '若翻譯或發音不自然、功能未如預期運作，或對記錄保存有疑問，請先檢查以下內容。仍未解決可用電子郵件聯絡。',
                [
                    s('電子郵件支援', `<p class="legal-contact"><strong>電子郵件：</strong><a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a><br>標題範例：<strong>[發音]</strong>、<strong>[翻譯]</strong>、<strong>[功能錯誤]</strong>、<strong>[學習記錄]</strong></p>`),
                    s('1. 聯絡前快速檢查', `<ul><li>檢查網路後重新整理一次。</li><li>沒有聲音時檢查媒體音量、網站靜音與應用內音效設定。</li><li>記錄不符時確認自己的語言、學習語言與階段。</li><li>已安裝的裝置會隱藏安裝提示。</li><li>階段、複習與復原方法請看<a href="guide.html">學習指南</a>。</li></ul>`),
                    s('2. 可以回報哪些問題？', `<ul><li><strong>翻譯：</strong>單字、語言組合、顯示意思與建議</li><li><strong>發音：</strong>單字、學習語言、階段/主題及無聲、截斷或誤讀</li><li><strong>功能：</strong>裝置、系統、瀏覽器、操作步驟與必要的畫面</li><li><strong>記錄：</strong>語言組合、階段、功能與顯示訊息</li><li><strong>無障礙：</strong>使用的輔助功能與困難畫面</li><li><strong>廣告/政策：</strong>畫面、時間、國家與遮住個資的截圖</li></ul>`),
                    s('3. 如何描述功能錯誤', `<ol><li>寫明發生問題的畫面。</li><li>依序列出問題前的操作。</li><li>分開說明預期與實際結果。</li><li>附上裝置與瀏覽器名稱。</li><li>截圖中遮住復原碼與個人資訊。</li></ol>`),
                    s('4. 不可傳送的資訊', `<p class="legal-highlight"><strong>請勿以電子郵件傳送完整復原碼。</strong>它是開啟加密學習記錄的秘密鑰匙。營運者不會要求復原碼、帳號密碼、付款資料或身分證件。</p><p>也請勿傳送身分證號碼、卡片資料、密碼及非必要的地址或電話。13歲以下學習者若需傳送可能含個資的訊息，應請監護人協助。</p>`),
                    s('5. 常見協助問題', `<h3>營運者能找回遺失的復原碼嗎？</h3><p>不能。服務沒有會員帳號，復原碼也不會送到伺服器。</p><h3>刪除瀏覽器資料後能復原嗎？</h3><p>僅在已建立雲端備份且仍有復原碼時可以。</p><h3>多種語言記錄會混合嗎？</h3><p>不會。請選擇與先前相同的自己的語言、學習語言與階段。</p><h3>每封信都會收到回覆嗎？</h3><p>內容會用於改善，但重複、宣傳或資訊不足的郵件可能無法個別回覆。</p>`),
                    s('6. 聯絡資訊如何處理', `<p>為回覆與排查問題，可能處理寄件地址與內容。目的與保存原則請看<a href="privacy.html">隱私權政策</a>。</p><p class="legal-contact"><strong>TentenQuiz營運者</strong><br><strong>電子郵件：</strong><a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            privacy: page(
                '隱私權政策 | TentenQuiz',
                '說明TentenQuiz如何處理裝置內學習記錄、加密備份、Cookie、Google AdSense、聯絡與兒童隱私。',
                '隱私權政策',
                '生效日：2026年8月19日',
                'TentenQuiz營運者重視使用者隱私，並努力遵守適用法律與Google發布商政策。本政策說明網站及相關服務如何處理資訊。',
                [
                    s('1. 處理的資訊', `<p>無須註冊，服務並非設計來直接蒐集姓名、電話或地址。</p><ul><li><strong>裝置內資料：</strong>語言與讀音設定、進度、錯題及單字本可儲存在Local Storage或IndexedDB。</li><li><strong>學習成果雲端備份：</strong>首次完成某階段主題25題後，設定與記錄會在瀏覽器加密，再以密文傳送。伺服器可能處理隨機備份ID、密文、時間、大小與完整性值。復原碼與未加密記錄不會傳送。</li><li><strong>自動產生資料：</strong>主機、安全或廣告服務商可能處理IP、裝置/瀏覽器、時間、使用記錄、Cookie、信標與廣告識別碼。</li><li><strong>聯絡資料：</strong>寄送郵件時會處理電子郵件地址與內容。</li></ul>`),
                    s('2. 使用目的', `<p>資訊可能用於提供服務、保留設定、備份與復原、排除錯誤、維護安全、回覆聯絡、了解使用情況、投放廣告及衡量成效。</p>`),
                    s('3. Cookie與Google AdSense', `<p>服務可能為保留設定與改善而使用Cookie等技術，並使用Google AdSense投放廣告。Google等第三方供應商可使用Cookie，依使用者先前造訪TentenQuiz或其他網站的情況投放廣告。Google及合作夥伴可依對本網站與其他網站的造訪提供個人化廣告。</p><p>可在<a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">Google廣告設定</a>或<a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">AboutAds</a>管理。Google如何使用合作夥伴網站資訊請看<a href="https://policies.google.com/technologies/partner-sites?hl=zh-TW" target="_blank" rel="noopener noreferrer">Google說明</a>。</p><p>限制Cookie或瀏覽器儲存可能使設定、進度、錯題或單字本無法保留。</p>`),
                    s('4. 保存與刪除', `<ul><li>裝置內資料保存至使用者透過瀏覽器或服務刪除。</li><li>加密雲端備份可能保存至使用者刪除或備份服務終止。沒有復原碼時無法依姓名或電子郵件查找。</li><li>聯絡郵件在支援、爭議或法律要求的期間保存。</li><li>主機、安全與廣告服務商依各自政策與法律處理。</li></ul>`),
                    s('5. 外部服務與境外處理', `<p>Google Firebase等外部服務可能用於廣告、主機、安全、效能與加密備份。密文、Cookie識別碼、IP、裝置/瀏覽器與存取或廣告互動資訊可能在境外伺服器處理。</p><p>在歐洲經濟區、英國、瑞士等需要同意的地區，會依適用規則與Google政策透過同意管理平台提供選擇。</p>`),
                    s('6. 兒童隱私', `<p>TentenQuiz是面向廣泛年齡的教育服務，但不會故意蒐集13歲以下兒童的個人資訊。13歲以下使用者不應直接傳送個資，應請監護人協助。如發現未經授權蒐集，將採取合理刪除措施。</p><p>營運者無意依已知屬於13歲以下兒童的活動建立個人化廣告資料，並在需要時套用年齡相關處理。</p>`),
                    s('7. 使用者選擇與權利', `<p>可透過瀏覽器或服務查看、刪除裝置資料，用復原碼復原或刪除加密備份，並調整Cookie與個人化廣告設定。備份不連結會員帳號，只有復原碼持有人可操作。可用電子郵件要求查閱、更正或刪除營運者持有的聯絡資訊。</p>`),
                    s('8. 安全措施', `<p>採取傳輸保護、瀏覽器端加密、難以猜測的復原碼與資料庫存取規則等合理措施，但無法保證網路傳輸或電子儲存絕對安全。</p>`),
                    s('9. 政策變更', `<p>服務、法律或相關政策改變時可能修訂。重要變更將以服務通知或更新生效日說明。</p>`),
                    s('10. 聯絡方式', `<p class="legal-contact"><strong>隱私聯絡人：</strong>TentenQuiz營運者<br><strong>電子郵件：</strong><a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            terms: page(
                '服務條款 | TentenQuiz',
                '說明使用TentenQuiz語言學習服務、內容、學習記錄、廣告與相關責任的條件。',
                '服務條款',
                '生效日：2026年8月19日',
                '本條款規定TentenQuiz營運者提供之網站與相關服務的使用條件。使用服務即表示同意本條款與隱私權政策。',
                [
                    s('1. 服務目的', `<p>TentenQuiz是面向廣泛年齡的教育服務，透過短測驗、錯題複習與個人單字本學習生活詞彙。資料僅支援一般語言學習，不保證考試成績或特定結果。</p>`),
                    s('2. 使用服務', `<p>可在遵守法律與條款的範圍內作個人學習。核心測驗無須註冊，設定與記錄可存在瀏覽器。首次完成25題主題時可能建立加密雲端備份，並以復原碼在其他裝置復原。</p><p>13歲以下使用者在涉及個資或外部服務時應請監護人協助。</p>`),
                    s('3. 使用者義務', `<p>不得干擾服務、規避安全功能、散播惡意程式、過度自動請求、大量擷取或再散布內容、侵害權利、製造無效廣告互動或違法使用。</p>`),
                    s('4. 內容與智慧財產', `<p>服務設計、結構、彙整資料、說明與營運者製作內容的權利屬於營運者或合法權利人。我們不主張個別單字或一般事實的權利。超出個人學習的複製、銷售、再散布或建立其他資料庫需要許可。</p>`),
                    s('5. 廣告與外部服務', `<p>為支援營運成本，可能顯示Google AdSense等第三方廣告，並依<a href="privacy.html">隱私權政策</a>使用Cookie。外部連結與第三方服務適用其提供者條款，營運者不保證其內容或結果。</p>`),
                    s('6. 變更與中斷', `<p>因改善、維護、安全或不可避免的營運原因，內容與功能可能變更或暫停。對使用者有重大影響時，會在合理可行範圍內通知。</p>`),
                    s('7. 學習資訊與責任範圍', `<p>我們努力提供正確自然的資料，但不保證沒有地區、語境或技術錯誤。不得將服務作為專業翻譯或醫療、法律、金融、正式文件的唯一依據。</p><p>使用者應私密保管復原碼。舊裝置與復原碼都遺失後，無法以姓名或電子郵件查找匿名備份。除法律不得排除的責任外，營運者在無故意或重大過失時，不對災害、通訊故障、裝置設定、第三方或違反條款造成的損失負責。</p>`),
                    s('8. 使用限制', `<p>使用者違反條款、法律或威脅服務安全與正常營運時，可能限制使用。除緊急安全情況外，會在適當時說明理由與異議方式。</p>`),
                    s('9. 條款變更', `<p>可能因服務、法律或政策改變而修訂。重要修改會透過通知或更新生效日公布，生效後繼續使用視為同意。</p>`),
                    s('10. 準據法與爭議', `<p>本條款依大韓民國法律解釋。雙方先嘗試協商，未解決時由韓國法律規定之有管轄權法院處理。使用者居住地的強制法律在必要時仍適用。</p>`),
                    s('11. 聯絡方式', `<p class="legal-contact"><strong>TentenQuiz營運者</strong><br><strong>電子郵件：</strong><a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            )
        },
        fr: {
            about: page(
                'À propos | TentenQuiz',
                'Découvrez les 2 500 concepts du quotidien en 12 langues, les quiz courts, les outils de révision et la sauvegarde sans compte de TentenQuiz.',
                'À propos de TentenQuiz',
                'Dernière mise à jour : 20 août 2026',
                'TentenQuiz est un service web gratuit pour apprendre le vocabulaire du quotidien dans 12 langues grâce à des quiz courts et répétables. Choisissez votre langue et celle à apprendre, sans créer de compte.',
                [
                    s('1. Quel type de service ?', `<p>TentenQuiz privilégie les rappels brefs et fréquents. Une série comporte 10 questions de 10 secondes afin d’associer rapidement un mot à son sens par petites séances.</p><p>Le service prend en charge l’anglais, le coréen, le japonais, le chinois simplifié et traditionnel, le français, l’allemand, l’espagnol, le vietnamien, l’arabe, l’italien et le russe. Votre langue et la langue apprise doivent être différentes, et chaque combinaison conserve ses propres données.</p>`),
                    s('2. Que peut-on apprendre ?', `<p class="legal-highlight"><strong>2 500 concepts essentiels du quotidien</strong> sont proposés dans les 12 langues, organisés en 10 niveaux et 10 thèmes.</p><ul><li>Nature, personnes, santé, alimentation, maison, activités, lieux, école, achats et temps</li><li>10 niveaux allant des mots familiers aux mots moins fréquents mais utiles</li><li>25 mots par thème et par niveau</li><li>Un enregistrement de prononciation pour relier écrit et son</li></ul>`),
                    s('3. Comment apprend-on ?', `<ul><li>Une série normale contient jusqu’à 10 questions.</li><li>« Effacer les erreurs » permet de résoudre à nouveau les réponses fausses ou hors délai.</li><li>Le vocabulaire personnel répète les mots choisis jusqu’à l’arrêt de la séance.</li><li>La bonne réponse apparaît immédiatement après une erreur ou un dépassement du temps.</li><li>Des animations signalent la fin des 25 mots d’un thème et un score de 10/10.</li></ul>`),
                    s('4. Principes de sélection et de traduction', `<p>Nous privilégions les mots courants qu’un élève d’environ 13 à 15 ans peut comprendre et imaginer. Les termes très spécialisés, trop régionaux, les traductions forcées et les doublons inutiles sont écartés autant que possible.</p><p>Nous vérifions l’alignement d’un concept dans 12 langues ainsi que la présence de l’orthographe, de la lecture et du fichier audio. Les langues variant selon les régions et les contextes, les signalements de traduction ou de prononciation sont bienvenus.</p>`),
                    s('5. Conserver sa progression sans compte', `<p>Les langues, la progression, les erreurs et le vocabulaire personnel sont d’abord enregistrés automatiquement dans le navigateur. Aucun nom, téléphone ni compte e-mail n’est nécessaire.</p><p>À la première fin des 25 questions d’un thème, le navigateur peut chiffrer les données et créer une sauvegarde cloud sécurisée. Le code de récupération permet de les charger sur un autre appareil, mais il n’est pas transmis au serveur. Voir la <a href="privacy.html">Politique de confidentialité</a>.</p>`),
                    s('6. Financement du service gratuit', `<p>Les fonctions principales restent gratuites. TentenQuiz peut utiliser Google AdSense ou un service similaire pour financer l’hébergement et l’amélioration du contenu. Les annonces sont distinguées des réponses et commandes d’apprentissage.</p>`),
                    s('7. Questions et remarques', `<p>Pour une question de traduction, de prononciation, de technique ou d’accessibilité, consultez <a href="contact.html">Aide et contact</a>.</p><p class="legal-contact"><strong>Responsable de TentenQuiz</strong><br><strong>E-mail :</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            guide: page(
                'Guide d’apprentissage | TentenQuiz',
                'Utiliser les niveaux, les thèmes, la révision des erreurs, le vocabulaire personnel, l’audio et les sauvegardes chiffrées de TentenQuiz.',
                'Guide d’apprentissage TentenQuiz',
                'Mode d’emploi étape par étape',
                'TentenQuiz entraîne le rappel rapide : répondez en 10 secondes, recommencez les erreurs et répétez les mots choisis. Ce guide va du choix des langues à la récupération de la progression.',
                [
                    s('1. Démarrage rapide', `<ol><li>Choisissez <strong>Ma langue</strong>, utilisée pour les sens et l’interface.</li><li>Choisissez la langue à apprendre.</li><li>Sélectionnez un niveau adapté.</li><li>Choisissez un thème du quotidien.</li><li>Écoutez ou lisez, puis choisissez le bon sens parmi quatre réponses en 10 secondes.</li></ol><p class="legal-highlight"><strong>Pour débuter :</strong> prenez un thème du niveau 1, répondez à 10 questions et révisez vos erreurs avant de continuer.</p>`),
                    s('2. Niveaux et thèmes', `<p>Le parcours comprend <strong>10 niveaux × 10 thèmes × 25 mots</strong>, soit 250 concepts par niveau et 2 500 au total.</p><ul><li>Nature / Météo</li><li>Personnes / Relations</li><li>Corps / Santé</li><li>Aliments / Boissons</li><li>Maison / Vie quotidienne</li><li>Activités / Loisirs</li><li>Lieux / Transports</li><li>École / Travail</li><li>Achats / Argent</li><li>Temps / Calendrier</li></ul><p>Le <strong>niveau</strong> indique la progression, le <strong>thème</strong> regroupe les situations. Les thèmes d’un même niveau peuvent être étudiés librement et gardent une progression séparée.</p>`),
                    s('3. Quiz de 10 secondes et 10 questions', `<p>Une série normale affiche jusqu’à 10 mots au hasard. Le haut-parleur permet de réécouter la langue apprise. Une bonne réponse passe rapidement à la suivante ; une erreur ou un délai dépassé affiche le sens correct et ajoute le mot aux erreurs du niveau.</p><p>Après les 25 mots d’un thème, le bouton indique la fin et une petite animation apparaît. Un 10/10 lance la célébration du score parfait.</p>`),
                    s('4. Effacer les erreurs', `<ol><li>Les erreurs et délais dépassés sont enregistrés automatiquement.</li><li>Ouvrez « Effacer les erreurs » dans le niveau actuel.</li><li>Une bonne réponse retire le mot de la liste.</li><li>Une nouvelle erreur le conserve pour une autre révision.</li></ol><p>Essayez de ramener le compteur à zéro avant d’avancer loin dans de nouveaux contenus.</p>`),
                    s('5. Mon vocabulaire', `<p>Ajoutez depuis les résultats tout mot à retenir. Les questions sont remélangées et répétées jusqu’à l’arrêt. En cas d’erreur ou de délai dépassé, la réponse apparaît et son sens est prononcé une fois dans votre langue avant la suite.</p><p>Les listes sont séparées selon votre langue, la langue apprise et le niveau.</p>`),
                    s('6. Routine conseillée', `<ol><li>Répondez à 10 nouvelles questions.</li><li>Effacez immédiatement les erreurs.</li><li>Ajoutez les mots importants ou confus à votre liste.</li><li>Terminez les 25 mots du thème.</li><li>Refaites une courte révision le lendemain.</li></ol><p>Des retours courts et réguliers comptent davantage qu’un niveau entier en une séance.</p>`),
                    s('7. Enregistrer et récupérer', `<p>Les réglages et données sont enregistrés dans le navigateur. La première fin d’un thème de 25 mots crée aussi une sauvegarde cloud chiffrée. Gardez le code de récupération secret pour charger les données ailleurs.</p><ul><li>Ne partagez jamais le code.</li><li>Sans l’ancien appareil ni le code, l’opérateur ne peut retrouver la sauvegarde anonyme.</li><li>Soyez particulièrement prudent sur un ordinateur partagé.</li></ul>`),
                    s('8. Questions fréquentes', `<h3>Peut-on mélanger les thèmes d’un niveau ?</h3><p>Oui, chaque thème suit séparément ses 25 mots.</p><h3>Les données se mélangent-elles en changeant de langue ?</h3><p>Non, elles sont séparées par votre langue, la langue apprise et le niveau.</p><h3>Une erreur compte-t-elle dans la progression ?</h3><p>La progression indique qu’un mot a été tenté ; il reste dans les erreurs pour être maîtrisé.</p><h3>Que faire sans son ?</h3><p>Vérifiez le volume et la mise en sourdine du site. Certains navigateurs exigent un premier toucher.</p><h3>Peut-on installer TentenQuiz ?</h3><p>Sur un navigateur compatible, utilisez l’invite discrète puis lancez-le depuis le raccourci ou l’icône d’accueil.</p>`),
                    s('9. Besoin d’aide ?', `<p>Pour un problème d’orthographe, traduction, prononciation, récupération ou accessibilité, consultez <a href="contact.html">Aide et contact</a>. Indiquez l’appareil, le navigateur et les deux langues pour un souci technique.</p><p class="legal-contact"><strong>E-mail :</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            contact: page(
                'Aide et contact | TentenQuiz',
                'Aide pour les traductions, la prononciation, les problèmes techniques, les données, l’accessibilité et les règles de TentenQuiz.',
                'Aide et contact',
                'Signalez ce qui gêne votre apprentissage.',
                'Si une traduction ou prononciation semble incorrecte, si une fonction ne marche pas ou si vous avez une question sur les données, vérifiez d’abord les points ci-dessous, puis écrivez-nous si nécessaire.',
                [
                    s('Assistance par e-mail', `<p class="legal-contact"><strong>E-mail :</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a><br>Objet conseillé : <strong>[Prononciation]</strong>, <strong>[Traduction]</strong>, <strong>[Erreur technique]</strong> ou <strong>[Données]</strong>.</p>`),
                    s('1. Vérifications rapides', `<ul><li>Vérifiez Internet puis actualisez une fois.</li><li>Pour l’audio, vérifiez volume, sourdine du site et réglage sonore.</li><li>Si les données diffèrent, contrôlez votre langue, la langue apprise et le niveau.</li><li>L’invite d’installation disparaît sur un appareil déjà installé.</li><li>Consultez le <a href="guide.html">Guide d’apprentissage</a> pour les fonctions et la récupération.</li></ul>`),
                    s('2. Que signaler ?', `<ul><li><strong>Traduction :</strong> mot, langues, sens affiché, proposition</li><li><strong>Prononciation :</strong> mot, langue, niveau/thème et type d’erreur</li><li><strong>Technique :</strong> appareil, système, navigateur, étapes et capture utile</li><li><strong>Données :</strong> langues, niveau, fonction et message affiché</li><li><strong>Accessibilité :</strong> aide utilisée et écran difficile</li><li><strong>Publicité/politique :</strong> écran, heure, pays et capture sans données personnelles</li></ul>`),
                    s('3. Décrire un problème technique', `<ol><li>Nommez l’écran concerné.</li><li>Listez les actions précédentes.</li><li>Distinguez résultat attendu et résultat réel.</li><li>Indiquez appareil et navigateur.</li><li>Masquez code de récupération et données personnelles.</li></ol>`),
                    s('4. Informations à ne jamais envoyer', `<p class="legal-highlight"><strong>N’envoyez jamais le code de récupération complet.</strong> C’est la clé secrète des données chiffrées. L’opérateur ne demande ni ce code, ni mot de passe, ni paiement, ni pièce d’identité.</p><p>N’envoyez pas de numéro officiel, carte bancaire, mot de passe, adresse ou téléphone inutiles. Les moins de 13 ans doivent demander à un parent ou tuteur d’envoyer tout message contenant des informations personnelles.</p>`),
                    s('5. Aide fréquente', `<h3>L’opérateur peut-il retrouver un code perdu ?</h3><p>Non : il n’existe pas de compte membre et le code n’est pas envoyé au serveur.</p><h3>Peut-on restaurer des données de navigateur supprimées ?</h3><p>Seulement avec une sauvegarde cloud existante et son code.</p><h3>Les langues se mélangent-elles ?</h3><p>Non. Reprenez la même combinaison de langues et le même niveau.</p><h3>Chaque message reçoit-il une réponse ?</h3><p>Les rapports sont examinés, mais les doublons, publicités ou messages insuffisants peuvent ne pas recevoir de réponse individuelle.</p>`),
                    s('6. Traitement des messages', `<p>L’adresse d’envoi et le contenu peuvent être traités pour répondre et résoudre le problème. Voir la <a href="privacy.html">Politique de confidentialité</a>.</p><p class="legal-contact"><strong>Responsable de TentenQuiz</strong><br><strong>E-mail :</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            privacy: page(
                'Politique de confidentialité | TentenQuiz',
                'Traitement des données locales, sauvegardes chiffrées, cookies, Google AdSense, demandes et vie privée des enfants.',
                'Politique de confidentialité',
                'Entrée en vigueur : 19 août 2026',
                'Le responsable de TentenQuiz respecte la vie privée et s’efforce de suivre la loi applicable et les règles Google pour les éditeurs. Cette politique explique le traitement des informations du site et des services associés.',
                [
                    s('1. Informations traitées', `<p>Aucune inscription n’est requise et le service n’est pas conçu pour collecter directement nom, téléphone ou adresse.</p><ul><li><strong>Sur l’appareil :</strong> langues, lecture, progression, erreurs et vocabulaire peuvent être stockés dans Local Storage ou IndexedDB.</li><li><strong>Sauvegarde d’étape :</strong> après la première fin des 25 questions d’un thème, réglages et données sont chiffrés dans le navigateur puis envoyés comme texte chiffré. Le serveur peut traiter identifiant aléatoire, texte chiffré, date, taille et valeur d’intégrité. Le code de récupération et les données en clair ne sont pas envoyés.</li><li><strong>Données automatiques :</strong> hébergeur, sécurité et publicité peuvent traiter IP, appareil/navigateur, date, activité, cookies, balises et identifiants publicitaires.</li><li><strong>Demandes :</strong> adresse e-mail et contenu sont traités lorsque vous écrivez.</li></ul>`),
                    s('2. Finalités', `<p>Les informations peuvent servir à fournir le service, conserver les réglages, sauvegarder et restaurer, corriger les erreurs, assurer la sécurité, répondre, analyser l’usage, afficher des annonces et mesurer leur performance.</p>`),
                    s('3. Cookies et Google AdSense', `<p>Le service peut utiliser des cookies ou technologies similaires et Google AdSense. Google et d’autres fournisseurs tiers peuvent utiliser des cookies pour diffuser des annonces selon les visites antérieures de TentenQuiz ou d’autres sites. Les cookies publicitaires permettent à Google et ses partenaires d’afficher des annonces personnalisées selon ces visites.</p><p>Gérez la personnalisation dans les <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">paramètres publicitaires Google</a> ou sur <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">AboutAds</a>. Consultez l’<a href="https://policies.google.com/technologies/partner-sites?hl=fr" target="_blank" rel="noopener noreferrer">explication de Google sur les sites partenaires</a>.</p><p>Le blocage du stockage peut empêcher la conservation des langues, de la progression, des erreurs ou du vocabulaire.</p>`),
                    s('4. Conservation et suppression', `<ul><li>Les données locales restent jusqu’à leur suppression dans le navigateur ou le service.</li><li>La sauvegarde chiffrée peut rester jusqu’à sa suppression ou la fin du service de sauvegarde. Sans code, elle ne peut être cherchée par nom ou e-mail.</li><li>Les messages sont conservés le temps nécessaire au support, aux litiges ou à la loi.</li><li>Les fournisseurs externes appliquent leurs politiques et la loi.</li></ul>`),
                    s('5. Services externes et transferts', `<p>Google Firebase et d’autres fournisseurs peuvent servir à la publicité, l’hébergement, la sécurité, les performances et la sauvegarde chiffrée. Texte chiffré, cookies, IP, appareil/navigateur et interactions peuvent être traités à l’étranger.</p><p>Dans l’EEE, au Royaume-Uni, en Suisse et ailleurs où le consentement est requis, une plateforme de gestion du consentement fournit les choix prévus par la loi et les règles Google.</p>`),
                    s('6. Vie privée des enfants', `<p>TentenQuiz vise un large public mais ne collecte pas volontairement d’informations personnelles d’enfants de moins de 13 ans. Ils doivent demander l’aide d’un parent et ne pas écrire directement avec des données personnelles. Toute collecte non autorisée connue fera l’objet de mesures raisonnables de suppression.</p><p>L’opérateur ne cherche pas à créer de profil publicitaire personnalisé à partir d’une activité connue comme celle d’un enfant de moins de 13 ans et applique le traitement d’âge requis.</p>`),
                    s('7. Vos choix et droits', `<p>Vous pouvez consulter ou supprimer les données locales, gérer la sauvegarde avec le code, et modifier cookies et publicité personnalisée. Les sauvegardes n’étant pas liées à un compte, seul le détenteur du code peut les restaurer ou supprimer. Contactez-nous pour l’accès, la correction ou la suppression des informations de demande détenues.</p>`),
                    s('8. Sécurité', `<p>Des mesures raisonnables incluent protection du transport, chiffrement dans le navigateur, codes difficiles à deviner et règles d’accès à la base. Aucune transmission ou conservation électronique n’est absolument sûre.</p>`),
                    s('9. Modifications', `<p>La politique peut évoluer avec le service, la loi ou les règles. Les changements importants sont annoncés dans le service ou par une nouvelle date d’entrée en vigueur.</p>`),
                    s('10. Contact', `<p class="legal-contact"><strong>Contact confidentialité :</strong> responsable de TentenQuiz<br><strong>E-mail :</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            terms: page(
                'Conditions d’utilisation | TentenQuiz',
                'Conditions d’utilisation du service TentenQuiz, du contenu, des données d’apprentissage, de la publicité et responsabilités.',
                'Conditions d’utilisation',
                'Entrée en vigueur : 19 août 2026',
                'Ces conditions régissent le site et les services associés fournis par le responsable de TentenQuiz. En utilisant le service, vous acceptez ces conditions et la Politique de confidentialité.',
                [
                    s('1. Objet du service', `<p>TentenQuiz est un service éducatif grand public pour apprendre le vocabulaire du quotidien par quiz courts, révision des erreurs et vocabulaire personnel. Il ne garantit ni note d’examen ni résultat particulier.</p>`),
                    s('2. Utilisation', `<p>Le service peut être utilisé à titre personnel dans le respect de la loi et des présentes conditions. Les quiz essentiels ne demandent pas de compte. Les réglages et données peuvent rester dans le navigateur ; la première fin d’un thème de 25 questions peut créer une sauvegarde chiffrée restaurable par code.</p><p>Les moins de 13 ans doivent demander l’aide d’un tuteur lorsqu’une information personnelle ou un service externe intervient.</p>`),
                    s('3. Obligations', `<p>Il est interdit de perturber le service, contourner la sécurité, diffuser un logiciel malveillant, automatiser excessivement, extraire ou redistribuer en masse, enfreindre des droits, créer des interactions publicitaires invalides ou agir illégalement.</p>`),
                    s('4. Contenu et propriété intellectuelle', `<p>Les droits sur le design, l’organisation, les données compilées, les explications et contenus créés appartiennent à l’opérateur ou aux ayants droit. Aucun droit n’est revendiqué sur un mot isolé ou un fait général. Copie, vente, redistribution ou base distincte au-delà de l’étude personnelle exigent une autorisation.</p>`),
                    s('5. Publicité et services externes', `<p>Google AdSense ou d’autres annonces peuvent financer le service, avec des cookies décrits dans la <a href="privacy.html">Politique de confidentialité</a>. Les liens et services tiers suivent leurs propres conditions ; l’opérateur ne garantit pas leur contenu ni leurs résultats.</p>`),
                    s('6. Modification et interruption', `<p>Le contenu ou les fonctions peuvent changer ou être suspendus pour amélioration, maintenance, sécurité ou nécessité opérationnelle. Une modification importante est annoncée dans la mesure du possible.</p>`),
                    s('7. Données et responsabilité', `<p>Des efforts raisonnables visent des contenus exacts et naturels, mais des différences régionales, contextuelles ou erreurs techniques peuvent exister. Le service ne doit pas être l’unique base d’une traduction professionnelle, d’un conseil médical, juridique ou financier, ni d’un document officiel.</p><p>Vous gardez le code secret. Sans ancien appareil ni code, une sauvegarde anonyme ne peut être retrouvée par nom ou e-mail. Sauf responsabilité légalement obligatoire, l’opérateur n’est pas responsable, sans faute intentionnelle ou grave, des pertes dues aux catastrophes, communications, réglages, tiers ou violation des conditions.</p>`),
                    s('8. Restriction', `<p>L’accès peut être limité en cas de violation de la loi ou des conditions, ou de menace pour la sécurité. Sauf urgence, les motifs et possibilités de contestation sont indiqués lorsque cela convient.</p>`),
                    s('9. Modification des conditions', `<p>Les conditions peuvent évoluer avec le service, la loi ou les règles. Les changements importants sont annoncés ou datés ; continuer après leur entrée en vigueur vaut acceptation.</p>`),
                    s('10. Droit applicable et litiges', `<p>Ces conditions sont interprétées selon le droit de la République de Corée. Les parties cherchent d’abord un accord, puis les tribunaux compétents en Corée traitent les litiges. Les règles impératives du lieu de résidence restent applicables si nécessaire.</p>`),
                    s('11. Contact', `<p class="legal-contact"><strong>Responsable de TentenQuiz</strong><br><strong>E-mail :</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            )
        },
        de: {
            about: page(
                'Über uns | TentenQuiz',
                'Erfahren Sie mehr über 2.500 Alltagsbegriffe in 12 Sprachen, kurze Quizrunden, Wiederholung und kontofreie Speicherung bei TentenQuiz.',
                'Über TentenQuiz',
                'Zuletzt aktualisiert: 20. August 2026',
                'TentenQuiz ist ein kostenloser Web-Lerndienst für Alltagswortschatz in 12 Sprachen. Kurze, wiederholbare Quizrunden lassen sich ohne Registrierung im eigenen Tempo nutzen.',
                [
                    s('1. Was ist TentenQuiz?', `<p>Im Mittelpunkt stehen kurzes Erinnern und häufige Wiederholung. Eine Runde hat 10 Fragen mit jeweils 10 Sekunden, damit Wörter und Bedeutungen in kleinen Einheiten schnell verbunden werden.</p><p>Unterstützt werden Englisch, Koreanisch, Japanisch, vereinfachtes und traditionelles Chinesisch, Französisch, Deutsch, Spanisch, Vietnamesisch, Arabisch, Italienisch und Russisch. Eigene und zu lernende Sprache müssen verschieden sein; jede Sprachkombination behält getrennte Daten.</p>`),
                    s('2. Was kann ich lernen?', `<p class="legal-highlight"><strong>2.500 zentrale Alltagsbegriffe</strong> stehen in allen 12 Sprachen bereit, geordnet in 10 Stufen und 10 Themen.</p><ul><li>Natur, Menschen, Gesundheit, Essen, Zuhause, Aktivitäten, Orte, Schule, Einkaufen und Zeit</li><li>10 Stufen von vertrauten zu selteneren, aber nützlichen Wörtern</li><li>25 Wörter je Thema und Stufe</li><li>Aussprachedateien zur Verbindung von Schrift und Klang</li></ul>`),
                    s('3. Wie wird gelernt?', `<ul><li>Eine normale Runde enthält bis zu 10 Fragen.</li><li>Unter „Falsche Antworten löschen“ werden Fehler und Zeitüberschreitungen erneut gelöst.</li><li>Im eigenen Wortschatz werden ausgewählte Wörter bis zum Beenden wiederholt.</li><li>Bei Fehler oder Zeitablauf erscheint sofort die richtige Antwort.</li><li>Nach 25 Themenwörtern und bei 10/10 gibt es unterschiedliche Erfolgsanimationen.</li></ul>`),
                    s('4. Auswahl und Übersetzung', `<p>Bevorzugt werden allgemein verständliche Alltagswörter, die etwa 13- bis 15-Jährige leicht einordnen können. Sehr spezielle oder eng regionale Begriffe, erzwungene Übersetzungen und unnötige Duplikate werden möglichst ausgeschlossen.</p><p>Wir prüfen die Zuordnung eines Konzepts in 12 Sprachen sowie Schreibweise, Lesung und Audioverweis. Da Sprache regional und kontextabhängig ist, können unnatürliche Übersetzungen oder Aussprachen gemeldet werden.</p>`),
                    s('5. Fortschritt ohne Konto', `<p>Sprachen, Fortschritt, Fehler und Wortschatz werden zuerst automatisch im Browser gespeichert. Name, Telefonnummer oder E-Mail-Konto sind nicht nötig.</p><p>Beim ersten Abschluss der 25 Fragen eines Themas kann der Browser die Daten verschlüsseln und sicher in der Cloud sichern. Der Wiederherstellungscode lädt sie auf einem anderen Gerät; er selbst wird nicht an den Server gesendet. Einzelheiten enthält die <a href="privacy.html">Datenschutzerklärung</a>.</p>`),
                    s('6. Finanzierung', `<p>Die Kernfunktionen sind kostenlos. TentenQuiz kann Google AdSense oder ähnliche Werbung einsetzen, um Hosting und Inhaltsverbesserung zu finanzieren. Anzeigen werden von Antworten und Lernsteuerung getrennt.</p>`),
                    s('7. Fragen und Hinweise', `<p>Bei Übersetzungs-, Aussprache-, Technik- oder Barrierefreiheitsproblemen hilft <a href="contact.html">Hilfe & Kontakt</a>.</p><p class="legal-contact"><strong>TentenQuiz-Betreiber</strong><br><strong>E-Mail:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            guide: page(
                'Lernanleitung | TentenQuiz',
                'Anleitung zu Stufen, Themenquiz, Fehlerwiederholung, eigenem Wortschatz, Audio und verschlüsselter Sicherung in TentenQuiz.',
                'TentenQuiz-Lernanleitung',
                'Schritt für Schritt für neue Lernende',
                'TentenQuiz trainiert schnelles Erinnern: innerhalb von 10 Sekunden antworten, Fehler erneut lösen und ausgewählte Wörter wiederholen. Diese Anleitung reicht von der Sprachwahl bis zur Wiederherstellung.',
                [
                    s('1. Schnellstart', `<ol><li>Wähle <strong>Meine Sprache</strong> für Bedeutungen und Oberfläche.</li><li>Wähle die zu lernende Sprache.</li><li>Wähle eine passende Stufe.</li><li>Wähle ein Alltagsthema.</li><li>Höre oder lies das Wort und wähle in 10 Sekunden die richtige von vier Bedeutungen.</li></ol><p class="legal-highlight"><strong>Zum Einstieg:</strong> Beginne mit einem Thema in Stufe 1, beantworte 10 Fragen und wiederhole die Fehler, bevor du fortfährst.</p>`),
                    s('2. Stufen und Themen', `<p>Der Lernplan enthält <strong>10 Stufen × 10 Themen × 25 Wörter</strong>: 250 Begriffe je Stufe und 2.500 insgesamt.</p><ul><li>Natur / Wetter</li><li>Menschen / Beziehungen</li><li>Körper / Gesundheit</li><li>Essen / Trinken</li><li>Zuhause / Alltag</li><li>Aktivitäten / Freizeit</li><li>Orte / Verkehr</li><li>Schule / Arbeit</li><li>Einkaufen / Geld</li><li>Zeit / Kalender</li></ul><p>Die <strong>Stufe</strong> bestimmt die Lernfolge, das <strong>Thema</strong> die Alltagssituation. Themen derselben Stufe können frei gewählt werden und führen getrennten Fortschritt.</p>`),
                    s('3. 10 Sekunden, 10 Fragen', `<p>Eine normale Runde zeigt zufällig bis zu 10 Wörter. Über den Lautsprecher kann die Aussprache erneut gehört werden. Richtig führt schnell zur nächsten Frage; falsch oder zu spät zeigt die Bedeutung und speichert das Wort in der Fehlerliste der Stufe.</p><p>Nach allen 25 Themenwörtern zeigt die Schaltfläche den Abschluss mit kleiner Animation. 10/10 startet die Feier für volle Punktzahl.</p>`),
                    s('4. Falsche Antworten löschen', `<ol><li>Fehler und Zeitüberschreitungen werden automatisch gespeichert.</li><li>Öffne die Fehlerwiederholung in der aktuellen Stufe.</li><li>Eine richtige Antwort entfernt das Wort.</li><li>Ein erneuter Fehler bleibt für die nächste Wiederholung.</li></ol><p>Bring den Zähler möglichst auf null, bevor du viel neuen Stoff beginnst.</p>`),
                    s('5. Mein Wortschatz', `<p>Füge über die Ergebnisse jedes wichtige Wort hinzu. Die Fragen werden gemischt wiederholt, bis du beendest. Bei Fehler oder Zeitablauf erscheint die Antwort und ihre Bedeutung wird einmal in deiner Sprache gesprochen.</p><p>Listen sind nach eigener Sprache, Lernsprache und Stufe getrennt.</p>`),
                    s('6. Empfohlene Routine', `<ol><li>Beantworte 10 neue Fragen.</li><li>Wiederhole Fehler sofort.</li><li>Füge wichtige oder verwechselte Wörter hinzu.</li><li>Schließe die 25 Wörter des Themas ab.</li><li>Wiederhole am nächsten Tag kurz.</li></ol><p>Regelmäßige kurze Einheiten zählen mehr als eine ganze Stufe auf einmal.</p>`),
                    s('7. Speichern und Wiederherstellen', `<p>Einstellungen und Lerndaten werden im Browser gespeichert. Beim ersten Abschluss eines 25-Wörter-Themas entsteht zusätzlich eine verschlüsselte Cloud-Sicherung. Bewahre den Code geheim auf.</p><ul><li>Teile den Code nie.</li><li>Ohne altes Gerät und Code kann der Betreiber die anonyme Sicherung nicht finden.</li><li>Sei auf gemeinsam genutzten Computern besonders vorsichtig.</li></ul>`),
                    s('8. Häufige Fragen', `<h3>Darf ich Themen einer Stufe mischen?</h3><p>Ja, jedes Thema führt seine 25 Wörter getrennt.</p><h3>Vermischen sich Daten beim Sprachwechsel?</h3><p>Nein, sie sind nach eigener Sprache, Lernsprache und Stufe getrennt.</p><h3>Zählt eine falsche Antwort zum Fortschritt?</h3><p>Der Fortschritt zeigt den Versuch; das Wort bleibt zur Wiederholung in der Fehlerliste.</p><h3>Kein Ton?</h3><p>Prüfe Medienlautstärke und Website-Stummschaltung. Manche Browser benötigen zuerst eine Berührung.</p><h3>Kann ich TentenQuiz installieren?</h3><p>Nutze im unterstützten Browser den kleinen Hinweis und starte später über Desktopverknüpfung oder Startbildschirm.</p>`),
                    s('9. Weitere Hilfe', `<p>Für Schreibweise, Übersetzung, Aussprache, Wiederherstellung oder Barrierefreiheit siehe <a href="contact.html">Hilfe & Kontakt</a>. Bei Technikproblemen nenne Gerät, Browser und beide Sprachen.</p><p class="legal-contact"><strong>E-Mail:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            contact: page(
                'Hilfe & Kontakt | TentenQuiz',
                'Hilfe zu Übersetzung, Aussprache, Technik, Lerndaten, Barrierefreiheit und Richtlinien von TentenQuiz.',
                'Hilfe & Kontakt',
                'Melde Probleme, die das Lernen erschweren.',
                'Wenn Übersetzung oder Aussprache falsch wirkt, eine Funktion nicht arbeitet oder Fragen zu Daten bestehen, prüfe zuerst die folgenden Punkte und schreibe uns bei Bedarf.',
                [
                    s('E-Mail-Support', `<p class="legal-contact"><strong>E-Mail:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a><br>Betreff z. B. <strong>[Aussprache]</strong>, <strong>[Übersetzung]</strong>, <strong>[Technik]</strong> oder <strong>[Lerndaten]</strong>.</p>`),
                    s('1. Schnelle Prüfungen', `<ul><li>Internet prüfen und einmal neu laden.</li><li>Bei Stille Lautstärke, Website-Stummschaltung und Ton-Einstellung prüfen.</li><li>Bei abweichenden Daten eigene Sprache, Lernsprache und Stufe prüfen.</li><li>Auf bereits installierten Geräten wird der Installationshinweis verborgen.</li><li>Für Funktionen und Wiederherstellung siehe <a href="guide.html">Lernanleitung</a>.</li></ul>`),
                    s('2. Was kann gemeldet werden?', `<ul><li><strong>Übersetzung:</strong> Wort, Sprachpaar, angezeigte Bedeutung, Vorschlag</li><li><strong>Aussprache:</strong> Wort, Sprache, Stufe/Thema und Fehlerart</li><li><strong>Technik:</strong> Gerät, System, Browser, Schritte und ggf. Bild</li><li><strong>Daten:</strong> Sprachpaar, Stufe, Funktion und Meldung</li><li><strong>Barrierefreiheit:</strong> Hilfsmittel und schwieriger Bildschirm</li><li><strong>Werbung/Richtlinie:</strong> Bildschirm, Zeit, Land und bereinigtes Bild</li></ul>`),
                    s('3. Technikproblem beschreiben', `<ol><li>Betroffenen Bildschirm nennen.</li><li>Vorherige Aktionen auflisten.</li><li>Erwartetes und tatsächliches Ergebnis trennen.</li><li>Gerät und Browser nennen.</li><li>Code und persönliche Daten in Bildern verdecken.</li></ol>`),
                    s('4. Niemals senden', `<p class="legal-highlight"><strong>Sende nie den vollständigen Wiederherstellungscode.</strong> Er ist der geheime Schlüssel zu verschlüsselten Daten. Der Betreiber fragt weder danach noch nach Passwort, Zahlungsdaten oder Ausweis.</p><p>Sende keine amtlichen Nummern, Kartendaten, Passwörter oder unnötige Adressen und Telefonnummern. Unter 13-Jährige sollten persönliche Nachrichten von einem Erziehungsberechtigten senden lassen.</p>`),
                    s('5. Häufige Hilfe', `<h3>Kann der Betreiber einen verlorenen Code finden?</h3><p>Nein, es gibt kein Mitgliedskonto und der Code wird nicht gesendet.</p><h3>Sind gelöschte Browserdaten wiederherstellbar?</h3><p>Nur mit vorhandener Cloud-Sicherung und Code.</p><h3>Vermischen sich mehrere Sprachen?</h3><p>Nein. Wähle dasselbe Sprachpaar und dieselbe Stufe wie zuvor.</p><h3>Wird jede Nachricht beantwortet?</h3><p>Meldungen werden geprüft, aber doppelte, werbliche oder unzureichende Nachrichten erhalten möglicherweise keine Einzelantwort.</p>`),
                    s('6. Verarbeitung von Anfragen', `<p>Absenderadresse und Inhalt können zur Antwort und Fehleranalyse verarbeitet werden. Näheres in der <a href="privacy.html">Datenschutzerklärung</a>.</p><p class="legal-contact"><strong>TentenQuiz-Betreiber</strong><br><strong>E-Mail:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            privacy: page(
                'Datenschutzerklärung | TentenQuiz',
                'Umgang von TentenQuiz mit lokalen Lerndaten, verschlüsselter Sicherung, Cookies, Google AdSense, Anfragen und Kinderdaten.',
                'Datenschutzerklärung',
                'Gültig ab: 19. August 2026',
                'Der TentenQuiz-Betreiber achtet die Privatsphäre und bemüht sich um die Einhaltung anwendbarer Gesetze und Google-Publisher-Richtlinien. Diese Erklärung beschreibt die Datenverarbeitung.',
                [
                    s('1. Verarbeitete Informationen', `<p>Eine Registrierung ist nicht nötig; der Dienst ist nicht auf direkte Erhebung von Name, Telefon oder Anschrift ausgelegt.</p><ul><li><strong>Gerätedaten:</strong> Sprachen, Lesung, Fortschritt, Fehler und Wortschatz können in Local Storage oder IndexedDB gespeichert werden.</li><li><strong>Meilenstein-Sicherung:</strong> Nach dem ersten Abschluss der 25 Fragen eines Themas werden Einstellungen und Daten im Browser verschlüsselt und als Chiffretext gesendet. Der Server kann zufällige ID, Chiffretext, Zeit, Größe und Integritätswert verarbeiten. Code und Klartext werden nicht gesendet.</li><li><strong>Automatische Daten:</strong> Hosting-, Sicherheits- und Werbeanbieter können IP, Gerät/Browser, Zeit, Nutzung, Cookies, Beacons und Werbe-IDs verarbeiten.</li><li><strong>Anfragen:</strong> Beim Kontakt werden E-Mail-Adresse und Inhalt verarbeitet.</li></ul>`),
                    s('2. Zwecke', `<p>Daten können zur Bereitstellung, Einstellungsspeicherung, Sicherung und Wiederherstellung, Fehlerbehebung, Sicherheit, Beantwortung, Nutzungsanalyse, Werbung und Leistungsmessung verwendet werden.</p>`),
                    s('3. Cookies und Google AdSense', `<p>Cookies oder ähnliche Technik können für Einstellungen und Verbesserung sowie Google AdSense für Werbung eingesetzt werden. Google und andere Drittanbieter können Cookies verwenden, um Anzeigen auf Grundlage früherer Besuche bei TentenQuiz oder anderen Websites zu schalten. Google und Partner können dadurch personalisierte Werbung nach Besuchen dieser und anderer Seiten zeigen.</p><p>Personalisierung lässt sich in den <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">Google-Werbeeinstellungen</a> oder bei <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">AboutAds</a> verwalten. Siehe <a href="https://policies.google.com/technologies/partner-sites?hl=de" target="_blank" rel="noopener noreferrer">Googles Informationen zu Partnerwebsites</a>.</p><p>Blockierter Speicher kann die Aufbewahrung von Einstellungen und Lerndaten verhindern.</p>`),
                    s('4. Aufbewahrung und Löschung', `<ul><li>Gerätedaten bleiben bis zur Löschung im Browser oder Dienst.</li><li>Verschlüsselte Sicherungen können bis zur Nutzerlöschung oder Dienstbeendigung bleiben. Ohne Code ist keine Suche nach Name oder E-Mail möglich.</li><li>Anfragen bleiben so lange wie für Support, Streitfälle oder Gesetze nötig.</li><li>Externe Anbieter richten sich nach eigenen Richtlinien und Recht.</li></ul>`),
                    s('5. Externe Dienste und Ausland', `<p>Google Firebase und andere Anbieter können Werbung, Hosting, Sicherheit, Leistung und verschlüsselte Sicherung unterstützen. Chiffretext, Cookie-IDs, IP, Gerät/Browser und Zugriffs- oder Werbeinteraktionen können im Ausland verarbeitet werden.</p><p>Im EWR, Vereinigten Königreich, der Schweiz und anderen zustimmungspflichtigen Regionen werden Wahlmöglichkeiten über eine Consent-Management-Plattform nach Recht und Google-Richtlinien angeboten.</p>`),
                    s('6. Datenschutz von Kindern', `<p>TentenQuiz richtet sich an ein breites Publikum, sammelt aber nicht absichtlich persönliche Daten von Kindern unter 13. Sie sollen keine persönlichen Daten direkt senden und eine erziehungsberechtigte Person um Hilfe bitten. Bekannt gewordene unbefugte Erhebung wird mit angemessenen Maßnahmen gelöscht.</p><p>Der Betreiber beabsichtigt keine personalisierten Werbeprofile aus bekannter Aktivität von Kindern unter 13 und wendet nötige Altersbehandlung an.</p>`),
                    s('7. Wahlmöglichkeiten und Rechte', `<p>Gerätedaten können über Browser oder Dienst eingesehen und gelöscht, Sicherungen mit Code verwaltet und Cookie- oder Werbeeinstellungen geändert werden. Da Sicherungen nicht mit Konten verbunden sind, kann nur der Codeinhaber sie laden oder löschen. Für Auskunft, Berichtigung oder Löschung von Anfragedaten bitte mailen.</p>`),
                    s('8. Sicherheit', `<p>Angemessene Maßnahmen umfassen Übertragungsschutz, Browser-Verschlüsselung, schwer erratbare Codes und Datenbankregeln. Absolute Sicherheit elektronischer Übertragung oder Speicherung kann nicht garantiert werden.</p>`),
                    s('9. Änderungen', `<p>Änderungen wegen Dienst, Recht oder Richtlinien sind möglich. Wichtige Änderungen werden im Dienst oder durch ein neues Gültigkeitsdatum bekannt gegeben.</p>`),
                    s('10. Kontakt', `<p class="legal-contact"><strong>Datenschutzkontakt:</strong> TentenQuiz-Betreiber<br><strong>E-Mail:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            terms: page(
                'Nutzungsbedingungen | TentenQuiz',
                'Bedingungen für TentenQuiz, Inhalte, Lerndaten, Werbung und Verantwortlichkeiten.',
                'Nutzungsbedingungen',
                'Gültig ab: 19. August 2026',
                'Diese Bedingungen regeln die Nutzung der Website und verbundenen Dienste des TentenQuiz-Betreibers. Mit der Nutzung stimmen Sie ihnen und der Datenschutzerklärung zu.',
                [
                    s('1. Zweck', `<p>TentenQuiz ist ein Bildungsdienst für ein breites Publikum, der Alltagswortschatz durch kurze Quizfragen, Fehlerwiederholung und eigenen Wortschatz vermittelt. Bestimmte Prüfungsnoten oder Lernergebnisse werden nicht garantiert.</p>`),
                    s('2. Nutzung', `<p>Die persönliche Nutzung ist im Rahmen von Recht und Bedingungen erlaubt. Kernquiz benötigen kein Konto. Einstellungen und Daten können im Browser bleiben; der erste Abschluss eines 25-Fragen-Themas kann eine verschlüsselte, per Code wiederherstellbare Sicherung erstellen.</p><p>Unter 13-Jährige benötigen bei persönlichen Daten oder externen Diensten Hilfe einer erziehungsberechtigten Person.</p>`),
                    s('3. Pflichten', `<p>Untersagt sind Betriebsstörung, Sicherheitsumgehung, Schadsoftware, übermäßige Automatisierung, massenhafte Extraktion oder Verteilung, Rechtsverletzung, ungültige Werbeinteraktion und rechtswidrige Nutzung.</p>`),
                    s('4. Inhalte und geistiges Eigentum', `<p>Rechte an Gestaltung, Aufbau, Datensammlung, Erklärungen und erstellten Inhalten liegen beim Betreiber oder Rechteinhaber. Einzelne Wörter und allgemeine Tatsachen werden nicht beansprucht. Kopie, Verkauf, Weitergabe oder eigene Datenbank außerhalb persönlichen Lernens brauchen Erlaubnis.</p>`),
                    s('5. Werbung und externe Dienste', `<p>Google AdSense oder andere Werbung kann Betriebskosten tragen; Cookies sind in der <a href="privacy.html">Datenschutzerklärung</a> beschrieben. Externe Links und Dienste unterliegen ihren Anbietern; deren Inhalte oder Ergebnisse werden nicht garantiert.</p>`),
                    s('6. Änderungen und Unterbrechung', `<p>Inhalte oder Funktionen können für Verbesserung, Wartung, Sicherheit oder unvermeidbare Gründe geändert oder ausgesetzt werden. Wesentliche Auswirkungen werden soweit möglich angekündigt.</p>`),
                    s('7. Lerndaten und Haftung', `<p>Wir bemühen uns um richtige, natürliche Inhalte, können regionale, kontextuelle oder technische Fehler aber nicht ausschließen. Der Dienst darf nicht alleinige Grundlage professioneller Übersetzung oder medizinischer, rechtlicher, finanzieller oder amtlicher Dokumente sein.</p><p>Der Code ist geheim zu halten. Ohne altes Gerät und Code ist die anonyme Sicherung nicht per Name oder E-Mail auffindbar. Soweit gesetzlich zulässig und ohne Vorsatz oder grobe Fahrlässigkeit haftet der Betreiber nicht für Verluste durch Katastrophen, Kommunikation, Geräteeinstellungen, Dritte oder Verstöße.</p>`),
                    s('8. Beschränkung', `<p>Bei Verstoß gegen Recht oder Bedingungen oder Gefährdung der Sicherheit kann die Nutzung beschränkt werden. Außer in dringenden Fällen werden gegebenenfalls Grund und Widerspruchsmöglichkeit genannt.</p>`),
                    s('9. Änderungen der Bedingungen', `<p>Änderungen wegen Dienst, Recht oder Richtlinien sind möglich. Wichtige Änderungen werden angekündigt oder neu datiert; weitere Nutzung danach gilt als Zustimmung.</p>`),
                    s('10. Recht und Streitfälle', `<p>Es gilt das Recht der Republik Korea. Zunächst wird eine einvernehmliche Lösung versucht; danach entscheiden zuständige koreanische Gerichte. Zwingendes Recht am Wohnort bleibt anwendbar, soweit erforderlich.</p>`),
                    s('11. Kontakt', `<p class="legal-contact"><strong>TentenQuiz-Betreiber</strong><br><strong>E-Mail:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            )
        },
        es: {
            about: page(
                'Acerca de | TentenQuiz',
                'Conoce los 2.500 conceptos cotidianos en 12 idiomas, los cuestionarios breves, el repaso y el guardado sin cuenta de TentenQuiz.',
                'Acerca de TentenQuiz',
                'Última actualización: 20 de agosto de 2026',
                'TentenQuiz es un servicio web gratuito para practicar vocabulario cotidiano en 12 idiomas mediante cuestionarios breves y repetibles. Elige tu idioma y el que deseas aprender, sin registrarte.',
                [
                    s('1. ¿Qué tipo de servicio es?', `<p>TentenQuiz se centra en recordar de forma breve y frecuente. Cada ronda incluye 10 preguntas de 10 segundos para conectar palabra y significado en sesiones pequeñas.</p><p>Admite inglés, coreano, japonés, chino simplificado y tradicional, francés, alemán, español, vietnamita, árabe, italiano y ruso. Tu idioma y el de aprendizaje deben ser distintos, y cada combinación conserva registros separados.</p>`),
                    s('2. ¿Qué puedo aprender?', `<p class="legal-highlight"><strong>2.500 conceptos esenciales de la vida diaria</strong> están disponibles en 12 idiomas, organizados en 10 etapas y 10 temas.</p><ul><li>Naturaleza, personas, salud, comida, hogar, actividades, lugares, escuela, compras y tiempo</li><li>10 etapas desde palabras familiares hasta vocabulario menos frecuente pero útil</li><li>25 palabras por tema en cada etapa</li><li>Audio de pronunciación para relacionar escritura y sonido</li></ul>`),
                    s('3. ¿Cómo se aprende?', `<ul><li>Una ronda normal contiene hasta 10 preguntas.</li><li>«Limpiar errores» permite resolver de nuevo fallos y tiempos agotados.</li><li>Mi vocabulario repite las palabras elegidas hasta que finalices.</li><li>La respuesta aparece inmediatamente tras un error o tiempo agotado.</li><li>Hay celebraciones al terminar las 25 palabras del tema y al acertar 10/10.</li></ul>`),
                    s('4. Criterios de vocabulario y traducción', `<p>Priorizamos palabras cotidianas comprensibles y fáciles de imaginar para estudiantes de unos 13 a 15 años. Se excluyen en lo posible términos muy especializados o regionales, traducciones forzadas y duplicados innecesarios.</p><p>Comprobamos la correspondencia del concepto en 12 idiomas y la presencia de escritura, lectura y audio. Como el idioma varía por región y contexto, aceptamos avisos sobre traducciones o pronunciaciones poco naturales.</p>`),
                    s('5. Progreso sin cuenta', `<p>Idiomas, progreso, errores y vocabulario se guardan primero en el navegador. No se necesita nombre, teléfono ni cuenta de correo.</p><p>Al completar por primera vez las 25 preguntas de un tema, el navegador puede cifrar los datos y crear una copia segura en la nube. El código de recuperación permite cargarlos en otro dispositivo y no se envía al servidor. Consulta la <a href="privacy.html">Política de privacidad</a>.</p>`),
                    s('6. Cómo se mantiene gratis', `<p>Las funciones esenciales son gratuitas. TentenQuiz puede usar Google AdSense o publicidad similar para financiar alojamiento y mejoras. Los anuncios se separan de respuestas y controles.</p>`),
                    s('7. Preguntas y sugerencias', `<p>Para traducción, pronunciación, técnica o accesibilidad, consulta <a href="contact.html">Ayuda y contacto</a>.</p><p class="legal-contact"><strong>Operador de TentenQuiz</strong><br><strong>Correo:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            guide: page(
                'Guía de aprendizaje | TentenQuiz',
                'Cómo usar etapas, temas, repaso de errores, vocabulario personal, audio y copias cifradas en TentenQuiz.',
                'Guía de aprendizaje de TentenQuiz',
                'Instrucciones paso a paso',
                'TentenQuiz entrena el recuerdo rápido: responde en 10 segundos, vuelve a resolver los errores y repite palabras elegidas. Esta guía cubre desde la elección de idioma hasta la recuperación.',
                [
                    s('1. Inicio rápido', `<ol><li>Elige <strong>Mi idioma</strong> para significados e interfaz.</li><li>Elige el idioma que aprenderás.</li><li>Selecciona una etapa adecuada.</li><li>Selecciona un tema cotidiano.</li><li>Escucha o lee y elige el significado correcto entre cuatro opciones en 10 segundos.</li></ol><p class="legal-highlight"><strong>Para empezar:</strong> elige un tema de la etapa 1, completa 10 preguntas y repasa los errores antes de continuar.</p>`),
                    s('2. Etapas y temas', `<p>El mapa contiene <strong>10 etapas × 10 temas × 25 palabras</strong>: 250 conceptos por etapa y 2.500 en total.</p><ul><li>Naturaleza / Clima</li><li>Personas / Relaciones</li><li>Cuerpo / Salud</li><li>Comida / Bebida</li><li>Hogar / Vida diaria</li><li>Actividades / Ocio</li><li>Lugares / Transporte</li><li>Escuela / Trabajo</li><li>Compras / Dinero</li><li>Tiempo / Calendario</li></ul><p>La <strong>etapa</strong> marca el orden de aprendizaje y el <strong>tema</strong> agrupa situaciones. Puedes estudiar los temas de una etapa en cualquier orden y cada uno mantiene su progreso.</p>`),
                    s('3. Cuestionario de 10 segundos y 10 preguntas', `<p>Una ronda normal presenta hasta 10 palabras al azar. El altavoz repite la pronunciación. Un acierto avanza rápidamente; un error o tiempo agotado muestra el significado y añade la palabra a los errores de la etapa.</p><p>Al intentar las 25 palabras del tema, el botón muestra el final y una pequeña celebración. Un 10/10 activa la celebración perfecta.</p>`),
                    s('4. Limpiar errores', `<ol><li>Errores y tiempos agotados se guardan automáticamente.</li><li>Abre «Limpiar errores» en la etapa actual.</li><li>Al acertar, la palabra sale de la lista.</li><li>Si vuelves a fallar, queda para otro repaso.</li></ol><p>Intenta llevar el contador a cero antes de avanzar mucho contenido nuevo.</p>`),
                    s('5. Mi vocabulario', `<p>Añade desde los resultados cualquier palabra importante. Las preguntas se mezclan y repiten hasta que termines. Tras un error o tiempo agotado, aparece la respuesta y se pronuncia una vez su significado en tu idioma.</p><p>Las listas se separan por tu idioma, idioma de aprendizaje y etapa.</p>`),
                    s('6. Rutina recomendada', `<ol><li>Responde 10 preguntas nuevas.</li><li>Limpia los errores inmediatamente.</li><li>Añade palabras importantes o confusas.</li><li>Completa las 25 palabras del tema.</li><li>Haz un repaso breve al día siguiente.</li></ol><p>Volver con regularidad en sesiones cortas importa más que terminar una etapa de una vez.</p>`),
                    s('7. Guardar y recuperar', `<p>Configuración y datos se guardan en el navegador. Al completar por primera vez un tema de 25 palabras también se crea una copia cifrada en la nube. Guarda el código en privado.</p><ul><li>No compartas el código.</li><li>Sin el dispositivo anterior y el código, el operador no puede encontrar la copia anónima.</li><li>Ten especial cuidado en ordenadores compartidos.</li></ul>`),
                    s('8. Preguntas frecuentes', `<h3>¿Puedo mezclar temas de una etapa?</h3><p>Sí, cada tema registra por separado sus 25 palabras.</p><h3>¿Se mezclan los datos al cambiar idioma?</h3><p>No, se separan por tu idioma, idioma aprendido y etapa.</p><h3>¿Un error cuenta como progreso?</h3><p>El progreso indica que se intentó la palabra; queda en errores para dominarla.</p><h3>¿No hay sonido?</h3><p>Comprueba volumen y silencio del sitio. Algunos navegadores necesitan un primer toque.</p><h3>¿Se puede instalar?</h3><p>En navegadores compatibles usa el pequeño aviso y abre después desde el acceso directo o icono de inicio.</p>`),
                    s('9. ¿Necesitas ayuda?', `<p>Para ortografía, traducción, pronunciación, recuperación o accesibilidad, consulta <a href="contact.html">Ayuda y contacto</a>. En problemas técnicos indica dispositivo, navegador y ambos idiomas.</p><p class="legal-contact"><strong>Correo:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            contact: page(
                'Ayuda y contacto | TentenQuiz',
                'Ayuda sobre traducción, pronunciación, técnica, registros, accesibilidad y políticas de TentenQuiz.',
                'Ayuda y contacto',
                'Cuéntanos qué dificulta tu aprendizaje.',
                'Si una traducción o pronunciación parece incorrecta, una función falla o tienes dudas sobre los registros, revisa primero estos puntos y escribe si sigue sin resolverse.',
                [
                    s('Ayuda por correo', `<p class="legal-contact"><strong>Correo:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a><br>Asunto sugerido: <strong>[Pronunciación]</strong>, <strong>[Traducción]</strong>, <strong>[Error técnico]</strong> o <strong>[Registros]</strong>.</p>`),
                    s('1. Comprobaciones rápidas', `<ul><li>Comprueba Internet y actualiza una vez.</li><li>Para audio, revisa volumen, silencio del sitio y ajuste de sonido.</li><li>Si los datos difieren, verifica tu idioma, el idioma aprendido y la etapa.</li><li>La invitación de instalación se oculta si ya está instalado.</li><li>Consulta la <a href="guide.html">Guía de aprendizaje</a> para funciones y recuperación.</li></ul>`),
                    s('2. ¿Qué se puede informar?', `<ul><li><strong>Traducción:</strong> palabra, idiomas, significado y propuesta</li><li><strong>Pronunciación:</strong> palabra, idioma, etapa/tema y tipo de problema</li><li><strong>Técnica:</strong> dispositivo, sistema, navegador, pasos y captura útil</li><li><strong>Registros:</strong> idiomas, etapa, función y mensaje</li><li><strong>Accesibilidad:</strong> ayuda usada y pantalla difícil</li><li><strong>Publicidad/política:</strong> pantalla, hora, país y captura sin datos personales</li></ul>`),
                    s('3. Describir un fallo', `<ol><li>Nombra la pantalla afectada.</li><li>Enumera las acciones anteriores.</li><li>Separa lo esperado de lo ocurrido.</li><li>Indica dispositivo y navegador.</li><li>Oculta código y datos personales en imágenes.</li></ol>`),
                    s('4. Información que nunca debes enviar', `<p class="legal-highlight"><strong>No envíes el código de recuperación completo.</strong> Es la llave secreta de los datos cifrados. El operador no pide ese código, contraseñas, pagos ni identificación.</p><p>No envíes números oficiales, tarjetas, contraseñas, direcciones o teléfonos innecesarios. Menores de 13 años deben pedir a un tutor que envíe mensajes con información personal.</p>`),
                    s('5. Ayuda frecuente', `<h3>¿Puede el operador encontrar un código perdido?</h3><p>No. No hay cuenta y el código no se envía.</p><h3>¿Se recuperan datos borrados del navegador?</h3><p>Solo con una copia cloud existente y su código.</p><h3>¿Se mezclan varios idiomas?</h3><p>No. Selecciona la misma combinación y etapa anteriores.</p><h3>¿Se responde a cada mensaje?</h3><p>Se revisan los informes, pero duplicados, publicidad o mensajes sin datos suficientes pueden no recibir respuesta individual.</p>`),
                    s('6. Tratamiento de consultas', `<p>La dirección y el contenido pueden tratarse para responder y solucionar el problema. Consulta la <a href="privacy.html">Política de privacidad</a>.</p><p class="legal-contact"><strong>Operador de TentenQuiz</strong><br><strong>Correo:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            privacy: page(
                'Política de privacidad | TentenQuiz',
                'Tratamiento de datos locales, copias cifradas, cookies, Google AdSense, consultas y privacidad infantil en TentenQuiz.',
                'Política de privacidad',
                'Vigente desde: 19 de agosto de 2026',
                'El operador de TentenQuiz respeta la privacidad y procura cumplir la ley aplicable y las políticas de editores de Google. Esta política explica el tratamiento de información.',
                [
                    s('1. Información tratada', `<p>No se requiere registro y el servicio no está diseñado para recoger directamente nombre, teléfono o dirección.</p><ul><li><strong>En el dispositivo:</strong> idiomas, lectura, progreso, errores y vocabulario pueden guardarse en Local Storage o IndexedDB.</li><li><strong>Copia de logro:</strong> al completar por primera vez 25 preguntas de un tema, configuración y datos se cifran en el navegador y se envían como texto cifrado. El servidor puede tratar ID aleatorio, texto cifrado, fecha, tamaño y valor de integridad. No se envían código ni datos sin cifrar.</li><li><strong>Datos automáticos:</strong> proveedores de alojamiento, seguridad y publicidad pueden tratar IP, dispositivo/navegador, hora, actividad, cookies, balizas e identificadores publicitarios.</li><li><strong>Consultas:</strong> se tratan dirección y contenido cuando escribes.</li></ul>`),
                    s('2. Finalidades', `<p>La información puede usarse para prestar el servicio, conservar ajustes, copiar y restaurar, corregir errores, mantener seguridad, responder, analizar uso, mostrar anuncios y medir rendimiento.</p>`),
                    s('3. Cookies y Google AdSense', `<p>El servicio puede usar cookies o tecnología similar para ajustes y mejoras, y Google AdSense para publicidad. Google y otros proveedores externos pueden usar cookies para mostrar anuncios basados en visitas anteriores a TentenQuiz u otros sitios. Las cookies publicitarias permiten a Google y sus socios ofrecer anuncios personalizados según visitas a este y otros sitios.</p><p>Gestiona la personalización en <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">Configuración de anuncios de Google</a> o <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">AboutAds</a>. Consulta <a href="https://policies.google.com/technologies/partner-sites?hl=es" target="_blank" rel="noopener noreferrer">cómo Google usa datos de sitios asociados</a>.</p><p>Bloquear almacenamiento puede impedir conservar ajustes y datos de aprendizaje.</p>`),
                    s('4. Conservación y eliminación', `<ul><li>Los datos locales permanecen hasta borrarlos en navegador o servicio.</li><li>La copia cifrada puede permanecer hasta que el usuario la borre o termine el servicio. Sin código no puede buscarse por nombre o correo.</li><li>Las consultas se conservan lo necesario para soporte, disputas o ley.</li><li>Los proveedores externos siguen sus políticas y la ley.</li></ul>`),
                    s('5. Servicios externos y transferencias', `<p>Google Firebase y otros proveedores pueden apoyar publicidad, alojamiento, seguridad, rendimiento y copia cifrada. Texto cifrado, cookies, IP, dispositivo/navegador e interacciones pueden tratarse en el extranjero.</p><p>En EEE, Reino Unido, Suiza y otras regiones que requieren consentimiento, una plataforma de gestión ofrece las opciones exigidas por la ley y Google.</p>`),
                    s('6. Privacidad infantil', `<p>TentenQuiz se dirige a un público amplio, pero no recoge intencionadamente datos personales de menores de 13 años. No deben enviar información directamente y deben pedir ayuda a un tutor. Si se conoce una recogida no autorizada, se tomarán medidas razonables para eliminarla.</p><p>El operador no pretende crear perfiles de publicidad personalizada basados en actividad conocida de menores de 13 y aplica el tratamiento de edad requerido.</p>`),
                    s('7. Opciones y derechos', `<p>Puedes consultar o borrar datos locales, gestionar copias con el código y cambiar cookies o publicidad personalizada. Como las copias no se vinculan a cuentas, solo quien tiene el código puede restaurarlas o borrarlas. Escribe para acceso, corrección o eliminación de datos de consultas.</p>`),
                    s('8. Seguridad', `<p>Las medidas razonables incluyen protección de transmisión, cifrado en navegador, códigos difíciles y reglas de base de datos. Ninguna transmisión o conservación electrónica es totalmente segura.</p>`),
                    s('9. Cambios', `<p>La política puede cambiar por el servicio, la ley o las normas. Los cambios importantes se anuncian en el servicio o actualizando la fecha.</p>`),
                    s('10. Contacto', `<p class="legal-contact"><strong>Contacto de privacidad:</strong> operador de TentenQuiz<br><strong>Correo:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            terms: page(
                'Términos de servicio | TentenQuiz',
                'Condiciones de uso de TentenQuiz, contenido, datos de aprendizaje, publicidad y responsabilidades.',
                'Términos de servicio',
                'Vigentes desde: 19 de agosto de 2026',
                'Estos términos regulan el sitio y los servicios relacionados del operador de TentenQuiz. Al usarlos, aceptas estos términos y la Política de privacidad.',
                [
                    s('1. Finalidad', `<p>TentenQuiz es un servicio educativo para público amplio que enseña vocabulario diario mediante cuestionarios cortos, repaso de errores y vocabulario personal. No garantiza notas ni resultados concretos.</p>`),
                    s('2. Uso', `<p>Puede usarse para aprendizaje personal respetando ley y términos. Los cuestionarios esenciales no requieren cuenta. Ajustes y datos pueden quedar en el navegador; completar por primera vez un tema de 25 preguntas puede crear una copia cifrada recuperable mediante código.</p><p>Menores de 13 años deben pedir ayuda de un tutor cuando haya datos personales o servicios externos.</p>`),
                    s('3. Obligaciones', `<p>Se prohíbe interrumpir el servicio, eludir seguridad, distribuir malware, automatizar en exceso, extraer o redistribuir masivamente, infringir derechos, generar actividad publicitaria inválida o usar ilegalmente.</p>`),
                    s('4. Contenido y propiedad intelectual', `<p>Diseño, organización, datos compilados, explicaciones y contenido creado pertenecen al operador o titulares. No se reclaman palabras individuales ni hechos generales. Copiar, vender, redistribuir o crear otra base fuera del aprendizaje personal requiere permiso.</p>`),
                    s('5. Publicidad y servicios externos', `<p>Google AdSense u otros anuncios pueden financiar el servicio, con cookies descritas en la <a href="privacy.html">Política de privacidad</a>. Enlaces y servicios externos siguen sus propios términos; el operador no garantiza su contenido ni resultados.</p>`),
                    s('6. Cambios e interrupción', `<p>Contenido o funciones pueden cambiar o suspenderse por mejora, mantenimiento, seguridad o necesidad operativa. Los efectos importantes se anunciarán cuando sea razonable.</p>`),
                    s('7. Datos y responsabilidad', `<p>Procuramos materiales correctos y naturales, pero pueden existir diferencias regionales, contextuales o errores técnicos. No uses el servicio como única base para traducción profesional, asesoramiento médico, legal o financiero ni documentos oficiales.</p><p>Mantén el código secreto. Sin dispositivo anterior y código no puede encontrarse la copia anónima por nombre o correo. Salvo responsabilidades obligatorias y sin dolo o negligencia grave, el operador no responde por pérdidas debidas a desastres, comunicaciones, ajustes, terceros o incumplimiento.</p>`),
                    s('8. Restricción', `<p>El uso puede limitarse si se violan ley o términos o se amenaza la seguridad. Salvo urgencia, se indicarán motivo y vía de objeción cuando corresponda.</p>`),
                    s('9. Cambios de términos', `<p>Pueden modificarse por cambios del servicio, ley o normas. Los cambios importantes se anuncian o fechan; continuar después implica aceptación.</p>`),
                    s('10. Ley y disputas', `<p>Se interpretan conforme a la ley de la República de Corea. Primero se buscará acuerdo y, si no, resolverán los tribunales competentes de Corea. Las normas imperativas del lugar de residencia se aplican cuando corresponda.</p>`),
                    s('11. Contacto', `<p class="legal-contact"><strong>Operador de TentenQuiz</strong><br><strong>Correo:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            )
        },
        vi: {
            about: page(
                'Giới thiệu | TentenQuiz',
                'Tìm hiểu 2.500 khái niệm đời sống bằng 12 ngôn ngữ, câu đố ngắn, công cụ ôn tập và cách lưu không cần tài khoản của TentenQuiz.',
                'Giới thiệu TentenQuiz',
                'Cập nhật gần nhất: 20 tháng 8 năm 2026',
                'TentenQuiz là dịch vụ học miễn phí trên web, giúp luyện từ vựng đời sống bằng 12 ngôn ngữ qua các lượt đố ngắn và có thể lặp lại. Bạn chọn ngôn ngữ của mình và ngôn ngữ muốn học mà không cần đăng ký.',
                [
                    s('1. Đây là dịch vụ gì?', `<p>TentenQuiz chú trọng nhớ nhanh và lặp lại thường xuyên. Mỗi lượt có 10 câu, mỗi câu 10 giây, giúp nối từ với nghĩa trong những phiên học nhỏ.</p><p>Hỗ trợ tiếng Anh, Hàn, Nhật, Trung giản thể, Trung phồn thể, Pháp, Đức, Tây Ban Nha, Việt, Ả Rập, Ý và Nga. Ngôn ngữ của bạn phải khác ngôn ngữ học; dữ liệu của từng cặp ngôn ngữ được tách riêng.</p>`),
                    s('2. Có thể học gì?', `<p class="legal-highlight"><strong>2.500 khái niệm đời sống cốt lõi</strong> có trong cả 12 ngôn ngữ, được chia thành 10 cấp độ và 10 chủ đề.</p><ul><li>Thiên nhiên, con người, sức khỏe, ăn uống, nhà cửa, hoạt động, địa điểm, trường học, mua sắm và thời gian</li><li>10 cấp độ từ từ quen thuộc đến từ ít gặp hơn nhưng hữu ích</li><li>25 từ cho mỗi chủ đề ở mỗi cấp độ</li><li>Âm thanh phát âm để nối chữ viết và âm thanh</li></ul>`),
                    s('3. Học như thế nào?', `<ul><li>Một lượt bình thường có tối đa 10 câu.</li><li>“Xóa câu sai” cho phép làm lại câu sai hoặc hết giờ.</li><li>Sổ từ của tôi lặp lại từ đã chọn cho đến khi bạn dừng.</li><li>Đáp án xuất hiện ngay sau khi sai hoặc hết giờ.</li><li>Có hiệu ứng khi hoàn thành 25 từ của chủ đề và khi đúng 10/10.</li></ul>`),
                    s('4. Nguyên tắc từ vựng và bản dịch', `<p>Ưu tiên từ thông dụng, dễ hiểu và dễ hình dung đối với người học khoảng 13–15 tuổi. Hạn chế thuật ngữ quá chuyên môn, cách nói quá khu vực, bản dịch gượng ép và trùng lặp không cần thiết.</p><p>Chúng tôi kiểm tra sự liên kết của một khái niệm trong 12 ngôn ngữ cùng chính tả, cách đọc và đường dẫn âm thanh. Vì ngôn ngữ thay đổi theo vùng và ngữ cảnh, chúng tôi tiếp nhận báo cáo về bản dịch hay phát âm chưa tự nhiên.</p>`),
                    s('5. Lưu tiến độ không cần tài khoản', `<p>Ngôn ngữ, tiến độ, câu sai và sổ từ trước hết được tự động lưu trong trình duyệt. Không cần tên, số điện thoại hay tài khoản email.</p><p>Khi lần đầu hoàn thành 25 câu của một chủ đề, trình duyệt có thể mã hóa dữ liệu và tạo bản sao lưu đám mây an toàn. Mã khôi phục dùng để tải trên thiết bị khác và không được gửi lên máy chủ. Xem <a href="privacy.html">Chính sách quyền riêng tư</a>.</p>`),
                    s('6. Duy trì dịch vụ miễn phí', `<p>Các chức năng học chính được cung cấp miễn phí. TentenQuiz có thể dùng Google AdSense hoặc quảng cáo tương tự để hỗ trợ chi phí máy chủ và cải thiện nội dung. Quảng cáo được tách khỏi đáp án và nút học.</p>`),
                    s('7. Câu hỏi và góp ý', `<p>Với vấn đề dịch, phát âm, kỹ thuật hoặc khả năng tiếp cận, hãy xem <a href="contact.html">Trợ giúp & liên hệ</a>.</p><p class="legal-contact"><strong>Đơn vị vận hành TentenQuiz</strong><br><strong>Email:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            guide: page(
                'Hướng dẫn học | TentenQuiz',
                'Cách dùng cấp độ, chủ đề, xóa câu sai, sổ từ, âm thanh và sao lưu mã hóa trong TentenQuiz.',
                'Hướng dẫn học TentenQuiz',
                'Các bước dành cho người mới',
                'TentenQuiz rèn khả năng nhớ nhanh: trả lời trong 10 giây, làm lại câu sai và lặp từ đã chọn. Hướng dẫn này đi từ chọn ngôn ngữ đến khôi phục tiến độ.',
                [
                    s('1. Bắt đầu nhanh', `<ol><li>Chọn <strong>Ngôn ngữ của tôi</strong> dùng cho nghĩa và giao diện.</li><li>Chọn ngôn ngữ muốn học.</li><li>Chọn cấp độ phù hợp.</li><li>Chọn một chủ đề đời sống.</li><li>Nghe hoặc đọc rồi chọn nghĩa đúng trong bốn đáp án trong 10 giây.</li></ol><p class="legal-highlight"><strong>Người mới:</strong> hãy bắt đầu với một chủ đề ở cấp 1, làm 10 câu và ôn câu sai trước khi tiếp tục.</p>`),
                    s('2. Cấp độ và chủ đề', `<p>Lộ trình gồm <strong>10 cấp độ × 10 chủ đề × 25 từ</strong>: 250 khái niệm mỗi cấp và 2.500 tổng cộng.</p><ul><li>Thiên nhiên / Thời tiết</li><li>Con người / Quan hệ</li><li>Cơ thể / Sức khỏe</li><li>Đồ ăn / Đồ uống</li><li>Nhà / Đời sống</li><li>Hoạt động / Giải trí</li><li>Địa điểm / Giao thông</li><li>Trường học / Công việc</li><li>Mua sắm / Tiền</li><li>Thời gian / Lịch</li></ul><p><strong>Cấp độ</strong> thể hiện thứ tự học, <strong>chủ đề</strong> nhóm theo tình huống. Có thể học các chủ đề cùng cấp theo bất kỳ thứ tự nào và tiến độ được tách riêng.</p>`),
                    s('3. Câu đố 10 giây, 10 câu', `<p>Một lượt thường đưa ra ngẫu nhiên tối đa 10 từ. Nút loa phát lại cách đọc. Đúng sẽ nhanh chóng sang câu sau; sai hoặc hết giờ sẽ hiện nghĩa đúng và thêm từ vào danh sách sai của cấp đó.</p><p>Sau khi thử đủ 25 từ của chủ đề, nút hiển thị hoàn thành và hiệu ứng nhỏ. Đúng 10/10 sẽ mở hiệu ứng điểm tuyệt đối.</p>`),
                    s('4. Xóa câu sai', `<ol><li>Câu sai và hết giờ được tự động lưu.</li><li>Mở “Xóa câu sai” trong cấp hiện tại.</li><li>Trả lời đúng để xóa từ khỏi danh sách.</li><li>Nếu lại sai, từ vẫn ở đó cho lần ôn sau.</li></ol><p>Nên đưa bộ đếm về 0 trước khi học quá nhiều nội dung mới.</p>`),
                    s('5. Sổ từ của tôi', `<p>Thêm bất kỳ từ quan trọng nào từ màn hình kết quả. Câu hỏi được xáo và lặp đến khi bạn dừng. Khi sai hoặc hết giờ, đáp án hiện lên và nghĩa được đọc một lần bằng ngôn ngữ của bạn.</p><p>Danh sách tách theo ngôn ngữ của bạn, ngôn ngữ học và cấp độ.</p>`),
                    s('6. Lịch ôn gợi ý', `<ol><li>Làm 10 câu mới.</li><li>Xóa câu sai ngay.</li><li>Thêm từ quan trọng hoặc dễ nhầm.</li><li>Hoàn thành 25 từ của chủ đề.</li><li>Ôn ngắn sổ từ vào ngày hôm sau.</li></ol><p>Quay lại đều đặn trong thời gian ngắn quan trọng hơn hoàn thành cả cấp trong một lần.</p>`),
                    s('7. Lưu và khôi phục', `<p>Cài đặt và dữ liệu học được lưu trong trình duyệt. Lần đầu hoàn thành chủ đề 25 từ cũng tạo bản sao mã hóa trên đám mây. Hãy giữ mã khôi phục riêng tư.</p><ul><li>Không chia sẻ mã.</li><li>Nếu mất cả thiết bị cũ và mã, đơn vị vận hành không thể tìm bản sao ẩn danh.</li><li>Đặc biệt cẩn thận trên máy tính dùng chung.</li></ul>`),
                    s('8. Câu hỏi thường gặp', `<h3>Có thể trộn chủ đề trong cùng cấp?</h3><p>Có. Mỗi chủ đề theo dõi riêng 25 từ.</p><h3>Dữ liệu có trộn khi đổi ngôn ngữ?</h3><p>Không. Dữ liệu tách theo ngôn ngữ của bạn, ngôn ngữ học và cấp độ.</p><h3>Câu sai có tính vào tiến độ?</h3><p>Tiến độ cho biết đã thử từ; từ sai vẫn ở phần xóa câu sai để luyện lại.</p><h3>Không có âm thanh?</h3><p>Kiểm tra âm lượng và trạng thái tắt tiếng trang. Một số trình duyệt cần chạm màn hình trước.</p><h3>Có thể cài như ứng dụng?</h3><p>Trên trình duyệt hỗ trợ, dùng lời mời nhỏ rồi mở từ lối tắt hoặc biểu tượng màn hình chính.</p>`),
                    s('9. Cần thêm trợ giúp?', `<p>Với lỗi chính tả, dịch, phát âm, khôi phục hoặc khả năng tiếp cận, xem <a href="contact.html">Trợ giúp & liên hệ</a>. Khi báo lỗi kỹ thuật, ghi thiết bị, trình duyệt và hai ngôn ngữ.</p><p class="legal-contact"><strong>Email:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            contact: page(
                'Trợ giúp & liên hệ | TentenQuiz',
                'Trợ giúp về bản dịch, phát âm, kỹ thuật, dữ liệu học, khả năng tiếp cận và chính sách TentenQuiz.',
                'Trợ giúp & liên hệ',
                'Hãy báo cho chúng tôi điều làm việc học khó khăn.',
                'Nếu bản dịch hoặc phát âm có vẻ sai, chức năng không hoạt động hoặc bạn có câu hỏi về dữ liệu, hãy kiểm tra dưới đây rồi gửi email nếu chưa giải quyết.',
                [
                    s('Hỗ trợ qua email', `<p class="legal-contact"><strong>Email:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a><br>Tiêu đề gợi ý: <strong>[Phát âm]</strong>, <strong>[Bản dịch]</strong>, <strong>[Lỗi kỹ thuật]</strong> hoặc <strong>[Dữ liệu học]</strong>.</p>`),
                    s('1. Kiểm tra nhanh', `<ul><li>Kiểm tra Internet và tải lại một lần.</li><li>Với âm thanh, kiểm tra âm lượng, tắt tiếng trang và cài đặt âm.</li><li>Nếu dữ liệu khác, kiểm tra ngôn ngữ của bạn, ngôn ngữ học và cấp.</li><li>Lời mời cài đặt ẩn nếu thiết bị đã cài.</li><li>Xem <a href="guide.html">Hướng dẫn học</a> về chức năng và khôi phục.</li></ul>`),
                    s('2. Có thể báo gì?', `<ul><li><strong>Bản dịch:</strong> từ, cặp ngôn ngữ, nghĩa hiển thị và đề xuất</li><li><strong>Phát âm:</strong> từ, ngôn ngữ, cấp/chủ đề và dạng lỗi</li><li><strong>Kỹ thuật:</strong> thiết bị, hệ điều hành, trình duyệt, các bước và ảnh cần thiết</li><li><strong>Dữ liệu:</strong> cặp ngôn ngữ, cấp, chức năng và thông báo</li><li><strong>Khả năng tiếp cận:</strong> công cụ hỗ trợ và màn hình khó dùng</li><li><strong>Quảng cáo/chính sách:</strong> màn hình, thời gian, quốc gia và ảnh đã che thông tin</li></ul>`),
                    s('3. Mô tả lỗi kỹ thuật', `<ol><li>Nêu màn hình xảy ra lỗi.</li><li>Liệt kê thao tác ngay trước đó.</li><li>Tách kết quả mong đợi và thực tế.</li><li>Ghi thiết bị và trình duyệt.</li><li>Che mã khôi phục và thông tin cá nhân trong ảnh.</li></ol>`),
                    s('4. Thông tin không được gửi', `<p class="legal-highlight"><strong>Không gửi toàn bộ mã khôi phục qua email.</strong> Đây là khóa bí mật của dữ liệu mã hóa. Đơn vị vận hành không hỏi mã, mật khẩu, thanh toán hay giấy tờ tùy thân.</p><p>Không gửi số định danh, thẻ, mật khẩu, địa chỉ hay số điện thoại không cần thiết. Người dưới 13 tuổi nên nhờ người giám hộ gửi thông tin cá nhân.</p>`),
                    s('5. Trợ giúp thường gặp', `<h3>Có thể tìm mã khôi phục bị mất?</h3><p>Không. Không có tài khoản và mã không được gửi lên máy chủ.</p><h3>Dữ liệu trình duyệt đã xóa có khôi phục được?</h3><p>Chỉ khi có bản sao đám mây và mã.</p><h3>Nhiều ngôn ngữ có trộn dữ liệu?</h3><p>Không. Hãy chọn lại đúng cặp ngôn ngữ và cấp trước đây.</p><h3>Mọi email đều được trả lời?</h3><p>Báo cáo được xem xét, nhưng thư trùng, quảng cáo hoặc thiếu chi tiết có thể không được trả lời riêng.</p>`),
                    s('6. Xử lý thông tin liên hệ', `<p>Địa chỉ gửi và nội dung có thể được xử lý để trả lời và sửa lỗi. Xem <a href="privacy.html">Chính sách quyền riêng tư</a>.</p><p class="legal-contact"><strong>Đơn vị vận hành TentenQuiz</strong><br><strong>Email:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            privacy: page(
                'Chính sách quyền riêng tư | TentenQuiz',
                'Cách TentenQuiz xử lý dữ liệu học cục bộ, sao lưu mã hóa, cookie, Google AdSense, liên hệ và quyền riêng tư trẻ em.',
                'Chính sách quyền riêng tư',
                'Có hiệu lực: 19 tháng 8 năm 2026',
                'Đơn vị vận hành TentenQuiz coi trọng quyền riêng tư và cố gắng tuân thủ luật áp dụng cùng chính sách nhà xuất bản Google. Chính sách này giải thích việc xử lý thông tin.',
                [
                    s('1. Thông tin được xử lý', `<p>Không cần đăng ký và dịch vụ không được thiết kế để trực tiếp thu thập tên, điện thoại hoặc địa chỉ.</p><ul><li><strong>Trên thiết bị:</strong> ngôn ngữ, cách đọc, tiến độ, câu sai và sổ từ có thể lưu trong Local Storage hoặc IndexedDB.</li><li><strong>Sao lưu thành tích:</strong> sau lần đầu hoàn thành 25 câu của chủ đề, cài đặt và dữ liệu được mã hóa trong trình duyệt rồi gửi dưới dạng bản mã. Máy chủ có thể xử lý ID ngẫu nhiên, bản mã, thời gian, kích thước và giá trị toàn vẹn. Mã khôi phục và dữ liệu rõ không được gửi.</li><li><strong>Dữ liệu tự động:</strong> nhà cung cấp máy chủ, bảo mật và quảng cáo có thể xử lý IP, thiết bị/trình duyệt, thời gian, hoạt động, cookie, beacon và mã quảng cáo.</li><li><strong>Liên hệ:</strong> địa chỉ email và nội dung được xử lý khi bạn viết.</li></ul>`),
                    s('2. Mục đích', `<p>Thông tin có thể dùng để cung cấp dịch vụ, giữ cài đặt, sao lưu và khôi phục, sửa lỗi, bảo mật, trả lời, phân tích sử dụng, hiển thị quảng cáo và đo hiệu quả.</p>`),
                    s('3. Cookie và Google AdSense', `<p>Dịch vụ có thể dùng cookie hoặc công nghệ tương tự cho cài đặt, cải thiện và dùng Google AdSense cho quảng cáo. Google và nhà cung cấp bên thứ ba có thể dùng cookie để hiển thị quảng cáo dựa trên lần ghé TentenQuiz hoặc trang khác trước đây. Cookie quảng cáo cho phép Google và đối tác đưa quảng cáo cá nhân hóa dựa trên các lần ghé đó.</p><p>Quản lý tại <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">Cài đặt quảng cáo Google</a> hoặc <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">AboutAds</a>. Xem <a href="https://policies.google.com/technologies/partner-sites?hl=vi" target="_blank" rel="noopener noreferrer">cách Google dùng dữ liệu trang đối tác</a>.</p><p>Chặn lưu trữ có thể khiến cài đặt và dữ liệu học không được giữ.</p>`),
                    s('4. Lưu giữ và xóa', `<ul><li>Dữ liệu thiết bị còn đến khi xóa trong trình duyệt hoặc dịch vụ.</li><li>Bản sao mã hóa có thể còn đến khi người dùng xóa hoặc dịch vụ sao lưu kết thúc. Không có mã thì không thể tìm theo tên hoặc email.</li><li>Thư liên hệ được giữ trong thời gian cần cho hỗ trợ, tranh chấp hoặc luật.</li><li>Nhà cung cấp ngoài theo chính sách và luật của họ.</li></ul>`),
                    s('5. Dịch vụ ngoài và xử lý quốc tế', `<p>Google Firebase và nhà cung cấp khác có thể hỗ trợ quảng cáo, máy chủ, bảo mật, hiệu suất và sao lưu mã hóa. Bản mã, ID cookie, IP, thiết bị/trình duyệt và tương tác có thể được xử lý ở nước ngoài.</p><p>Tại EEA, Vương quốc Anh, Thụy Sĩ và nơi cần đồng ý, nền tảng quản lý sự đồng ý cung cấp lựa chọn theo luật và chính sách Google.</p>`),
                    s('6. Quyền riêng tư trẻ em', `<p>TentenQuiz dành cho nhiều lứa tuổi nhưng không cố ý thu thập dữ liệu cá nhân của trẻ dưới 13. Các em không nên gửi trực tiếp và cần nhờ người giám hộ. Khi biết có thu thập trái phép, chúng tôi sẽ áp dụng biện pháp hợp lý để xóa.</p><p>Đơn vị vận hành không có ý định tạo hồ sơ quảng cáo cá nhân hóa từ hoạt động được biết là của trẻ dưới 13 và áp dụng xử lý độ tuổi khi cần.</p>`),
                    s('7. Lựa chọn và quyền của bạn', `<p>Bạn có thể xem hoặc xóa dữ liệu thiết bị, quản lý bản sao bằng mã và đổi cookie hoặc quảng cáo cá nhân hóa. Vì bản sao không gắn tài khoản, chỉ người có mã mới khôi phục hoặc xóa. Hãy viết email để yêu cầu truy cập, sửa hoặc xóa dữ liệu liên hệ do đơn vị vận hành giữ.</p>`),
                    s('8. Bảo mật', `<p>Biện pháp hợp lý gồm bảo vệ truyền tải, mã hóa trong trình duyệt, mã khó đoán và quy tắc cơ sở dữ liệu. Không phương thức truyền hay lưu điện tử nào an toàn tuyệt đối.</p>`),
                    s('9. Thay đổi', `<p>Chính sách có thể đổi theo dịch vụ, luật hoặc quy định. Thay đổi quan trọng được thông báo trong dịch vụ hoặc bằng ngày hiệu lực mới.</p>`),
                    s('10. Liên hệ', `<p class="legal-contact"><strong>Liên hệ quyền riêng tư:</strong> đơn vị vận hành TentenQuiz<br><strong>Email:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            terms: page(
                'Điều khoản sử dụng | TentenQuiz',
                'Điều kiện sử dụng TentenQuiz, nội dung, dữ liệu học, quảng cáo và trách nhiệm.',
                'Điều khoản sử dụng',
                'Có hiệu lực: 19 tháng 8 năm 2026',
                'Các điều khoản này điều chỉnh trang web và dịch vụ liên quan do đơn vị vận hành TentenQuiz cung cấp. Khi sử dụng, bạn đồng ý với điều khoản và Chính sách quyền riêng tư.',
                [
                    s('1. Mục đích', `<p>TentenQuiz là dịch vụ giáo dục cho nhiều lứa tuổi, dạy từ vựng đời sống qua câu đố ngắn, ôn câu sai và sổ từ cá nhân. Dịch vụ không đảm bảo điểm thi hay kết quả cụ thể.</p>`),
                    s('2. Sử dụng', `<p>Có thể dùng cho học cá nhân theo luật và điều khoản. Câu đố chính không cần tài khoản. Cài đặt và dữ liệu có thể ở trong trình duyệt; lần đầu hoàn thành chủ đề 25 câu có thể tạo bản sao mã hóa khôi phục bằng mã.</p><p>Người dưới 13 tuổi cần người giám hộ giúp khi có dữ liệu cá nhân hoặc dịch vụ ngoài.</p>`),
                    s('3. Nghĩa vụ', `<p>Không được cản trở dịch vụ, vượt bảo mật, phát tán mã độc, tự động quá mức, thu thập hoặc phân phối hàng loạt, xâm phạm quyền, tạo tương tác quảng cáo không hợp lệ hoặc dùng trái luật.</p>`),
                    s('4. Nội dung và sở hữu trí tuệ', `<p>Quyền đối với thiết kế, tổ chức, dữ liệu tổng hợp, giải thích và nội dung tạo ra thuộc đơn vị vận hành hoặc chủ sở hữu. Không yêu sách với từ riêng lẻ hay sự thật chung. Sao chép, bán, phân phối hoặc tạo cơ sở dữ liệu ngoài học cá nhân cần được phép.</p>`),
                    s('5. Quảng cáo và dịch vụ ngoài', `<p>Google AdSense hoặc quảng cáo khác có thể hỗ trợ chi phí, với cookie nêu trong <a href="privacy.html">Chính sách quyền riêng tư</a>. Liên kết và dịch vụ bên thứ ba theo điều khoản của họ; đơn vị vận hành không đảm bảo nội dung hay kết quả.</p>`),
                    s('6. Thay đổi và gián đoạn', `<p>Nội dung hoặc chức năng có thể đổi hay tạm dừng để cải thiện, bảo trì, bảo mật hoặc vì lý do vận hành. Ảnh hưởng quan trọng sẽ được thông báo khi hợp lý.</p>`),
                    s('7. Dữ liệu và trách nhiệm', `<p>Chúng tôi cố gắng cung cấp tài liệu chính xác, tự nhiên nhưng có thể có khác biệt vùng, ngữ cảnh hoặc lỗi kỹ thuật. Không dùng dịch vụ làm căn cứ duy nhất cho dịch chuyên nghiệp, y tế, pháp lý, tài chính hay văn bản chính thức.</p><p>Bạn giữ mã bí mật. Không có thiết bị cũ và mã thì không thể tìm bản sao ẩn danh theo tên hoặc email. Trừ trách nhiệm bắt buộc, khi không cố ý hoặc sơ suất nghiêm trọng, đơn vị vận hành không chịu trách nhiệm về mất mát do thiên tai, liên lạc, cài đặt, bên thứ ba hoặc vi phạm.</p>`),
                    s('8. Hạn chế', `<p>Có thể hạn chế sử dụng khi vi phạm luật, điều khoản hoặc đe dọa an toàn. Trừ trường hợp khẩn cấp, lý do và cách phản đối sẽ được cung cấp khi phù hợp.</p>`),
                    s('9. Thay đổi điều khoản', `<p>Có thể sửa theo dịch vụ, luật hoặc chính sách. Thay đổi quan trọng được thông báo hoặc ghi ngày mới; tiếp tục dùng sau đó là chấp nhận.</p>`),
                    s('10. Luật và tranh chấp', `<p>Điều khoản được giải thích theo luật Đại Hàn Dân Quốc. Trước tiên các bên cố gắng thỏa thuận, sau đó tòa án có thẩm quyền tại Hàn Quốc giải quyết. Luật bắt buộc nơi cư trú vẫn áp dụng khi cần.</p>`),
                    s('11. Liên hệ', `<p class="legal-contact"><strong>Đơn vị vận hành TentenQuiz</strong><br><strong>Email:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            )
        },
        ar: {
            about: page(
                'حول الموقع | TentenQuiz',
                'تعرّف على 2500 مفهوم يومي في 12 لغة والاختبارات القصيرة وأدوات المراجعة والحفظ دون حساب في TentenQuiz.',
                'حول TentenQuiz',
                'آخر تحديث: 20 أغسطس 2026',
                'TentenQuiz خدمة تعلّم مجانية على الويب لممارسة مفردات الحياة اليومية في 12 لغة من خلال اختبارات قصيرة قابلة للتكرار. اختر لغتك واللغة التي تريد تعلّمها دون إنشاء حساب.',
                [
                    s('1. ما نوع هذه الخدمة؟', `<p>يركز TentenQuiz على التذكر السريع والتكرار المتقارب. تتكون الجولة من 10 أسئلة، ولكل سؤال 10 ثوانٍ، لربط الكلمة بمعناها في جلسات صغيرة.</p><p>يدعم الإنجليزية والكورية واليابانية والصينية المبسطة والتقليدية والفرنسية والألمانية والإسبانية والفيتنامية والعربية والإيطالية والروسية. يجب أن تختلف لغتك عن لغة التعلّم، وتبقى سجلات كل زوج لغوي منفصلة.</p>`),
                    s('2. ماذا يمكنني أن أتعلم؟', `<p class="legal-highlight">تتوفر <strong>2500 فكرة أساسية من الحياة اليومية</strong> في اللغات الاثنتي عشرة، مرتبة في 10 مراحل و10 موضوعات.</p><ul><li>الطبيعة والناس والصحة والطعام والمنزل والأنشطة والأماكن والمدرسة والتسوق والوقت</li><li>10 مراحل من الكلمات المألوفة إلى كلمات أقل شيوعًا لكنها مفيدة</li><li>25 كلمة لكل موضوع في كل مرحلة</li><li>صوت للنطق يربط الكتابة بالصوت</li></ul>`),
                    s('3. كيف يتم التعلّم؟', `<ul><li>تضم الجولة العادية حتى 10 أسئلة.</li><li>يتيح «مسح الإجابات الخاطئة» حل الأخطاء والأسئلة المنتهية مجددًا.</li><li>يكرر قاموسي الكلمات المختارة حتى تنهي الجلسة.</li><li>تظهر الإجابة الصحيحة فور الخطأ أو انتهاء الوقت.</li><li>تظهر احتفالات عند إكمال 25 كلمة للموضوع وعند نتيجة 10 من 10.</li></ul>`),
                    s('4. معايير الكلمات والترجمة', `<p>نعطي الأولوية للكلمات اليومية التي يستطيع متعلم بعمر 13–15 عامًا تقريبًا فهمها وتصورها. نستبعد قدر الإمكان المصطلحات شديدة التخصص أو المحلية والترجمات المتكلفة والتكرار غير الضروري.</p><p>نراجع توافق المفهوم في 12 لغة ووجود الكتابة والقراءة وملف الصوت. ولأن اللغة تختلف حسب المنطقة والسياق، نرحب بالإبلاغ عن ترجمة أو نطق غير طبيعي.</p>`),
                    s('5. حفظ التقدم بلا حساب', `<p>تُحفظ اللغات والتقدم والأخطاء والقاموس أولًا تلقائيًا في المتصفح. لا نحتاج إلى الاسم أو الهاتف أو حساب بريد.</p><p>عند إكمال أسئلة موضوع عددها 25 لأول مرة، يستطيع المتصفح تشفير البيانات وإنشاء نسخة سحابية آمنة. يتيح رمز الاسترداد تحميلها على جهاز آخر ولا يُرسل الرمز إلى الخادم. راجع <a href="privacy.html">سياسة الخصوصية</a>.</p>`),
                    s('6. دعم الخدمة المجانية', `<p>وظائف التعلّم الأساسية مجانية. قد يستخدم TentenQuiz إعلانات مثل Google AdSense للمساعدة في تكاليف الاستضافة وتحسين المحتوى. تُفصل الإعلانات عن الإجابات وأزرار التعلّم.</p>`),
                    s('7. الأسئلة والملاحظات', `<p>لمشكلات الترجمة أو النطق أو التقنية أو سهولة الوصول، راجع <a href="contact.html">المساعدة والتواصل</a>.</p><p class="legal-contact"><strong>مشغّل TentenQuiz</strong><br><strong>البريد:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            guide: page(
                'دليل التعلّم | TentenQuiz',
                'طريقة استخدام المراحل والموضوعات ومراجعة الأخطاء والقاموس والصوت والنسخ المشفر في TentenQuiz.',
                'دليل تعلّم TentenQuiz',
                'خطوات واضحة للمتعلمين الجدد',
                'يدرّب TentenQuiz التذكر السريع: أجب خلال 10 ثوانٍ، وحل الأخطاء مجددًا، وكرر الكلمات المختارة. يشرح هذا الدليل كل شيء من اختيار اللغة إلى استرداد التقدم.',
                [
                    s('1. البدء السريع', `<ol><li>اختر <strong>لغتي</strong> لعرض المعاني والواجهة.</li><li>اختر اللغة التي تريد تعلّمها.</li><li>اختر المرحلة المناسبة.</li><li>اختر موضوعًا يوميًا.</li><li>استمع أو اقرأ ثم اختر المعنى الصحيح من أربعة خيارات خلال 10 ثوانٍ.</li></ol><p class="legal-highlight"><strong>للمبتدئ:</strong> ابدأ بموضوع واحد في المرحلة 1، وأكمل 10 أسئلة ثم راجع الأخطاء قبل المتابعة.</p>`),
                    s('2. المراحل والموضوعات', `<p>تتكون الخريطة من <strong>10 مراحل × 10 موضوعات × 25 كلمة</strong>: 250 مفهومًا في كل مرحلة و2500 إجمالًا.</p><ul><li>الطبيعة / الطقس</li><li>الناس / العلاقات</li><li>الجسم / الصحة</li><li>الطعام / الشراب</li><li>المنزل / الحياة اليومية</li><li>الأنشطة / الترفيه</li><li>الأماكن / النقل</li><li>المدرسة / العمل</li><li>التسوق / المال</li><li>الوقت / التقويم</li></ul><p>تحدد <strong>المرحلة</strong> ترتيب التعلّم، بينما يجمع <strong>الموضوع</strong> مواقف الحياة. يمكن تعلّم موضوعات المرحلة بأي ترتيب ولكل منها تقدم مستقل.</p>`),
                    s('3. اختبار 10 ثوانٍ و10 أسئلة', `<p>تعرض الجولة العادية حتى 10 كلمات عشوائيًا. يكرر زر السماعة نطق لغة التعلّم. تنقلك الإجابة الصحيحة سريعًا، أما الخطأ أو انتهاء الوقت فيُظهر المعنى ويضيف الكلمة إلى أخطاء المرحلة.</p><p>بعد تجربة كلمات الموضوع الـ25 يظهر الإكمال واحتفال صغير. نتيجة 10/10 تبدأ احتفال الدرجة الكاملة.</p>`),
                    s('4. مسح الإجابات الخاطئة', `<ol><li>تُحفظ الأخطاء وانتهاء الوقت تلقائيًا.</li><li>افتح «مسح الإجابات الخاطئة» في المرحلة الحالية.</li><li>الإجابة الصحيحة تزيل الكلمة من القائمة.</li><li>إن أخطأت مجددًا تبقى للمراجعة التالية.</li></ol><p>حاول إعادة العداد إلى الصفر قبل التقدم كثيرًا في مادة جديدة.</p>`),
                    s('5. قاموسي', `<p>أضف من النتائج أي كلمة مهمة. تُخلط الأسئلة وتتكرر حتى تنهي الجلسة. عند الخطأ أو انتهاء الوقت تظهر الإجابة ويُنطق معناها مرة بلغتك قبل السؤال التالي.</p><p>القوائم منفصلة حسب لغتك ولغة التعلّم والمرحلة.</p>`),
                    s('6. روتين مقترح', `<ol><li>أجب عن 10 أسئلة جديدة.</li><li>امسح الأخطاء فورًا.</li><li>أضف الكلمات المهمة أو المربكة.</li><li>أكمل كلمات الموضوع الـ25.</li><li>راجع القاموس لفترة قصيرة في اليوم التالي.</li></ol><p>العودة القصيرة المنتظمة أهم من إنهاء مرحلة كاملة دفعة واحدة.</p>`),
                    s('7. الحفظ والاسترداد', `<p>تُحفظ الإعدادات والبيانات في المتصفح. عند إكمال موضوع من 25 كلمة لأول مرة تُنشأ أيضًا نسخة سحابية مشفرة. احفظ رمز الاسترداد بسرية.</p><ul><li>لا تشارك الرمز.</li><li>من دون الجهاز القديم والرمز لا يستطيع المشغّل إيجاد النسخة المجهولة.</li><li>كن حذرًا على الحواسيب المشتركة.</li></ul>`),
                    s('8. أسئلة شائعة', `<h3>هل أستطيع مزج موضوعات المرحلة؟</h3><p>نعم، يتابع كل موضوع كلماته الـ25 بصورة منفصلة.</p><h3>هل تختلط البيانات عند تغيير اللغة؟</h3><p>لا، تُفصل حسب لغتك ولغة التعلّم والمرحلة.</p><h3>هل يحسب الخطأ ضمن التقدم؟</h3><p>يعني التقدم أنك حاولت الكلمة، وتبقى الخاطئة للمراجعة.</p><h3>لا يوجد صوت؟</h3><p>تحقق من مستوى صوت الوسائط وكتم الموقع. تحتاج بعض المتصفحات إلى لمسة أولى.</p><h3>هل يمكن تثبيته كتطبيق؟</h3><p>في المتصفح المدعوم استخدم دعوة التثبيت الصغيرة ثم افتحه من الاختصار أو أيقونة الشاشة الرئيسية.</p>`),
                    s('9. هل تحتاج إلى مساعدة؟', `<p>لمشكلة في الكتابة أو الترجمة أو النطق أو الاسترداد أو الوصول، راجع <a href="contact.html">المساعدة والتواصل</a>. اذكر الجهاز والمتصفح واللغتين في البلاغ التقني.</p><p class="legal-contact"><strong>البريد:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            contact: page(
                'المساعدة والتواصل | TentenQuiz',
                'مساعدة في ترجمة TentenQuiz والنطق والمشكلات التقنية وسجلات التعلّم والوصول والسياسات.',
                'المساعدة والتواصل',
                'أخبرنا بما يعيق تعلّمك.',
                'إذا بدت الترجمة أو النطق خاطئين، أو لم تعمل وظيفة، أو كان لديك سؤال عن البيانات، فتحقق من النقاط التالية ثم أرسل بريدًا إن بقيت المشكلة.',
                [
                    s('الدعم بالبريد', `<p class="legal-contact"><strong>البريد:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a><br>عنوان مقترح: <strong>[النطق]</strong> أو <strong>[الترجمة]</strong> أو <strong>[مشكلة تقنية]</strong> أو <strong>[سجلات التعلّم]</strong>.</p>`),
                    s('1. فحوص سريعة', `<ul><li>تحقق من الإنترنت ثم حدّث الصفحة مرة.</li><li>للصوت، تحقق من مستوى الوسائط وكتم الموقع وإعداد الصوت.</li><li>إن اختلفت البيانات فتحقق من لغتك ولغة التعلّم والمرحلة.</li><li>تُخفى دعوة التثبيت على الجهاز المثبّت عليه التطبيق.</li><li>راجع <a href="guide.html">دليل التعلّم</a> للوظائف والاسترداد.</li></ul>`),
                    s('2. ماذا يمكن الإبلاغ عنه؟', `<ul><li><strong>الترجمة:</strong> الكلمة وزوج اللغات والمعنى الظاهر والاقتراح</li><li><strong>النطق:</strong> الكلمة واللغة والمرحلة/الموضوع ونوع الخطأ</li><li><strong>التقنية:</strong> الجهاز والنظام والمتصفح والخطوات وصورة عند الحاجة</li><li><strong>البيانات:</strong> زوج اللغات والمرحلة والوظيفة والرسالة</li><li><strong>سهولة الوصول:</strong> الأداة المساعدة والشاشة الصعبة</li><li><strong>الإعلان/السياسة:</strong> الشاشة والوقت والبلد وصورة بلا بيانات شخصية</li></ul>`),
                    s('3. وصف المشكلة التقنية', `<ol><li>اذكر الشاشة المتأثرة.</li><li>اسرد الخطوات السابقة.</li><li>افصل المتوقع عما حدث.</li><li>اذكر الجهاز والمتصفح.</li><li>أخفِ رمز الاسترداد والبيانات الشخصية في الصور.</li></ol>`),
                    s('4. معلومات لا ترسلها', `<p class="legal-highlight"><strong>لا ترسل رمز الاسترداد كاملًا بالبريد.</strong> إنه المفتاح السري للبيانات المشفرة. لن يطلب المشغّل الرمز أو كلمة مرور أو معلومات دفع أو هوية.</p><p>لا ترسل أرقام هوية أو بطاقات أو كلمات مرور أو عنوانًا وهاتفًا غير ضروريين. على من هم دون 13 عامًا طلب مساعدة ولي الأمر في أي رسالة تتضمن بيانات شخصية.</p>`),
                    s('5. مساعدة شائعة', `<h3>هل يستطيع المشغّل إيجاد رمز مفقود؟</h3><p>لا. لا يوجد حساب والرمز لا يُرسل.</p><h3>هل يمكن استعادة بيانات متصفح محذوفة؟</h3><p>فقط إذا وجدت نسخة سحابية ومعك رمزها.</p><h3>هل تختلط اللغات؟</h3><p>لا. اختر زوج اللغات والمرحلة نفسيهما.</p><h3>هل يُرد على كل رسالة؟</h3><p>تُراجع البلاغات، لكن الرسائل المكررة أو الإعلانية أو ناقصة التفاصيل قد لا تحصل على رد فردي.</p>`),
                    s('6. معالجة معلومات التواصل', `<p>قد يُعالج عنوان المرسل والمحتوى للرد وحل المشكلة. راجع <a href="privacy.html">سياسة الخصوصية</a>.</p><p class="legal-contact"><strong>مشغّل TentenQuiz</strong><br><strong>البريد:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            privacy: page(
                'سياسة الخصوصية | TentenQuiz',
                'كيفية معالجة بيانات التعلّم المحلية والنسخ المشفر وملفات الارتباط وGoogle AdSense والاستفسارات وخصوصية الأطفال.',
                'سياسة الخصوصية',
                'تاريخ النفاذ: 19 أغسطس 2026',
                'يحترم مشغّل TentenQuiz الخصوصية ويسعى إلى اتباع القانون وسياسات Google للناشرين. تشرح هذه السياسة معالجة المعلومات في الموقع والخدمات المرتبطة.',
                [
                    s('1. المعلومات التي تُعالج', `<p>لا يلزم التسجيل، والخدمة غير مصممة لجمع الاسم أو الهاتف أو العنوان مباشرة.</p><ul><li><strong>على الجهاز:</strong> قد تُحفظ اللغات والقراءة والتقدم والأخطاء والقاموس في Local Storage أو IndexedDB.</li><li><strong>نسخة الإنجاز:</strong> بعد أول إكمال لـ25 سؤالًا في موضوع، تُشفر الإعدادات والبيانات في المتصفح وتُرسل كنص مشفر. قد يعالج الخادم معرفًا عشوائيًا ونصًا مشفرًا ووقتًا وحجمًا وقيمة سلامة. لا يُرسل الرمز ولا البيانات غير المشفرة.</li><li><strong>بيانات تلقائية:</strong> قد يعالج مقدمو الاستضافة والأمان والإعلان عنوان IP والجهاز/المتصفح والوقت والنشاط وملفات الارتباط والإشارات ومعرفات الإعلان.</li><li><strong>الاستفسار:</strong> يُعالج عنوان البريد والمحتوى عند مراسلتنا.</li></ul>`),
                    s('2. الأغراض', `<p>قد تستخدم المعلومات لتقديم الخدمة وحفظ الإعدادات والنسخ والاسترداد وإصلاح الأخطاء والأمان والرد وتحليل الاستخدام وعرض الإعلان وقياسه.</p>`),
                    s('3. ملفات الارتباط وGoogle AdSense', `<p>قد تستخدم الخدمة ملفات الارتباط أو تقنيات مشابهة للإعدادات والتحسين، وGoogle AdSense للإعلان. يمكن لـGoogle وموردي الطرف الثالث استخدام الملفات لعرض إعلانات بناءً على زيارات سابقة لـTentenQuiz أو مواقع أخرى. تسمح ملفات Google وشركائه بإعلانات مخصصة بناءً على هذه الزيارات.</p><p>أدر التخصيص في <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">إعدادات إعلانات Google</a> أو <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">AboutAds</a>. راجع <a href="https://policies.google.com/technologies/partner-sites?hl=ar" target="_blank" rel="noopener noreferrer">استخدام Google لبيانات مواقع الشركاء</a>.</p><p>قد يمنع حظر التخزين حفظ الإعدادات وبيانات التعلّم.</p>`),
                    s('4. الاحتفاظ والحذف', `<ul><li>تبقى بيانات الجهاز حتى حذفها من المتصفح أو الخدمة.</li><li>قد تبقى النسخة المشفرة حتى حذفها أو انتهاء خدمة النسخ. من دون الرمز لا يمكن البحث بالاسم أو البريد.</li><li>تُحفظ الرسائل للمدة اللازمة للدعم أو النزاع أو القانون.</li><li>يتبع مقدمو الخدمات سياساتهم والقانون.</li></ul>`),
                    s('5. الخدمات الخارجية والمعالجة الدولية', `<p>قد تدعم Google Firebase وجهات أخرى الإعلان والاستضافة والأمان والأداء والنسخ المشفر. قد يُعالج النص المشفر ومعرف الملف وIP والجهاز/المتصفح والتفاعلات خارج بلدك.</p><p>في المنطقة الاقتصادية الأوروبية والمملكة المتحدة وسويسرا وغيرها حيث تلزم الموافقة، تقدم منصة إدارة الموافقة الخيارات وفق القانون وسياسة Google.</p>`),
                    s('6. خصوصية الأطفال', `<p>TentenQuiz موجه لجمهور واسع لكنه لا يجمع عمدًا معلومات شخصية لأطفال دون 13 عامًا. عليهم عدم إرسال معلومات مباشرة وطلب مساعدة ولي الأمر. عند معرفة جمع غير مصرح به ستُتخذ إجراءات معقولة للحذف.</p><p>لا ينوي المشغّل إنشاء ملف إعلان مخصص من نشاط معروف لطفل دون 13 عامًا ويطبق معاملة العمر المطلوبة.</p>`),
                    s('7. اختياراتك وحقوقك', `<p>يمكنك عرض أو حذف بيانات الجهاز وإدارة النسخة بالرمز وتغيير ملفات الارتباط أو الإعلان المخصص. النسخ غير مرتبطة بحساب، لذلك لا يستعيدها أو يحذفها إلا حامل الرمز. راسلنا للوصول إلى بيانات الاستفسار أو تصحيحها أو حذفها.</p>`),
                    s('8. الأمان', `<p>تشمل الإجراءات المعقولة حماية النقل والتشفير في المتصفح والرموز الصعبة وقواعد قاعدة البيانات. لا يمكن ضمان أمان مطلق لأي نقل أو تخزين إلكتروني.</p>`),
                    s('9. التغييرات', `<p>قد تتغير السياسة مع الخدمة أو القانون أو السياسات. تُعلن التغييرات المهمة داخل الخدمة أو بتاريخ نفاذ جديد.</p>`),
                    s('10. التواصل', `<p class="legal-contact"><strong>مسؤول الخصوصية:</strong> مشغّل TentenQuiz<br><strong>البريد:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            terms: page(
                'شروط الاستخدام | TentenQuiz',
                'شروط استخدام TentenQuiz والمحتوى وبيانات التعلّم والإعلان والمسؤوليات.',
                'شروط الاستخدام',
                'تاريخ النفاذ: 19 أغسطس 2026',
                'تنظم هذه الشروط موقع TentenQuiz وخدماته المرتبطة. باستخدام الخدمة توافق على هذه الشروط وسياسة الخصوصية.',
                [
                    s('1. الغرض', `<p>TentenQuiz خدمة تعليمية لجمهور واسع لتعلّم الكلمات اليومية عبر اختبارات قصيرة ومراجعة الأخطاء والقاموس الشخصي. لا تضمن درجة اختبار أو نتيجة محددة.</p>`),
                    s('2. الاستخدام', `<p>يجوز الاستخدام للتعلّم الشخصي وفق القانون والشروط. لا تحتاج الاختبارات الأساسية إلى حساب. قد تبقى الإعدادات والبيانات في المتصفح؛ وقد ينشئ أول إكمال لموضوع من 25 سؤالًا نسخة مشفرة قابلة للاسترداد بالرمز.</p><p>على من هم دون 13 عامًا طلب مساعدة ولي الأمر عند وجود معلومات شخصية أو خدمة خارجية.</p>`),
                    s('3. الالتزامات', `<p>يُمنع تعطيل الخدمة أو تجاوز الأمان أو نشر البرمجيات الضارة أو الأتمتة المفرطة أو الاستخراج والتوزيع واسع النطاق أو انتهاك الحقوق أو إنشاء تفاعل إعلاني غير صالح أو الاستخدام المخالف للقانون.</p>`),
                    s('4. المحتوى والملكية الفكرية', `<p>حقوق التصميم والتنظيم والبيانات المجمعة والشرح والمحتوى المنشأ للمشغّل أو أصحاب الحقوق. لا ندعي حقًا في كلمة منفردة أو حقيقة عامة. النسخ أو البيع أو إعادة التوزيع أو بناء قاعدة أخرى خارج التعلّم الشخصي يحتاج إذنًا.</p>`),
                    s('5. الإعلان والخدمات الخارجية', `<p>قد تدعم Google AdSense أو إعلانات أخرى التكاليف، مع ملفات موضحة في <a href="privacy.html">سياسة الخصوصية</a>. تخضع الروابط والخدمات الخارجية لشروط مقدميها ولا يضمن المشغّل محتواها أو نتائجها.</p>`),
                    s('6. التغيير والانقطاع', `<p>قد يتغير المحتوى أو تتوقف الوظائف للتحسين أو الصيانة أو الأمان أو الضرورة التشغيلية. تُعلن الآثار المهمة قدر الإمكان.</p>`),
                    s('7. البيانات وحدود المسؤولية', `<p>نبذل جهدًا لمواد دقيقة وطبيعية لكن قد توجد فروق إقليمية أو سياقية أو أخطاء تقنية. لا تستخدم الخدمة أساسًا وحيدًا للترجمة المهنية أو المشورة الطبية أو القانونية أو المالية أو الوثائق الرسمية.</p><p>احفظ الرمز سرًا. من دون الجهاز القديم والرمز لا يمكن إيجاد النسخة المجهولة بالاسم أو البريد. باستثناء المسؤولية التي لا يستبعدها القانون، ومن دون قصد أو إهمال جسيم، لا يتحمل المشغّل خسائر الكوارث أو الاتصال أو الإعدادات أو الطرف الثالث أو مخالفة الشروط.</p>`),
                    s('8. التقييد', `<p>قد يُقيد الاستخدام عند مخالفة القانون أو الشروط أو تهديد الأمان. ما لم توجد حالة عاجلة، تُذكر الأسباب وطريقة الاعتراض عند الاقتضاء.</p>`),
                    s('9. تغيير الشروط', `<p>قد تُعدل بسبب الخدمة أو القانون أو السياسات. تُعلن التغييرات المهمة أو يؤرخ لها؛ ويعد الاستمرار بعدها قبولًا.</p>`),
                    s('10. القانون والنزاعات', `<p>تُفسر وفق قانون جمهورية كوريا. يحاول الطرفان الحل وديًا أولًا، ثم تنظر المحاكم الكورية المختصة. تبقى القواعد الإلزامية في محل إقامة المستخدم نافذة عند الحاجة.</p>`),
                    s('11. التواصل', `<p class="legal-contact"><strong>مشغّل TentenQuiz</strong><br><strong>البريد:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            )
        },
        it: {
            about: page(
                'Informazioni | TentenQuiz',
                'Scopri 2.500 concetti quotidiani in 12 lingue, quiz brevi, ripasso e salvataggio senza account in TentenQuiz.',
                'Informazioni su TentenQuiz',
                'Ultimo aggiornamento: 20 agosto 2026',
                'TentenQuiz è un servizio web gratuito per esercitare il vocabolario quotidiano in 12 lingue con quiz brevi e ripetibili. Scegli la tua lingua e quella da imparare senza registrarti.',
                [
                    s('1. Che tipo di servizio è?', `<p>TentenQuiz punta sul richiamo breve e frequente. Ogni turno contiene 10 domande da 10 secondi per collegare parola e significato in piccole sessioni.</p><p>Supporta inglese, coreano, giapponese, cinese semplificato e tradizionale, francese, tedesco, spagnolo, vietnamita, arabo, italiano e russo. La tua lingua e quella di studio devono essere diverse; ogni combinazione conserva dati separati.</p>`),
                    s('2. Cosa si può imparare?', `<p class="legal-highlight"><strong>2.500 concetti essenziali della vita quotidiana</strong> sono disponibili in tutte le 12 lingue, organizzati in 10 livelli e 10 temi.</p><ul><li>Natura, persone, salute, cibo, casa, attività, luoghi, scuola, acquisti e tempo</li><li>10 livelli da parole familiari a vocaboli meno comuni ma utili</li><li>25 parole per tema in ogni livello</li><li>Audio di pronuncia per collegare scrittura e suono</li></ul>`),
                    s('3. Come si impara?', `<ul><li>Un turno normale contiene fino a 10 domande.</li><li>“Cancella errori” permette di risolvere di nuovo risposte errate o scadute.</li><li>Il mio vocabolario ripete le parole scelte finché non termini.</li><li>La risposta appare subito dopo un errore o lo scadere del tempo.</li><li>Ci sono effetti al completamento delle 25 parole e con 10/10.</li></ul>`),
                    s('4. Criteri per parole e traduzioni', `<p>Preferiamo parole quotidiane comprensibili e facili da immaginare per studenti di circa 13–15 anni. Escludiamo per quanto possibile termini troppo specialistici o locali, traduzioni forzate e duplicati inutili.</p><p>Controlliamo l’allineamento dei concetti in 12 lingue e la presenza di grafia, lettura e audio. Poiché la lingua cambia per regione e contesto, accettiamo segnalazioni di traduzioni o pronunce innaturali.</p>`),
                    s('5. Progressi senza account', `<p>Lingue, progressi, errori e vocabolario sono prima salvati automaticamente nel browser. Non servono nome, telefono o account e-mail.</p><p>Al primo completamento delle 25 domande di un tema, il browser può cifrare i dati e creare un backup cloud sicuro. Il codice di recupero consente di caricarli altrove e non viene inviato al server. Consulta la <a href="privacy.html">Privacy</a>.</p>`),
                    s('6. Sostegno al servizio gratuito', `<p>Le funzioni principali sono gratuite. TentenQuiz può usare Google AdSense o pubblicità simile per sostenere hosting e miglioramenti. Gli annunci sono separati da risposte e comandi.</p>`),
                    s('7. Domande e suggerimenti', `<p>Per traduzione, pronuncia, tecnica o accessibilità, consulta <a href="contact.html">Aiuto e contatti</a>.</p><p class="legal-contact"><strong>Gestore TentenQuiz</strong><br><strong>E-mail:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            guide: page(
                'Guida allo studio | TentenQuiz',
                'Come usare livelli, temi, ripasso errori, vocabolario, audio e backup cifrati in TentenQuiz.',
                'Guida allo studio TentenQuiz',
                'Istruzioni passo dopo passo',
                'TentenQuiz allena il richiamo rapido: rispondi in 10 secondi, risolvi di nuovo gli errori e ripeti le parole scelte. Questa guida va dalla scelta delle lingue al recupero.',
                [
                    s('1. Avvio rapido', `<ol><li>Scegli <strong>La mia lingua</strong> per significati e interfaccia.</li><li>Scegli la lingua da imparare.</li><li>Seleziona un livello adatto.</li><li>Scegli un tema quotidiano.</li><li>Ascolta o leggi e scegli il significato corretto fra quattro opzioni in 10 secondi.</li></ol><p class="legal-highlight"><strong>Per iniziare:</strong> scegli un tema del livello 1, completa 10 domande e ripassa gli errori prima di continuare.</p>`),
                    s('2. Livelli e temi', `<p>Il percorso contiene <strong>10 livelli × 10 temi × 25 parole</strong>: 250 concetti per livello e 2.500 totali.</p><ul><li>Natura / Meteo</li><li>Persone / Relazioni</li><li>Corpo / Salute</li><li>Cibo / Bevande</li><li>Casa / Vita quotidiana</li><li>Attività / Tempo libero</li><li>Luoghi / Trasporti</li><li>Scuola / Lavoro</li><li>Acquisti / Denaro</li><li>Tempo / Calendario</li></ul><p>Il <strong>livello</strong> indica l’ordine; il <strong>tema</strong> raggruppa le situazioni. I temi dello stesso livello possono essere studiati liberamente con progressi separati.</p>`),
                    s('3. Quiz da 10 secondi e 10 domande', `<p>Un turno normale presenta casualmente fino a 10 parole. L’altoparlante ripete la pronuncia. Una risposta corretta avanza rapidamente; un errore o tempo scaduto mostra il significato e aggiunge la parola agli errori del livello.</p><p>Dopo le 25 parole del tema, il pulsante mostra il completamento con un piccolo effetto. Un 10/10 avvia la festa del punteggio perfetto.</p>`),
                    s('4. Cancella errori', `<ol><li>Errori e tempi scaduti vengono salvati.</li><li>Apri “Cancella errori” nel livello attuale.</li><li>Una risposta corretta rimuove la parola.</li><li>Un nuovo errore la conserva per il prossimo ripasso.</li></ol><p>Prova a riportare il contatore a zero prima di avanzare molto.</p>`),
                    s('5. Il mio vocabolario', `<p>Aggiungi dai risultati qualsiasi parola importante. Le domande vengono mescolate e ripetute fino alla fine. Dopo un errore o tempo scaduto, appare la risposta e il significato viene pronunciato una volta nella tua lingua.</p><p>Le liste sono separate per tua lingua, lingua studiata e livello.</p>`),
                    s('6. Routine consigliata', `<ol><li>Rispondi a 10 domande nuove.</li><li>Cancella subito gli errori.</li><li>Aggiungi parole importanti o confuse.</li><li>Completa le 25 parole del tema.</li><li>Ripassa brevemente il giorno seguente.</li></ol><p>Ritorni brevi e regolari contano più di un intero livello in una seduta.</p>`),
                    s('7. Salvataggio e recupero', `<p>Impostazioni e dati sono salvati nel browser. Al primo completamento di un tema da 25 parole viene creato anche un backup cloud cifrato. Conserva il codice in privato.</p><ul><li>Non condividere il codice.</li><li>Senza vecchio dispositivo e codice, il gestore non può trovare il backup anonimo.</li><li>Fai attenzione sui computer condivisi.</li></ul>`),
                    s('8. Domande frequenti', `<h3>Posso mescolare i temi di un livello?</h3><p>Sì, ogni tema registra separatamente le sue 25 parole.</p><h3>I dati si mescolano cambiando lingua?</h3><p>No, sono separati per tua lingua, lingua studiata e livello.</p><h3>Un errore conta nel progresso?</h3><p>Il progresso indica che la parola è stata tentata; rimane negli errori per essere ripassata.</p><h3>Nessun suono?</h3><p>Controlla volume e silenzioso del sito. Alcuni browser richiedono un primo tocco.</p><h3>Posso installarlo?</h3><p>Su browser supportati usa il piccolo invito e aprilo poi dal collegamento o dall’icona Home.</p>`),
                    s('9. Serve aiuto?', `<p>Per grafia, traduzione, pronuncia, recupero o accessibilità, consulta <a href="contact.html">Aiuto e contatti</a>. Per problemi tecnici indica dispositivo, browser e due lingue.</p><p class="legal-contact"><strong>E-mail:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            contact: page(
                'Aiuto e contatti | TentenQuiz',
                'Aiuto per traduzione, pronuncia, tecnica, dati di studio, accessibilità e politiche di TentenQuiz.',
                'Aiuto e contatti',
                'Segnala ciò che ostacola lo studio.',
                'Se traduzione o pronuncia sembrano errate, una funzione non lavora o hai dubbi sui dati, controlla prima questi punti e scrivi se il problema resta.',
                [
                    s('Assistenza e-mail', `<p class="legal-contact"><strong>E-mail:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a><br>Oggetto consigliato: <strong>[Pronuncia]</strong>, <strong>[Traduzione]</strong>, <strong>[Errore tecnico]</strong> o <strong>[Dati]</strong>.</p>`),
                    s('1. Controlli rapidi', `<ul><li>Controlla Internet e aggiorna una volta.</li><li>Per l’audio controlla volume, silenzioso del sito e impostazione sonora.</li><li>Se i dati differiscono, verifica tua lingua, lingua studiata e livello.</li><li>L’invito d’installazione è nascosto se già installato.</li><li>Consulta la <a href="guide.html">Guida allo studio</a> per funzioni e recupero.</li></ul>`),
                    s('2. Cosa segnalare?', `<ul><li><strong>Traduzione:</strong> parola, lingue, significato e proposta</li><li><strong>Pronuncia:</strong> parola, lingua, livello/tema e tipo di errore</li><li><strong>Tecnica:</strong> dispositivo, sistema, browser, passaggi e immagine utile</li><li><strong>Dati:</strong> lingue, livello, funzione e messaggio</li><li><strong>Accessibilità:</strong> ausilio e schermata difficile</li><li><strong>Pubblicità/politica:</strong> schermata, ora, paese e immagine senza dati personali</li></ul>`),
                    s('3. Descrivere un problema tecnico', `<ol><li>Indica la schermata.</li><li>Elenca le azioni precedenti.</li><li>Separa risultato atteso e reale.</li><li>Indica dispositivo e browser.</li><li>Nascondi codice e dati personali nelle immagini.</li></ol>`),
                    s('4. Informazioni da non inviare', `<p class="legal-highlight"><strong>Non inviare mai il codice di recupero completo.</strong> È la chiave segreta dei dati cifrati. Il gestore non chiede codice, password, pagamenti o documenti.</p><p>Non inviare numeri ufficiali, carte, password, indirizzi o telefoni inutili. I minori di 13 anni devono chiedere a un tutore di inviare messaggi con dati personali.</p>`),
                    s('5. Aiuto frequente', `<h3>Il gestore può trovare un codice perso?</h3><p>No. Non esiste un account e il codice non viene inviato.</p><h3>I dati del browser cancellati si recuperano?</h3><p>Solo con un backup cloud e il suo codice.</p><h3>Più lingue si mescolano?</h3><p>No. Seleziona la stessa combinazione e lo stesso livello.</p><h3>Ogni messaggio riceve risposta?</h3><p>Le segnalazioni sono esaminate, ma duplicati, pubblicità o messaggi insufficienti potrebbero non ricevere risposta individuale.</p>`),
                    s('6. Trattamento dei messaggi', `<p>Indirizzo del mittente e contenuto possono essere trattati per rispondere e risolvere. Consulta la <a href="privacy.html">Privacy</a>.</p><p class="legal-contact"><strong>Gestore TentenQuiz</strong><br><strong>E-mail:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            privacy: page(
                'Privacy | TentenQuiz',
                'Trattamento di dati locali, backup cifrati, cookie, Google AdSense, richieste e privacy dei minori in TentenQuiz.',
                'Informativa sulla privacy',
                'In vigore dal: 19 agosto 2026',
                'Il gestore di TentenQuiz rispetta la privacy e cerca di seguire leggi applicabili e norme Google per gli editori. Questa informativa descrive il trattamento delle informazioni.',
                [
                    s('1. Informazioni trattate', `<p>Non è richiesta registrazione e il servizio non è progettato per raccogliere direttamente nome, telefono o indirizzo.</p><ul><li><strong>Sul dispositivo:</strong> lingue, lettura, progressi, errori e vocabolario possono essere salvati in Local Storage o IndexedDB.</li><li><strong>Backup del traguardo:</strong> dopo il primo completamento di 25 domande, impostazioni e dati sono cifrati nel browser e inviati come testo cifrato. Il server può trattare ID casuale, testo cifrato, data, dimensione e integrità. Codice e dati in chiaro non sono inviati.</li><li><strong>Dati automatici:</strong> fornitori di hosting, sicurezza e pubblicità possono trattare IP, dispositivo/browser, ora, attività, cookie, beacon e ID pubblicitari.</li><li><strong>Richieste:</strong> indirizzo e contenuto sono trattati quando scrivi.</li></ul>`),
                    s('2. Finalità', `<p>Le informazioni possono servire a fornire il servizio, conservare impostazioni, eseguire backup e recupero, correggere errori, mantenere sicurezza, rispondere, analizzare uso, mostrare annunci e misurarli.</p>`),
                    s('3. Cookie e Google AdSense', `<p>Il servizio può usare cookie o tecnologie simili per impostazioni e miglioramenti e Google AdSense per pubblicità. Google e altri fornitori terzi possono usare cookie per mostrare annunci basati su visite precedenti a TentenQuiz o altri siti. I cookie pubblicitari permettono a Google e partner di mostrare annunci personalizzati in base a tali visite.</p><p>Gestisci la personalizzazione nelle <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">Impostazioni annunci Google</a> o su <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">AboutAds</a>. Vedi <a href="https://policies.google.com/technologies/partner-sites?hl=it" target="_blank" rel="noopener noreferrer">come Google usa i dati dei siti partner</a>.</p><p>Bloccare l’archiviazione può impedire di conservare impostazioni e dati di studio.</p>`),
                    s('4. Conservazione e cancellazione', `<ul><li>I dati locali restano fino alla cancellazione nel browser o servizio.</li><li>Il backup cifrato può restare fino alla cancellazione o fine del servizio. Senza codice non è ricercabile per nome o e-mail.</li><li>Le richieste restano quanto serve per assistenza, controversie o legge.</li><li>I fornitori esterni seguono politiche proprie e legge.</li></ul>`),
                    s('5. Servizi esterni e trasferimenti', `<p>Google Firebase e altri fornitori possono supportare pubblicità, hosting, sicurezza, prestazioni e backup cifrato. Testo cifrato, cookie, IP, dispositivo/browser e interazioni possono essere trattati all’estero.</p><p>Nel SEE, Regno Unito, Svizzera e altre regioni che richiedono consenso, una piattaforma di gestione offre le scelte previste dalla legge e da Google.</p>`),
                    s('6. Privacy dei minori', `<p>TentenQuiz si rivolge a un pubblico ampio ma non raccoglie intenzionalmente dati personali di minori di 13 anni. Non devono inviarli direttamente e devono chiedere aiuto a un tutore. Se viene scoperta una raccolta non autorizzata, si adotteranno misure ragionevoli per cancellarla.</p><p>Il gestore non intende creare profili pubblicitari personalizzati da attività nota di minori di 13 anni e applica il trattamento d’età richiesto.</p>`),
                    s('7. Scelte e diritti', `<p>Puoi vedere o cancellare dati locali, gestire backup con il codice e cambiare cookie o annunci personalizzati. Poiché i backup non sono legati a conti, solo chi ha il codice può ripristinarli o cancellarli. Scrivi per accesso, correzione o cancellazione dei dati di richiesta detenuti.</p>`),
                    s('8. Sicurezza', `<p>Misure ragionevoli includono protezione del trasporto, cifratura nel browser, codici difficili e regole del database. Nessuna trasmissione o archiviazione elettronica è assolutamente sicura.</p>`),
                    s('9. Modifiche', `<p>L’informativa può cambiare con servizio, legge o norme. Le modifiche importanti sono annunciate nel servizio o con una nuova data.</p>`),
                    s('10. Contatto', `<p class="legal-contact"><strong>Contatto privacy:</strong> gestore TentenQuiz<br><strong>E-mail:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            terms: page(
                'Termini di servizio | TentenQuiz',
                'Condizioni d’uso di TentenQuiz, contenuti, dati di studio, pubblicità e responsabilità.',
                'Termini di servizio',
                'In vigore dal: 19 agosto 2026',
                'Questi termini regolano il sito e i servizi collegati forniti dal gestore TentenQuiz. Usando il servizio accetti i termini e l’Informativa sulla privacy.',
                [
                    s('1. Scopo', `<p>TentenQuiz è un servizio educativo per un pubblico ampio che insegna vocaboli quotidiani con quiz brevi, ripasso errori e vocabolario personale. Non garantisce punteggi o risultati specifici.</p>`),
                    s('2. Utilizzo', `<p>È consentito l’uso personale nel rispetto di legge e termini. I quiz essenziali non richiedono account. Impostazioni e dati possono restare nel browser; il primo completamento di un tema da 25 domande può creare un backup cifrato recuperabile con codice.</p><p>I minori di 13 anni devono chiedere aiuto a un tutore quando sono coinvolti dati personali o servizi esterni.</p>`),
                    s('3. Obblighi', `<p>È vietato disturbare il servizio, aggirare sicurezza, diffondere malware, automatizzare eccessivamente, estrarre o distribuire in massa, violare diritti, generare interazioni pubblicitarie non valide o usare illegalmente.</p>`),
                    s('4. Contenuti e proprietà intellettuale', `<p>Diritti su design, organizzazione, dati raccolti, spiegazioni e contenuti creati appartengono al gestore o titolari. Non rivendichiamo singole parole o fatti generali. Copia, vendita, redistribuzione o database separato oltre lo studio personale richiedono permesso.</p>`),
                    s('5. Pubblicità e servizi esterni', `<p>Google AdSense o altri annunci possono sostenere i costi, con cookie descritti nella <a href="privacy.html">Privacy</a>. Link e servizi esterni seguono i propri termini; il gestore non garantisce contenuti o risultati.</p>`),
                    s('6. Modifiche e interruzione', `<p>Contenuti o funzioni possono cambiare o essere sospesi per miglioramento, manutenzione, sicurezza o necessità operative. Gli effetti importanti sono annunciati quando ragionevole.</p>`),
                    s('7. Dati e responsabilità', `<p>Facciamo sforzi ragionevoli per materiali corretti e naturali, ma possono esistere differenze regionali, contestuali o errori tecnici. Non usare il servizio come unica base per traduzione professionale, consulenza medica, legale o finanziaria o documenti ufficiali.</p><p>Mantieni segreto il codice. Senza vecchio dispositivo e codice il backup anonimo non è trovabile per nome o e-mail. Salvo responsabilità obbligatorie e in assenza di dolo o colpa grave, il gestore non risponde di perdite da disastri, comunicazioni, impostazioni, terzi o violazioni.</p>`),
                    s('8. Limitazioni', `<p>L’uso può essere limitato se viola legge o termini o minaccia la sicurezza. Salvo emergenza, vengono indicati motivo e modo di opposizione quando appropriato.</p>`),
                    s('9. Modifiche ai termini', `<p>Possono cambiare per servizio, legge o norme. Le modifiche importanti sono annunciate o ridatate; continuare dopo significa accettarle.</p>`),
                    s('10. Legge e controversie', `<p>Si applica la legge della Repubblica di Corea. Le parti tentano prima un accordo, poi decidono i tribunali coreani competenti. Le norme obbligatorie del luogo di residenza restano applicabili se necessario.</p>`),
                    s('11. Contatto', `<p class="legal-contact"><strong>Gestore TentenQuiz</strong><br><strong>E-mail:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            )
        },
        ru: {
            about: page(
                'О сайте | TentenQuiz',
                'Узнайте о 2500 бытовых понятиях на 12 языках, коротких тестах, повторении и сохранении без аккаунта в TentenQuiz.',
                'О TentenQuiz',
                'Последнее обновление: 20 августа 2026 г.',
                'TentenQuiz — бесплатный веб-сервис для изучения повседневной лексики на 12 языках с помощью коротких повторяемых тестов. Выберите свой и изучаемый языки без регистрации.',
                [
                    s('1. Что это за сервис?', `<p>TentenQuiz делает упор на быстрое вспоминание и частое повторение. В раунде 10 вопросов по 10 секунд, чтобы связывать слово и значение небольшими занятиями.</p><p>Поддерживаются английский, корейский, японский, упрощённый и традиционный китайский, французский, немецкий, испанский, вьетнамский, арабский, итальянский и русский. Свой и изучаемый языки должны различаться, а записи каждой пары хранятся отдельно.</p>`),
                    s('2. Что можно изучать?', `<p class="legal-highlight"><strong>2500 основных бытовых понятий</strong> доступны на всех 12 языках и распределены по 10 этапам и 10 темам.</p><ul><li>Природа, люди, здоровье, еда, дом, занятия, места, школа, покупки и время</li><li>10 этапов от знакомых слов к менее частым, но полезным</li><li>25 слов на тему в каждом этапе</li><li>Аудио произношения для связи написания и звучания</li></ul>`),
                    s('3. Как проходит обучение?', `<ul><li>Обычный раунд содержит до 10 вопросов.</li><li>«Очистить ошибки» позволяет снова решить неверные и просроченные вопросы.</li><li>Мой словарь повторяет выбранные слова до завершения занятия.</li><li>Правильный ответ сразу появляется после ошибки или окончания времени.</li><li>Завершение 25 слов темы и результат 10/10 сопровождаются разными эффектами.</li></ul>`),
                    s('4. Принципы словаря и перевода', `<p>Мы выбираем понятные повседневные слова, которые легко представить учащимся примерно 13–15 лет. По возможности исключаются узкоспециальные и чрезмерно региональные термины, натянутые переводы и лишние повторы.</p><p>Проверяется соответствие понятия на 12 языках, написание, чтение и аудиофайл. Язык зависит от региона и контекста, поэтому можно сообщать о неестественном переводе или произношении.</p>`),
                    s('5. Прогресс без аккаунта', `<p>Языки, прогресс, ошибки и словарь сначала автоматически сохраняются в браузере. Имя, телефон и почтовый аккаунт не нужны.</p><p>При первом завершении 25 вопросов темы браузер может зашифровать данные и создать безопасную облачную копию. Код восстановления загружает её на другом устройстве и не отправляется на сервер. Подробнее в <a href="privacy.html">Политике конфиденциальности</a>.</p>`),
                    s('6. Поддержка бесплатного сервиса', `<p>Основные учебные функции бесплатны. TentenQuiz может использовать Google AdSense или похожую рекламу для оплаты размещения и улучшений. Реклама отделяется от ответов и кнопок обучения.</p>`),
                    s('7. Вопросы и замечания', `<p>По вопросам перевода, произношения, техники или доступности откройте <a href="contact.html">Помощь и контакты</a>.</p><p class="legal-contact"><strong>Оператор TentenQuiz</strong><br><strong>Почта:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            guide: page(
                'Руководство | TentenQuiz',
                'Как использовать этапы, темы, повторение ошибок, словарь, аудио и зашифрованную копию в TentenQuiz.',
                'Руководство по обучению TentenQuiz',
                'Пошаговая инструкция для новых пользователей',
                'TentenQuiz тренирует быстрое вспоминание: ответьте за 10 секунд, снова решите ошибки и повторяйте выбранные слова. Руководство охватывает путь от выбора языка до восстановления.',
                [
                    s('1. Быстрый старт', `<ol><li>Выберите <strong>Мой язык</strong> для значений и интерфейса.</li><li>Выберите изучаемый язык.</li><li>Выберите подходящий этап.</li><li>Выберите бытовую тему.</li><li>Прослушайте или прочитайте слово и за 10 секунд выберите значение из четырёх вариантов.</li></ol><p class="legal-highlight"><strong>Для начала:</strong> возьмите одну тему этапа 1, завершите 10 вопросов и разберите ошибки.</p>`),
                    s('2. Этапы и темы', `<p>Карта включает <strong>10 этапов × 10 тем × 25 слов</strong>: 250 понятий на этап и 2500 всего.</p><ul><li>Природа / Погода</li><li>Люди / Отношения</li><li>Тело / Здоровье</li><li>Еда / Напитки</li><li>Дом / Быт</li><li>Занятия / Досуг</li><li>Места / Транспорт</li><li>Школа / Работа</li><li>Покупки / Деньги</li><li>Время / Календарь</li></ul><p><strong>Этап</strong> задаёт порядок, <strong>тема</strong> объединяет ситуации. Темы одного этапа можно проходить в любом порядке с отдельным прогрессом.</p>`),
                    s('3. 10 секунд и 10 вопросов', `<p>Обычный раунд случайно показывает до 10 слов. Динамик повторяет произношение. Верный ответ быстро ведёт дальше; ошибка или окончание времени показывает значение и добавляет слово в ошибки этапа.</p><p>После всех 25 слов кнопка отмечает завершение небольшим эффектом. 10/10 запускает праздник идеального результата.</p>`),
                    s('4. Очистить ошибки', `<ol><li>Ошибки и окончание времени сохраняются автоматически.</li><li>Откройте «Очистить ошибки» в текущем этапе.</li><li>Верный ответ удаляет слово.</li><li>Повторная ошибка оставляет его для следующего раза.</li></ol><p>Постарайтесь вернуть счётчик к нулю до большого объёма нового материала.</p>`),
                    s('5. Мой словарь', `<p>Добавляйте из результатов любое важное слово. Вопросы перемешиваются и повторяются до завершения. При ошибке или окончании времени появляется ответ, а его значение один раз звучит на вашем языке.</p><p>Списки разделены по вашему языку, изучаемому языку и этапу.</p>`),
                    s('6. Рекомендуемый порядок', `<ol><li>Ответьте на 10 новых вопросов.</li><li>Сразу очистите ошибки.</li><li>Добавьте важные или похожие слова.</li><li>Завершите 25 слов темы.</li><li>Кратко повторите словарь на следующий день.</li></ol><p>Регулярные короткие возвращения важнее целого этапа за один раз.</p>`),
                    s('7. Сохранение и восстановление', `<p>Настройки и данные сохраняются в браузере. При первом завершении темы из 25 слов создаётся зашифрованная облачная копия. Держите код в секрете.</p><ul><li>Не делитесь кодом.</li><li>Без старого устройства и кода оператор не найдёт анонимную копию.</li><li>Будьте осторожны на общем компьютере.</li></ul>`),
                    s('8. Частые вопросы', `<h3>Можно смешивать темы этапа?</h3><p>Да, каждая тема отдельно отслеживает 25 слов.</p><h3>Смешиваются ли данные при смене языка?</h3><p>Нет, они разделены по вашему языку, изучаемому языку и этапу.</p><h3>Ошибка считается прогрессом?</h3><p>Прогресс показывает попытку; слово остаётся в ошибках для повторения.</p><h3>Нет звука?</h3><p>Проверьте громкость и отключение звука сайта. Некоторым браузерам нужно первое касание.</p><h3>Можно установить как приложение?</h3><p>В поддерживаемом браузере используйте небольшую подсказку, а затем запускайте с ярлыка или домашнего экрана.</p>`),
                    s('9. Нужна помощь?', `<p>По вопросам написания, перевода, произношения, восстановления или доступности откройте <a href="contact.html">Помощь и контакты</a>. В техническом сообщении укажите устройство, браузер и оба языка.</p><p class="legal-contact"><strong>Почта:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            contact: page(
                'Помощь и контакты | TentenQuiz',
                'Помощь по переводу, произношению, технике, учебным данным, доступности и правилам TentenQuiz.',
                'Помощь и контакты',
                'Сообщите о том, что мешает учиться.',
                'Если перевод или произношение кажутся неверными, функция не работает или есть вопрос о данных, сначала проверьте пункты ниже, а затем напишите нам.',
                [
                    s('Поддержка по почте', `<p class="legal-contact"><strong>Почта:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a><br>Тема: <strong>[Произношение]</strong>, <strong>[Перевод]</strong>, <strong>[Техническая ошибка]</strong> или <strong>[Учебные данные]</strong>.</p>`),
                    s('1. Быстрая проверка', `<ul><li>Проверьте Интернет и обновите страницу.</li><li>Для аудио проверьте громкость, звук сайта и настройку приложения.</li><li>Если данные отличаются, проверьте свой язык, изучаемый язык и этап.</li><li>Подсказка установки скрыта на уже установленном устройстве.</li><li>Функции и восстановление описаны в <a href="guide.html">Руководстве</a>.</li></ul>`),
                    s('2. О чём можно сообщить?', `<ul><li><strong>Перевод:</strong> слово, языковая пара, показанное значение и вариант</li><li><strong>Произношение:</strong> слово, язык, этап/тема и вид ошибки</li><li><strong>Техника:</strong> устройство, система, браузер, шаги и нужный снимок</li><li><strong>Данные:</strong> языковая пара, этап, функция и сообщение</li><li><strong>Доступность:</strong> вспомогательное средство и трудный экран</li><li><strong>Реклама/политика:</strong> экран, время, страна и снимок без личных данных</li></ul>`),
                    s('3. Как описать техническую ошибку', `<ol><li>Назовите экран.</li><li>Перечислите предыдущие действия.</li><li>Отделите ожидаемый результат от фактического.</li><li>Укажите устройство и браузер.</li><li>Скройте код и личные данные на снимках.</li></ol>`),
                    s('4. Что нельзя отправлять', `<p class="legal-highlight"><strong>Никогда не отправляйте полный код восстановления.</strong> Это секретный ключ к зашифрованным данным. Оператор не просит код, пароль, платёжные данные или удостоверение.</p><p>Не отправляйте государственные номера, карты, пароли, ненужный адрес или телефон. Пользователям младше 13 лет следует попросить опекуна отправить сообщение с личными данными.</p>`),
                    s('5. Частая помощь', `<h3>Может ли оператор найти потерянный код?</h3><p>Нет. Аккаунта нет, и код не отправляется.</p><h3>Можно восстановить удалённые данные браузера?</h3><p>Только при наличии облачной копии и кода.</p><h3>Смешиваются ли языки?</h3><p>Нет. Выберите прежнюю пару и этап.</p><h3>На каждое письмо отвечают?</h3><p>Сообщения рассматриваются, но дубли, реклама или недостаточные сведения могут остаться без отдельного ответа.</p>`),
                    s('6. Обработка обращений', `<p>Адрес отправителя и текст могут обрабатываться для ответа и решения проблемы. См. <a href="privacy.html">Политику конфиденциальности</a>.</p><p class="legal-contact"><strong>Оператор TentenQuiz</strong><br><strong>Почта:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            privacy: page(
                'Политика конфиденциальности | TentenQuiz',
                'Обработка локальных учебных данных, зашифрованных копий, cookie, Google AdSense, обращений и данных детей.',
                'Политика конфиденциальности',
                'Действует с 19 августа 2026 г.',
                'Оператор TentenQuiz уважает конфиденциальность и старается соблюдать применимое право и правила Google для издателей. Здесь описана обработка информации.',
                [
                    s('1. Обрабатываемая информация', `<p>Регистрация не требуется, и сервис не предназначен для прямого сбора имени, телефона или адреса.</p><ul><li><strong>На устройстве:</strong> языки, чтение, прогресс, ошибки и словарь могут храниться в Local Storage или IndexedDB.</li><li><strong>Копия достижения:</strong> после первого завершения 25 вопросов настройки и данные шифруются в браузере и отправляются как шифротекст. Сервер может обрабатывать случайный ID, шифротекст, время, размер и целостность. Код и открытые данные не отправляются.</li><li><strong>Автоматические данные:</strong> поставщики размещения, безопасности и рекламы могут обрабатывать IP, устройство/браузер, время, активность, cookie, маяки и рекламные ID.</li><li><strong>Обращения:</strong> при письме обрабатываются адрес и текст.</li></ul>`),
                    s('2. Цели', `<p>Информация может использоваться для работы сервиса, сохранения настроек, копирования и восстановления, исправления ошибок, безопасности, ответов, анализа использования, показа и измерения рекламы.</p>`),
                    s('3. Cookie и Google AdSense', `<p>Сервис может использовать cookie или похожие технологии для настроек и улучшения, а Google AdSense — для рекламы. Google и другие сторонние поставщики могут использовать cookie для рекламы на основе прежних посещений TentenQuiz или других сайтов. Рекламные cookie позволяют Google и партнёрам показывать персонализированную рекламу по этим посещениям.</p><p>Управляйте настройками в <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">Google Ads</a> или <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">AboutAds</a>. См. <a href="https://policies.google.com/technologies/partner-sites?hl=ru" target="_blank" rel="noopener noreferrer">использование Google данных партнёрских сайтов</a>.</p><p>Блокировка хранилища может помешать сохранять настройки и учебные данные.</p>`),
                    s('4. Хранение и удаление', `<ul><li>Локальные данные остаются до удаления в браузере или сервисе.</li><li>Зашифрованная копия может оставаться до удаления пользователем или закрытия сервиса. Без кода её нельзя найти по имени или почте.</li><li>Обращения хранятся столько, сколько нужно для поддержки, спора или закона.</li><li>Внешние поставщики следуют своим правилам и закону.</li></ul>`),
                    s('5. Внешние сервисы и международная обработка', `<p>Google Firebase и другие поставщики могут поддерживать рекламу, размещение, безопасность, производительность и шифрованные копии. Шифротекст, cookie, IP, устройство/браузер и взаимодействия могут обрабатываться за рубежом.</p><p>В ЕЭЗ, Великобритании, Швейцарии и других регионах, где нужно согласие, платформа управления согласием предоставляет выбор по закону и правилам Google.</p>`),
                    s('6. Конфиденциальность детей', `<p>TentenQuiz предназначен для широкой аудитории, но намеренно не собирает личные данные детей младше 13 лет. Они не должны отправлять данные напрямую и должны попросить опекуна. При обнаружении несанкционированного сбора будут приняты разумные меры удаления.</p><p>Оператор не намерен создавать персонализированный рекламный профиль по известной активности ребёнка младше 13 лет и применяет необходимый возрастной режим.</p>`),
                    s('7. Выбор и права', `<p>Можно просмотреть или удалить локальные данные, управлять копией по коду и менять cookie или персонализированную рекламу. Копии не связаны с аккаунтом, поэтому только владелец кода может их загрузить или удалить. Напишите для доступа, исправления или удаления данных обращения.</p>`),
                    s('8. Безопасность', `<p>Разумные меры включают защиту передачи, шифрование в браузере, сложные коды и правила базы данных. Абсолютная безопасность электронной передачи и хранения не гарантируется.</p>`),
                    s('9. Изменения', `<p>Политика может меняться вместе с сервисом, законом или правилами. Важные изменения объявляются в сервисе или новой датой.</p>`),
                    s('10. Контакты', `<p class="legal-contact"><strong>Контакт по конфиденциальности:</strong> оператор TentenQuiz<br><strong>Почта:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            ),
            terms: page(
                'Условия использования | TentenQuiz',
                'Условия использования TentenQuiz, контента, учебных данных, рекламы и ответственности.',
                'Условия использования',
                'Действуют с 19 августа 2026 г.',
                'Эти условия регулируют сайт и связанные сервисы оператора TentenQuiz. Используя сервис, вы принимаете условия и Политику конфиденциальности.',
                [
                    s('1. Назначение', `<p>TentenQuiz — образовательный сервис для широкой аудитории, обучающий бытовой лексике через короткие тесты, разбор ошибок и личный словарь. Он не гарантирует экзаменационный балл или конкретный результат.</p>`),
                    s('2. Использование', `<p>Разрешено личное обучение по закону и условиям. Основные тесты не требуют аккаунта. Настройки и данные могут храниться в браузере; первый итог темы из 25 вопросов может создать зашифрованную копию, восстанавливаемую кодом.</p><p>Пользователям младше 13 лет нужна помощь опекуна при личных данных или внешних сервисах.</p>`),
                    s('3. Обязанности', `<p>Запрещено нарушать работу, обходить безопасность, распространять вредоносный код, чрезмерно автоматизировать, массово извлекать или распространять, нарушать права, создавать недействительную рекламную активность или использовать незаконно.</p>`),
                    s('4. Контент и интеллектуальные права', `<p>Права на дизайн, организацию, собранные данные, объяснения и созданный контент принадлежат оператору или правообладателям. Мы не претендуем на отдельные слова или общие факты. Копирование, продажа, распространение или отдельная база вне личного обучения требуют разрешения.</p>`),
                    s('5. Реклама и внешние сервисы', `<p>Google AdSense или другая реклама может поддерживать расходы, а cookie описаны в <a href="privacy.html">Политике конфиденциальности</a>. Внешние ссылки и сервисы подчиняются своим условиям; оператор не гарантирует их содержание или результат.</p>`),
                    s('6. Изменения и перерывы', `<p>Контент или функции могут изменяться или приостанавливаться для улучшения, обслуживания, безопасности или по рабочей необходимости. Существенные последствия объявляются, когда это разумно возможно.</p>`),
                    s('7. Данные и ответственность', `<p>Мы прилагаем разумные усилия для точных естественных материалов, но возможны региональные, контекстные или технические ошибки. Не используйте сервис как единственную основу для профессионального перевода, медицинской, юридической или финансовой консультации и официальных документов.</p><p>Храните код в секрете. Без старого устройства и кода анонимную копию нельзя найти по имени или почте. Кроме обязательной ответственности и при отсутствии умысла или грубой неосторожности оператор не отвечает за потери из-за бедствий, связи, настроек, третьих лиц или нарушений.</p>`),
                    s('8. Ограничение', `<p>Использование может быть ограничено при нарушении закона или условий либо угрозе безопасности. Кроме срочной ситуации, при необходимости сообщаются причина и способ возражения.</p>`),
                    s('9. Изменение условий', `<p>Условия могут меняться из-за сервиса, закона или правил. Важные изменения объявляются или получают новую дату; продолжение использования означает согласие.</p>`),
                    s('10. Право и споры', `<p>Применяется право Республики Корея. Стороны сначала пытаются договориться, затем спор рассматривает компетентный суд Кореи. Обязательные нормы места жительства применяются, если требуется.</p>`),
                    s('11. Контакты', `<p class="legal-contact"><strong>Оператор TentenQuiz</strong><br><strong>Почта:</strong> <a href="mailto:support@tentenquiz.com">support@tentenquiz.com</a></p>`)
                ]
            )
        },
    };

    root.TENTEN_CONTENT_TRANSLATIONS = { common, languageNames, pages };
})(typeof window !== 'undefined' ? window : globalThis);

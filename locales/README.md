# TentenQuiz locale sources

Each language directory contains the stable URL, language metadata, and home-page SEO copy used by `tools/build-multilingual-seo.js`.

Runtime interface translations remain in `i18n.js`, and translated long-form pages remain in `content-translations.js`. The build validates those sources against these locale files, then produces crawlable HTML under `/{language}/`.

Do not edit generated language HTML directly. Edit the locale JSON or the translation source and run `npm run build:seo` again.

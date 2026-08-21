# 다국어 정적 SEO 빌드

텐텐퀴즈는 별도 프레임워크나 npm 패키지 없이 Node.js만으로 12개 언어의 정적 HTML과 다국어 사이트맵을 생성합니다.

## 생성

프로젝트 폴더에서 다음 명령을 실행합니다.

```powershell
npm run build:seo
```

생성되는 주소 구조는 다음과 같습니다.

```text
/en/
/en/about/
/en/guide/
/en/contact/
/en/privacy/
/en/terms/
```

동일한 구조가 한국어, 일본어, 중국어 간체·번체, 프랑스어, 독일어, 스페인어, 베트남어, 아랍어, 이탈리아어, 러시아어에 생성됩니다. `sitemap.xml`도 동시에 다시 만들어집니다.

## 검증

```powershell
npm run test:seo
```

검증이 통과하면 각 페이지의 언어, canonical, 상호 hreflang, x-default, 번역 본문, 언어별 내부 링크와 사이트맵 구성이 정상입니다.

Playwright가 준비된 개발 환경에서는 실제 브라우저 경로 전환도 확인할 수 있습니다.

```powershell
npm run test:seo:browser
```

## 배포

```powershell
firebase deploy --only hosting
```

배포 후 Google Search Console에서 `https://tentenquiz.com/sitemap.xml`을 제출하고, 대표 URL인 `/en/`, `/ja/`, `/zh-cn/`, `/vi/`, `/ar/`를 URL 검사로 확인합니다.

## 번역 수정 위치

- 홈 화면 UI와 메타 문구: `i18n.js` 및 `locales/{language}/seo.json`
- 소개·학습 안내·문의·개인정보·약관 본문: `content-translations.js`
- 언어 URL과 SEO 언어 코드: `locales/{language}/seo.json`

언어 폴더 안의 생성된 `index.html`은 직접 수정하지 않습니다.

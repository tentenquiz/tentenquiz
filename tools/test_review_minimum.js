const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const http = require('http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const slugs = require('../locales/site.json').locales;
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'content-translations.js'), 'utf8'), sandbox);
const pages = sandbox.window.TENTEN_CONTENT_TRANSLATIONS.pages;
for (const slug of slugs) for (const kind of ['about', 'guide']) {
    const html = fs.readFileSync(path.join(root, slug, kind, 'index.html'), 'utf8');
    const code = { 'zh-cn': 'zh-CN', 'zh-tw': 'zh-TW' }[slug] || slug;
    if (code !== 'ko') {
        const sections = pages[code][kind].sections;
        for (const section of sections) {
            const localized = section.html.replace(/href="(about|guide|contact|privacy|terms)\.html"/g, (_, k) => `href="/${slug}/${k}/"`);
            assert.ok(html.includes(localized), `${slug}/${kind}: source and HTML differ`);
        }
        const rules = sections[2].html;
        assert.ok(rules.includes('25') && rules.includes('12') && rules.includes('10'));
        assert.ok((rules.match(/3/g)||[]).length >= 2 && (rules.match(/0/g)||[]).length >= 2);
    } else {
        assert.ok(html.includes('전체 단어 학습을 마친 상태로 시작하는 다음 게임부터'));
        assert.ok(html.includes('12개 단어를 모두 보았는지는 완료 조건이 아닙니다'));
        assert.ok(!html.includes('25개 어휘를 모두 풀면 해당 주제 버튼에 완료'));
    }
    console.log(`PASS completion copy: ${slug}/${kind}`);
}
for (const file of ['about.html','guide.html']) {
    const h = fs.readFileSync(path.join(root,file),'utf8');
    assert.ok(h.includes('12개 단어를 모두 보았는지는 완료 조건이 아닙니다'));
}
const schemaUrl = html => JSON.parse(html.match(/<script[^>]*data-tenten-generated-schema[^>]*>([\s\S]*?)<\/script>/)[1]).url;
const home = fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.equal(schemaUrl(home),'https://tentenquiz.com/');
assert.ok(home.includes('rel="canonical" href="https://tentenquiz.com/"'));
assert.ok(home.includes('hreflang="x-default" href="https://tentenquiz.com/"'));
const en = fs.readFileSync(path.join(root,'en/index.html'),'utf8');
assert.equal(schemaUrl(en),'https://tentenquiz.com/en/');
assert.ok(en.includes('rel="canonical" href="https://tentenquiz.com/en/"'));
// Exercise the generator helper in memory; never run the full generation entry point.
const builder = { require, __dirname: __dirname, console };
vm.createContext(builder);
vm.runInContext(fs.readFileSync(path.join(root,'tools/build-multilingual-seo.js'),'utf8').replace(/\bmain\(\);\s*$/, ''),builder);
const locale = {slug:'en',htmlLang:'en'};
assert.equal(schemaUrl(builder.injectStructuredData('<head></head>','https://tentenquiz.com',locale,'','', '/')),'https://tentenquiz.com/');
assert.equal(schemaUrl(builder.injectStructuredData('<head></head>','https://tentenquiz.com',locale,'','')),'https://tentenquiz.com/en/');
console.log('PASS root/en schema and generator');
const server = http.createServer((req,res)=>{
    let file = path.resolve(root, '.'+new URL(req.url,'http://localhost').pathname);
    if (!file.startsWith(root+path.sep)) {res.writeHead(403).end();return;}
    if (fs.existsSync(file)&&fs.statSync(file).isDirectory()) file=path.join(file,'index.html');
    if (!fs.existsSync(file)) {res.writeHead(404).end();return;}
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'}[path.extname(file)]||'application/octet-stream')+';charset=utf-8');
    fs.createReadStream(file).pipe(res);
});
(async()=>{
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    const browser = await chromium.launch({headless:true,executablePath:chromium.executablePath()});
    try {
        const context = await browser.newContext({viewport:{width:320,height:800}});
        await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
        const page = await context.newPage();
        for (const slug of ['',...slugs]) for (const kind of ['about','guide','contact','privacy','terms']) {
            const url = slug?`/${slug}/${kind}/`:`/${kind}.html`;
            await page.goto(`http://127.0.0.1:${server.address().port}${url}`,{waitUntil:'load'});
            const result=await page.evaluate(()=>{
                const brand=document.querySelector('.legal-brand').getBoundingClientRect();
                const actions=document.querySelector('.legal-header-actions').getBoundingClientRect();
                return {width:document.documentElement.scrollWidth,overlap:brand.right>actions.left&&brand.left<actions.right&&brand.bottom>actions.top&&actions.bottom>brand.top,
                    clipped:[...document.querySelectorAll('.legal-header-actions a, .legal-header-actions select')].some(e=>{const r=e.getBoundingClientRect();return r.left<0||r.right>320;})};
            });
            assert.equal(result.width,320,url);
            assert.ok(!result.overlap&&!result.clipped,JSON.stringify({url,result}));
            console.log(`PASS 320px no overflow/overlap: ${url}`);
        }
        await context.close();
    } finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});

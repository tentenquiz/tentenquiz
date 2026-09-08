const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const copy = require('../locales/home-learning.json');
const { renderHomeLearning, samples } = require('./build-home-learning');
const git = (...args) => execFileSync('git', ['-c', `safe.directory=${root.replaceAll('\\','/')}`, ...args], {cwd:root,encoding:'utf8'});
for (const slug of ['', ...Object.keys(copy)]) {
    const file = `${slug ? slug+'/' : ''}index.html`;
    const html = fs.readFileSync(path.join(root,file),'utf8');
    let baseline = git('show',`HEAD:${file}`);
    // The global entry point keeps its root canonical and matching schema URL.
    if (!slug) baseline = baseline.replace(/(<script[^>]*data-tenten-generated-schema[^>]*>)([\s\S]*?)(<\/script>)/,
        (_, open, json, close) => open + JSON.stringify({ ...JSON.parse(json), url: 'https://tentenquiz.com/' }) + close);
    assert.equal(html.split('<!-- home-learning:start -->').length,2);
    assert.ok(html.includes(renderHomeLearning(slug||'en')));
    const withoutLearning = source => source.replace(/<!-- home-learning:start -->[\s\S]*?<!-- home-learning:end -->\n\n        /,'')
        .replace('style.css?v=20260902-completion-rule-v1', 'style.css?v=20260908-home-learning-cards-v2');
    assert.equal(withoutLearning(html),withoutLearning(baseline),'Only visible body content may change: '+file);
    for (const [section,id] of samples) {
        const item = JSON.parse(fs.readFileSync(path.join(root,'data',section+'.json'),'utf8')).find(w=>w.id===id);
        assert.ok(item && item.stage===1);
    }
    console.log(`PASS source HTML / data / unchanged existing markup: ${file}`);
}
const server=http.createServer((req,res)=>{
    let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
    if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return;}
    if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
    if(!fs.existsSync(file)){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'}[path.extname(file)]||'application/octet-stream')+'; charset=utf-8');
    fs.createReadStream(file).pipe(res);
});
(async()=>{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    let browser;
    try {
        browser=await chromium.launch({headless:true,executablePath:[chromium.executablePath(),'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync)});
        for(const js of [false,true]) {
            const context=await browser.newContext({viewport:{width:320,height:800},javaScriptEnabled:js});
            await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
            const page=await context.newPage();
            for(const slug of ['',...Object.keys(copy)]) {
                await page.goto(`http://127.0.0.1:${server.address().port}/${slug?slug+'/':''}`,{waitUntil:'load'});
                if(js) await page.waitForFunction(()=>typeof activeQuizData!=='undefined'&&activeQuizData.length===2500);
                await page.locator('.home-learning').scrollIntoViewIfNeeded();
                assert.equal(await page.locator('.home-learning li').count(),8);
                const state=await page.locator('.home-learning').evaluate(el=>{
                    const box=el.getBoundingClientRect();
                    return {visible:el.checkVisibility(),left:box.left,right:box.right,overflow:document.documentElement.scrollWidth>320,
                        clipped:[...el.querySelectorAll('li,p,h2,h3')].some(n=>n.scrollWidth>n.clientWidth+1),
                        dir:getComputedStyle(el).direction};
                });
                assert.ok(state.visible&&!state.overflow&&!state.clipped&&state.left>=0&&state.right<=320,JSON.stringify({slug,js,state}));
                assert.equal(state.dir,slug==='ar'?'rtl':'ltr');
                if(process.env.HOME_PREVIEW_DIR&&['ko','en','ar'].includes(slug)&&!js) await page.locator('.home-learning').screenshot({path:path.join(process.env.HOME_PREVIEW_DIR,`home-learning-${slug}.png`)});
                console.log(`PASS 320px / visible / no clipping / JS=${js}: ${slug||'root'}`);
            }
            await context.close();
        }
    } finally {if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});

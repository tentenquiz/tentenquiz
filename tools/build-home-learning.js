const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const copy = require('../locales/home-learning.json');
const samples = [
    ['people_relations', 'pr_0001'], ['people_relations', 'pr_0002'],
    ['food_drink', 'fd_0001'], ['food_drink', 'fd_0002'],
    ['home_daily_life', 'hdl_0001'], ['nature_weather', 'nw_0001'],
    ['places_transport', 'pt_0001'], ['school_work', 'sw_0001']
];
const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
function renderHomeLearning(slug) {
    const t = copy[slug];
    if (!t || t.length !== 10) throw new Error(`Missing home copy: ${slug}`);
    const native = slug.replace('-', '_');
    const target = slug === 'en' ? 'ja' : 'en';
    const lang = { 'zh-cn': 'zh-Hans', 'zh-tw': 'zh-Hant' }[slug] || slug;
    const words = samples.map(([section, id]) => {
        const word = JSON.parse(fs.readFileSync(path.join(root, 'data', `${section}.json`), 'utf8')).find(w => w.id === id);
        if (!word || word.stage !== 1 || !word[`word_${target}`] || !word[`word_${native}`] || !word[`note_${native}`]) throw new Error(`Invalid sample: ${slug}/${id}`);
        const reading = word[`reading_${target}`];
        return `<li data-word-id="${id}" data-word-section="${section}"><p class="home-learning-word"><bdi lang="${target}">${escape(word[`word_${target}`])}</bdi> <span>—</span> <bdi>${escape(word[`word_${native}`])}</bdi></p>${reading && reading !== word[`word_${target}`] ? `<p class="home-learning-reading" lang="${target}">${escape(reading)}</p>` : ''}<p>${escape(word[`note_${native}`])}</p></li>`;
    }).join('\n');
    return `<!-- home-learning:start -->
<section class="home-learning" lang="${lang}" dir="${slug === 'ar' ? 'rtl' : 'ltr'}" aria-labelledby="home-learning-title">
<h2 id="home-learning-title">${escape(t[0])}</h2><p>${escape(t[1])}</p>
<h3>${escape(t[2])}</h3><p>${escape(t[3])}</p>
<h3>${escape(t[4])}</h3><p>${escape(t[5])}</p>
<h3>${escape(t[6])}</h3><p>${escape(t[7])}</p>
<ul class="home-learning-samples">${words}</ul>
<h3>${escape(t[8])}</h3><p>${escape(t[9])}</p>
</section>
<!-- home-learning:end -->`;
}
function injectHomeLearning(html, slug) {
    const block = renderHomeLearning(slug);
    if (html.includes('<!-- home-learning:start -->')) return html.replace(/<!-- home-learning:start -->[\s\S]*?<!-- home-learning:end -->/, block);
    if (!html.includes('<footer class="site-footer">')) throw new Error('Missing home footer');
    return html.replace('<footer class="site-footer">', `${block}\n\n        <footer class="site-footer">`);
}
if (require.main === module) {
    for (const slug of ['', ...Object.keys(copy)]) {
        const file = path.join(root, slug, 'index.html');
        fs.writeFileSync(file, injectHomeLearning(fs.readFileSync(file, 'utf8'), slug || 'en'));
    }
}
module.exports = { injectHomeLearning, renderHomeLearning, samples };

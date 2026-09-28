// LULU 每日新闻自动生成（GitHub Actions 中运行）
// 设计目标：与 WorkBuddy 自动化执行器彻底解耦，跑在 GitHub 可靠基建上。
// - 若 LLM_API_KEY 已配置：调用 OpenAI 兼容接口生成精选内容（含 🟢🔴🟡💡 分析）。
// - 否则：用 GDELT + 维基生成真实但偏通用的兜底内容，保证绝不空白/陈旧。
// - 日期守卫：若 dashboard 三数组已是【今天】，直接跳过，绝不覆盖 WorkBuddy 已生成的精选内容。
const fs = require('fs');
const path = require('path');

const ROOT = process.env.GITHUB_WORKSPACE || __dirname + '/../..';
const IDX = path.join(ROOT, 'index.html');
const TODAY = new Date();
const Y = TODAY.getFullYear();
const M = String(TODAY.getMonth() + 1).padStart(2, '0');
const D = String(TODAY.getDate()).padStart(2, '0');
const TODAY_STR = `${Y}-${M}-${D}`;
const MM = TODAY.getMonth() + 1, DD = TODAY.getDate();

function log(...a) { console.log('[gen-news]', ...a); }

// ---------- 读取并解析当前 index.html ----------
function readBlocks(html) {
  const re = (name) => {
    const m = html.match(new RegExp('const ' + name + ' = ([\\s\\S]*?\\n\\];)'));
    if (!m) return null;
    try { return JSON.parse(m[1].replace(/;\s*$/, '')); } catch (e) { return null; }
  };
  return { dentalNews: re('dentalNews'), dailyBriefingNews: re('dailyBriefingNews'), historyToday: re('historyToday') };
}
function isFresh(b) {
  if (!b) return false;
  const dOk = b.dentalNews && b.dentalNews.length && b.dentalNews.every(x => x.date === TODAY_STR);
  const bOk = b.dailyBriefingNews && b.dailyBriefingNews.length && b.dailyBriefingNews.every(x => x.date === TODAY_STR);
  return dOk && bOk;
}

// ---------- 网络封装 ----------
async function jget(url, opts) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    return r;
  } finally { clearTimeout(t); }
}

// ---------- LLM 路径（精选） ----------
async function genViaLLM() {
  const key = process.env.LLM_API_KEY;
  const base = process.env.LLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  const model = process.env.LLM_MODEL || 'glm-4';
  const prompt = `你是一名中文新闻编辑。基于今天（${TODAY_STR}）的真实公开新闻，生成三个 JavaScript 对象数组，严格只输出一个 JSON 对象（不要任何解释、不要 markdown 代码块），结构如下：
{
  "dentalNews": [ { "date":"${TODAY_STR}", "tag":"2-4字分类(集采/口腔/财经/政策/科技/AI等)", "title":"标题", "summary":"一句话摘要", "url":"真实新闻链接", "analysis":"三段影响，每段以【利好】🟢 或【利空】🔴 或【关注】🟡 或【风口】💡 开头，段间用 \\n 换行" } ],
  "dailyBriefingNews": [ { "date":"${TODAY_STR}", "tag":"分类(A股/央行/美股/港股/美债/油价/宏观/政治/政策/国际/中东/俄乌/科技/AI/半导体/体育/民生/社会)", "title":"标题", "summary":"一句话摘要", "url":"真实链接", "analysis":"三段影响，段间用 \\n 换行，每段以🟢🔴🟡💡之一开头" } ],
  "historyToday": [ { "month":${MM}, "day":${DD}, "year":数字年份, "region":"国内"或"国际", "event":"真实历史事件描述" } ]
}
要求：
1. dentalNews 8-12 条，聚焦医疗器械、口腔种植体、医保集采、医疗科技、医药财经，其中至少 3 条 tag 为 财经/集采。
2. dailyBriefingNews 14-20 条，多类覆盖（财经/政治/国际/科技/AI/军事/社会/体育），每条 date 必须为 ${TODAY_STR}。
3. historyToday 8-14 条，均为 ${MM}月${DD}日 真实历史事件，国内外都要有，year 为真实年份。
4. 所有 url 必须是真实可访问的新闻链接；analysis 内换行用字面 \\n（反斜杠+n），不要真实换行符。
5. 不要编造不存在的新闻，优先人民网、新华网、央视、证券时报、新浪财经等权威源。`;
  const r = await jget(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.3 })
  });
  if (!r.ok) throw new Error('LLM HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const j = await r.json();
  const text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
  const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const obj = JSON.parse(clean);
  return obj;
}

// ---------- 兜底路径（GDELT + 维基） ----------
async function genViaRSS() {
  const out = { dentalNews: [], dailyBriefingNews: [], historyToday: [] };
  // 1) 历史上的今天：中文维基
  try {
    const wh = await jget('https://zh.wikipedia.org/api/rest_v1/feed/onthisday/events/' + M.padStart(2,'0') + '/' + D.toString().padStart(2,'0'));
    if (wh.ok) {
      const wj = await wh.json();
      (wj.events || []).slice(0, 14).forEach(e => {
        const txt = (e.text || '').replace(/\s+/g, ' ').trim();
        if (txt.length < 6) return;
        const domestic = /(中国|中共|毛泽东|邓小平|周恩来|北京|上海|南京|抗日|改革开放|辛亥|唐朝|清朝|明朝|元朝|宋朝|秦|汉|隋|中华人民共和国|国民党|共产党|红军|解放军)/.test(txt);
        out.historyToday.push({ month: MM, day: DD, year: e.year || 0, region: domestic ? '国内' : '国际', event: txt.slice(0, 120) });
      });
    }
  } catch (e) { log('维基历史失败:', e.message); }
  // 2) 新闻：GDELT 多主题
  const topics = [
    { q: '口腔 种植体 集采', tag: '集采' },
    { q: '医疗器械 医保', tag: '财经' },
    { q: '中国 经济 央行', tag: '宏观' },
    { q: 'AI 人工智能 大模型', tag: 'AI' },
    { q: '半导体 芯片', tag: '半导体' },
    { q: '俄乌 中东', tag: '国际' },
    { q: 'A股 股市', tag: 'A股' }
  ];
  for (const t of topics) {
    try {
      const u = 'https://api.gdeltproject.org/api/v2/doc/doc?query=' + encodeURIComponent(t.q + ' sourcecountry:CN') + '&mode=ArtList&maxrecords=3&format=json&sortby=datedesc';
      const r = await jget(u);
      if (!r.ok) continue;
      const j = await r.json();
      (j.articles || []).forEach(a => {
        const title = (a.title || '').trim();
        if (!title || title.length < 6) return;
        const item = {
          date: TODAY_STR, tag: t.tag, title: title.slice(0, 60),
          summary: (a.domain || '') + ' 报道', url: a.url || '#',
          analysis: '【关注】🟡\n今日相关动态，详情请见原文链接。\n【风口】💡\n留意该领域后续政策与市场变化。'
        };
        if (t.tag === '集采' || t.tag === '财经' || t.tag === '医疗器械') out.dentalNews.push(item);
        else out.dailyBriefingNews.push(item);
      });
    } catch (e) { log('GDELT', t.q, '失败:', e.message); }
  }
  return out;
}

// ---------- 主流程 ----------
(async () => {
  if (!fs.existsSync(IDX)) { console.error('未找到', IDX); process.exit(1); }
  let html = fs.readFileSync(IDX, 'utf8');
  const blocks = readBlocks(html);
  if (isFresh(blocks)) { log('内容已是今天(' + TODAY_STR + ')，跳过生成'); process.exit(0); }
  log('内容陈旧，开始生成 ' + TODAY_STR + ' ...');

  let data = null;
  if (process.env.LLM_API_KEY) {
    try { data = await genViaLLM(); log('LLM 路径成功'); }
    catch (e) { log('LLM 失败，转兜底:', e.message); data = null; }
  }
  if (!data) { data = await genViaRSS(); log('兜底路径完成'); }

  const dn = (data.dentalNews || []).filter(x => x && x.title);
  const db = (data.dailyBriefingNews || []).filter(x => x && x.title);
  const ht = (data.historyToday || []).filter(x => x && x.event);
  if (!dn.length && !db.length && !ht.length) { console.error('未获取到任何内容，放弃本次更新'); process.exit(1); }

  function block(name, arr) {
    return ('const ' + name + ' = ' + JSON.stringify(arr, null, 2) + ';').replace(/\n/g, '\r\n');
  }
  if (dn.length) html = html.replace(/const dentalNews = \[[\s\S]*?\n\];/, block('dentalNews', dn));
  if (db.length) html = html.replace(/const dailyBriefingNews = \[[\s\S]*?\n\];/, block('dailyBriefingNews', db));
  if (ht.length) html = html.replace(/const historyToday = \[[\s\S]*?\n\];/, block('historyToday', ht));

  fs.writeFileSync(IDX, html);
  log('已写入 index.html：dental=' + dn.length + ' daily=' + db.length + ' history=' + ht.length);
})().catch(e => { console.error('生成异常:', e.message); process.exit(1); });

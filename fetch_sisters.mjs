// 爬取 twinklestarknights.wikiru.jp「シスター」页的全シスター一覧数据, 供 unit_viewer.html 的シスター视图使用
// 匹配规则: sister_unit_list.json 的 character_name 与 Wiki 表「名称」列精确匹配 (含【】变体, 12/12 全命中)
// 用法: node fetch_sisters.mjs   (已存在的图标自动跳过, 可重跑续传)
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LIST_URL = 'https://twinklestarknights.wikiru.jp/?%E3%82%B7%E3%82%B9%E3%82%BF%E3%83%BC';
const BASE = 'https://twinklestarknights.wikiru.jp/';
const UA = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  'Accept-Language': 'ja',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IMG_DIR = join(__dirname, 'img');
mkdirSync(IMG_DIR, { recursive: true });

async function dl(url, file, retry = 3) {
  if (existsSync(file)) return 'skip';
  for (let i = 0; i < retry; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.ok) {
        writeFileSync(file, Buffer.from(await r.arrayBuffer()));
        return 'ok';
      }
    } catch { /* retry */ }
    await sleep(500);
  }
  return 'fail';
}

// ---- 1. 抓取 Wiki シスター页 ----
console.log('[1/3] fetching wiki sister page...');
const html = await (await fetch(LIST_URL, { headers: UA })).text();

// ---- 2. 解析 シスター一覧 表 (列: 画像/名称/属性/タイプ/チームスキル/発動条件/対象/効果/ゲージ速度/入手方法/実装日) ----
console.log('[2/3] parsing sister table...');
const strip = (s) => String(s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const tables = [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/g)];
const t = tables.map((x) => x[1]).find((x) => x.includes('チームスキル') && x.includes('ゲージ速度'));
if (!t) { console.error('ERROR: シスター一覧 table not found'); process.exit(1); }
const rows = [...t.matchAll(/<tr>(?:(?!<\/tr>)[\s\S])*?<\/tr>/g)];

// 持有 sister 名单 (dump): character_name 精确匹配
let dumpSisters = [];
try { dumpSisters = JSON.parse(readFileSync(join(__dirname, 'sister_unit_list.json'), 'utf8')); } catch { /* 未 dump */ }
const ownByName = new Map(dumpSisters.map((s) => [s.character_name, s]));

const wikiRows = [];
for (const [i, r] of rows.entries()) {
  if (i === 0) continue; // 表头
  const tds = [...r[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => x[1]);
  if (tds.length < 8) continue;
  const icon = (r[0].match(/data-src="(attach2\/[^"]+)"/) || [])[1] || '';
  const href = (r[0].match(/href="\.\/\?([^"]+)"/) || [])[1] || ''; // シスター详情页
  const name = strip(tds[1]);
  const own = ownByName.get(name) || null;
  wikiRows.push({
    idx: wikiRows.length,
    name,                                              // シスター名 (含【】变体)
    icon,                                              // Wiki 头像相对路径
    href,                                              // Wiki 详情页路径
    attr: strip(tds[2]),                               // 属性 炎/水/雷/光/闇
    type: strip(tds[3]),                               // タイプ ATK/SPD/DEF/SUP/HEAL
    team: strip(tds[4]),                               // チームスキル (满级合计文本)
    cond: strip(tds[5]),                               // アクティブスキル発動条件
    target: strip(tds[6]),                             // アクティブスキル対象
    effect: strip(tds[7]),                             // アクティブスキル効果 (满级)
    gauge: strip(tds[8]),                              // ゲージ速度
    obtain: strip(tds[9]),                             // 入手方法
    date: strip(tds[10]),                              // 実装日
    owned: !!own,
    ownedSister: own ? own.sister_unit_id : null,
  });
}
console.log(`sister rows: ${wikiRows.length} (owned ${wikiRows.filter((r) => r.owned).length})`);
const miss = dumpSisters.filter((s) => !wikiRows.some((r) => r.name === s.character_name));
if (miss.length) console.log('WARN dump sisters not on wiki:', miss.map((s) => s.character_name).join(', '));

// ---- 3. 下载所有シスター的专属图标 (sw{idx}_icon.png, 持有/未持有统一用 Wiki シスター图标, 不复用 unit 图) ----
console.log('[3/4] downloading sister icons...');
let ok = 0, skip = 0, fail = 0;
for (const r of wikiRows) {
  if (!r.icon) { r.wimg = null; continue; }
  const file = join(IMG_DIR, `sw${r.idx}_icon.png`);
  const res = await dl(BASE + r.icon, file);
  if (res === 'fail') { fail++; r.wimg = null; continue; }
  res === 'ok' ? ok++ : skip++;
  r.wimg = `img/sw${r.idx}_icon.png`;
  await sleep(150);
}
console.log(`icons: ok ${ok} / skip ${skip} / fail ${fail}`);

// ---- 4. 逐卡访问详情页抓专属立绘 (文件名 シスター{名}.png; 排除攻撃作成/图标等杂图) ----
console.log('[4/4] fetching sister illustrations from detail pages...');
const artOk = { ok: 0, skip: 0, fail: 0, none: 0 };
for (const r of wikiRows) {
  if (!r.href) { r.wart = null; continue; }
  const file = join(IMG_DIR, `sw${r.idx}.png`);
  if (existsSync(file)) { artOk.skip++; r.wart = `img/sw${r.idx}.png`; continue; }
  try {
    const dh = await (await fetch(BASE + '?' + r.href, { headers: UA })).text();
    // attach2 URL 结构: attach2/{hex(页名)}_{hex(文件名)}.png; 立绘文件名即 シスター{名}.png
    const pageName = decodeURIComponent(r.href); // 例: シスターフィオナ
    const cand = [...dh.matchAll(/(?:data-src|src)="(attach2\/[0-9A-Fa-f_]+\.png)"/g)]
      .map((m) => m[1])
      .map((u) => {
        // 第二段是 UTF-8 文件名的 hex, 末尾还带字面量 .png 扩展名, 需先去掉再 hex 解码
        const hex = (u.split('_')[1] || '').replace(/\.(?:png|jpg)$/, '');
        let fn = '';
        try { fn = Buffer.from(hex, 'hex').toString('utf8'); } catch { fn = ''; }
        return { u, fn };
      })
      .filter(({ fn }) => /^シスター.+\.png$/.test(fn) && !/攻撃|作成|私服|表情|差分|ドット|戦闘|アイコン|icon/.test(fn));
    // 优先取文件名包含详情页名的 (规避变体页串图)
    const pick = cand.find((c) => c.fn.includes(pageName)) || cand[0];
    if (pick) {
      const res = await dl(BASE + pick.u, file);
      if (res === 'fail') { artOk.fail++; r.wart = null; }
      else { res === 'ok' ? artOk.ok++ : artOk.skip++; r.wart = `img/sw${r.idx}.png`; }
    } else { artOk.none++; r.wart = null; }
  } catch { artOk.fail++; r.wart = null; }
  await sleep(350);
}
console.log(`arts: ok ${artOk.ok} / skip ${artOk.skip} / fail ${artOk.fail} / none ${artOk.none}`);
const noArt = wikiRows.filter((r) => !r.wart).map((r) => r.name);
if (noArt.length) console.log('WARN no art:', noArt.join(', '));

writeFileSync(join(__dirname, 'sister_wiki.json'), JSON.stringify({ fetchedAt: new Date().toISOString().slice(0, 10), rows: wikiRows }, null, 1), 'utf8');
console.log(`OK -> sister_wiki.json (${wikiRows.length} rows)`);

// 爬取 twinklestarknights.wikiru.jp「キャラクター一覧」的角色图片与全图鉴数据，供 index.html 使用
// 匹配规则: unit_list.json 的 unit_id 后 6 位 == Wiki 表格行编号 (如 1001001 -> 001001)
// 用法:
//   node fetch_images.mjs              下载头像 + 立绘大图(逐卡访问详情页, 较慢) + 全图鉴数据 wiki_data.json
//   node fetch_images.mjs --icon-only  仅下载头像 + 全图鉴数据, 秒下
//   已存在的文件自动跳过, 可随时重跑续传
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LIST_URL = 'https://twinklestarknights.wikiru.jp/?%E3%82%AD%E3%83%A3%E3%83%A9%E3%82%AF%E3%82%BF%E3%83%BC%E4%B8%80%E8%A6%A7';
const BASE = 'https://twinklestarknights.wikiru.jp/';
const UA = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  'Accept-Language': 'ja',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const iconOnly = process.argv.includes('--icon-only');
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

// ---- 1. 解析 Wiki 一覧页: 全部行的图鉴数据 ----
console.log('[1/5] fetching wiki list page...');
const html = await (await fetch(LIST_URL, { headers: UA })).text();

const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, '').trim();
const num = (s) => { const n = parseFloat(String(s).replace(/,/g, '')); return Number.isFinite(n) ? n : null; };
const wikiRows = [];
const rowRe = /<tr>(?:(?!<\/tr>)[\s\S])*?<\/tr>/g;
let m;
while ((m = rowRe.exec(html))) {
  const row = m[0];
  const tds = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => x[1]);
  if (tds.length < 18 || !/^\d{6}$/.test(strip(tds[0]))) continue;
  const icon = row.match(/data-src="(attach2\/[^"]+)"/);
  const link = row.match(/<a[^>]+href="\.\/\?([^"]+)"[^>]*title="([^"]*)"/);
  wikiRows.push({
    no: strip(tds[0]),                                  // Wiki 行编号 (unit_id 后 6 位)
    rarity: num(strip(tds[1])),                         // ★ 初始稀有度
    title: link ? decodeURIComponent(link[2] || link[1]) : '',  // ［卡名］角色名
    href: link ? link[1] : '',                          // 详情页路径
    icon: icon ? icon[1] : '',                          // 头像相对路径
    yomi: strip(tds[4]),                                // 名前(ヨミ)
    attr: strip(tds[5]),                                // 属性 炎/水/雷/光/闇
    camp: strip(tds[6]),                                // 陣営 人間/神族/魔族
    affil: strip(tds[7]),                               // 所属
    type: strip(tds[8]),                                // タイプ ATK/SPD/DEF/SUP/ヒール
    atkType: strip(tds[9]),                             // 攻撃タイプ 斬撃/打撃/魔法
    hp: num(strip(tds[10])),                            // Lv1 HP
    atk: num(strip(tds[11])),                           // Lv1 ATK
    ex: num(strip(tds[12])),                            // 消費EX
    exUp: num(strip(tds[13])),                          // EX上昇
    ctMin: num(strip(tds[14])),                         // 最小CT
    ctMax: num(strip(tds[15])),                         // 最大CT
    crit: num(strip(tds[16])),                          // クリティカル(%)
    releaseDate: strip(tds[17]),                        // 実装日
    obtain: strip(tds[18]),                             // 入手方法
  });
}
const wiki = new Map(wikiRows.map((r) => [r.no, r]));
console.log('wiki rows:', wiki.size);

// ---- 2. 与 unit_list.json 匹配 (标题精确 > 编号+名字校验 > 标题包含兜底) ----
// 注意: 部分卡游戏内 unit_id 与 Wiki 行编号错位, 仅靠编号会错配, 故编号匹配须通过名字校验
const units = JSON.parse(readFileSync(join(__dirname, 'unit_list.json'), 'utf8'));
const jobs = [];
const ownedRowIdx = new Set();
const titleIdx = new Map(wikiRows.map((r, idx) => [r.title, idx]));
for (const u of units) {
  const no = String(u.unit_id).slice(-6);
  const expect = `［${u.unit_name}］${u.character_name}`;
  const nameOk = (x) => x.r.title.includes(u.unit_name) || x.r.title.includes(u.character_name);
  let idx = titleIdx.get(expect); // 1) 「［卡名］角色名」精确匹配
  if (idx == null) {
    const cands = wikiRows.map((r, i) => ({ r, idx: i })).filter((x) => x.r.no === no);
    if (cands.length > 1) { // 2) 编号冲突按名消歧 (如 006001 两张クロト)
      const p = cands.find((x) => x.r.title === expect) || cands.find(nameOk) || cands[0];
      idx = p.idx;
      console.log(`  ambiguous no=${no} for ${u.character_name}「${u.unit_name}」-> ${p.r.title}`);
    } else if (cands.length === 1 && nameOk(cands[0])) {
      idx = cands[0].idx; // 3) 编号唯一且名字吻合
    } else {
      const ci = wikiRows.findIndex((r) => r.title.includes(u.unit_name) && r.title.includes(u.character_name));
      if (ci >= 0) { // 4) 编号错位: 标题包含回退
        idx = ci;
        console.log(`  by-title ${u.unit_id} ${u.character_name}「${u.unit_name}」-> ${wikiRows[ci].title} (no=${wikiRows[ci].no})`);
      } else if (cands.length === 1) { // 5) 兜底: 仅编号吻合 (名字对不上, 打警告供人工核对)
        idx = cands[0].idx;
        console.log(`  WARN no-only ${u.unit_id} ${u.character_name}「${u.unit_name}」-> ${cands[0].r.title}`);
      }
    }
  }
  if (idx == null) continue;
  ownedRowIdx.add(idx);
  wikiRows[idx].ownedUnit = u.unit_id; // 供 gen_viewer.mjs 直接引用, 避免重复实现匹配逻辑
  jobs.push({ unit_id: u.unit_id, name: u.character_name + '「' + u.unit_name + '」', ...wikiRows[idx] });
}
const matchedIds = new Set(jobs.map((j) => j.unit_id));
const unmatched = units.filter((u) => !matchedIds.has(u.unit_id));
console.log(`[2/5] matched ${jobs.length}/${units.length} units`);
if (unmatched.length) console.log('  unmatched unit_id:', unmatched.map((u) => u.unit_id).join(', '));
const notOwned = wikiRows.filter((r, idx) => !ownedRowIdx.has(idx));
console.log(`  not owned (wiki only): ${notOwned.length}`);
for (const [idx, r] of wikiRows.entries()) r.owned = ownedRowIdx.has(idx);

// ---- 3. 输出全图鉴数据 wiki_data.json ----
writeFileSync(join(__dirname, 'wiki_data.json'), JSON.stringify({ rows: wikiRows }, null, 1), 'utf8');
console.log(`[3/5] wiki_data.json written (${wikiRows.length} rows)`);

// ---- 4. 下载头像: 持有卡用 {unit_id}_icon, 未持有卡用 w{no}_icon (6 并发) ----
console.log('[4/5] downloading icons...');
let ok = 0, fail = 0;
{
  const queue = [...jobs.map((j) => ({ url: j.icon, file: `${j.unit_id}_icon.png`, label: j.name })),
    ...notOwned.map((r) => ({ url: r.icon, file: `w${r.no}_icon.png`, label: r.title }))].filter((q) => q.url);
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const j = queue.shift();
      const r = await dl(BASE + j.url, join(IMG_DIR, j.file));
      if (r === 'fail') { fail++; console.log(`  icon fail: ${j.file} ${j.label}`); } else ok++;
    }
  }));
}
console.log(`  icons: ok/skip=${ok}, fail=${fail}`);

// ---- 5. 立绘大图 (逐卡访问详情页, 350ms 间隔) ----
if (!iconOnly) {
  console.log('[5/5] fetching illustrations from unit pages...');
  ok = 0; fail = 0;
  const NG = ['私服', '表情', '差分', '戦闘', '攻撃', 'ドット'].map((s) => Buffer.from(s, 'utf8').toString('hex').toUpperCase());
  let i = 0;
  for (const j of jobs) {
    i++;
    const out = join(IMG_DIR, `${j.unit_id}.png`);
    if (existsSync(out)) { ok++; continue; }
    if (!j.href || !j.title) { fail++; console.log(`  no link/title: ${j.unit_id} ${j.name}`); continue; }
    try {
      const page = await (await fetch(BASE + './?' + j.href, { headers: UA })).text();
      const hexTitle = Buffer.from(j.title, 'utf8').toString('hex').toUpperCase();
      const cand = [...page.matchAll(/data-src="(attach2\/[^"]+)"/g)]
        .map((x) => x[1])
        .find((s) => {
          const S = s.toUpperCase();
          return S.includes(hexTitle) && !NG.some((n) => S.includes(n));
        });
      const r = cand ? await dl(BASE + cand, out) : 'none';
      if (r === 'fail' || r === 'none') {
        fail++;
        console.log(`  illust ${r}: ${j.unit_id} ${j.name} title="${j.title}"`);
      } else ok++;
      process.stdout.write(`  [${i}/${jobs.length}] ok=${ok} fail=${fail}\r`);
    } catch (e) {
      fail++;
      console.log(`  error: ${j.unit_id} ${j.name} -> ${e.message}`);
    }
    await sleep(350);
  }
  console.log(`\n  illustrations: ok/skip=${ok}, fail=${fail}`);
}

console.log('done -> run `node gen_viewer.mjs` to rebuild index.html');

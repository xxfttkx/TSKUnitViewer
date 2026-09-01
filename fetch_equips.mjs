// 爬取 twinklestarknights.wikiru.jp 的 装備(武器/防具/装飾品)一覧，产出:
//   equip_wiki.json : Wiki 装备图鉴数据 (按名称匹配 dump 的 equip_id, 供 gen_viewer.mjs 使用)
//   img/equip/{equip_id}.png : 装备图标 (仅 dump 中持有的 139 种, 已存在自动跳过)
// 匹配规则: Wiki「アイテム名」== dump「equip_name」精确匹配
// 未收录装备 (活动时装/纪念道具等) 按 attach2 hex 命名规律补图:
//   attach2/696D67_<hex('equip_<装备名>_NF.png')>  (696D67="img", NF 为全站统一尾缀)
// 用法: node fetch_equips.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://twinklestarknights.wikiru.jp/';
const PAGES = [
  { part: 1, name: '武器', url: '?%E6%AD%A6%E5%99%A8%E4%B8%80%E8%A6%A7' },
  { part: 2, name: '防具', url: '?%E9%98%B2%E5%85%B7%E4%B8%80%E8%A6%A7' },
  { part: 3, name: '装飾品', url: '?%E8%A3%85%E9%A3%BE%E5%93%81%E4%B8%80%E8%A6%A7' },
];
const UA = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  'Accept-Language': 'ja',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, '').trim();
const num = (s) => { const n = parseFloat(String(s).replace(/,/g, '')); return Number.isFinite(n) ? n : null; };

// ---- 1. 抓取三页并解析行 ----
// 列布局:
//   武器   : 画像|アイテム|★|低確率|攻撃タイプ|有効属性|ATK|EX|EX上昇|クリ|アビリティ|入手方法
//   防具   : 画像|アイテム|★|低確率|有効属性|HP|EX|EX上昇|クリ|アビリティ|入手方法
//   装飾品 : No.|画像|アイテム/キャラ|タイプ|HP|ATK|EX|EX上昇|行動CT|クリ(%)|アビリティ
console.log('[1/4] fetching equip list pages...');
const wikiEquips = [];
for (const pg of PAGES) {
  const html = await (await fetch(BASE + pg.url, { headers: UA })).text();
  const rowRe = /<tr>(?:(?!<\/tr>)[\s\S])*?<\/tr>/g;
  let m;
  while ((m = rowRe.exec(html))) {
    const tds = [...m[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => x[1]);
    const icon = m[0].match(/data-src="(attach2\/[^"]+)"/);
    const link = m[0].match(/<a[^>]+href="\.\/\?([^"]+)"[^>]*title="([^"]*)"/);
    let r = null;
    if (pg.part === 1 && tds.length >= 12 && num(strip(tds[2]))) {
      r = { rarity: num(strip(tds[2])), atkType: strip(tds[4]), attr: strip(tds[5]), atk: num(strip(tds[6])), ex: num(strip(tds[7])), exUp: num(strip(tds[8])), crit: num(strip(tds[9])), ability: tds[10].replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').trim(), obtain: strip(tds[11]) };
    } else if (pg.part === 2 && tds.length >= 11 && num(strip(tds[2]))) {
      r = { rarity: num(strip(tds[2])), atkType: '', attr: strip(tds[4]), hp: num(strip(tds[5])), ex: num(strip(tds[6])), exUp: num(strip(tds[7])), crit: num(strip(tds[8])), ability: tds[9].replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').trim(), obtain: strip(tds[10]) };
    } else if (pg.part === 3 && tds.length >= 11 && /^\d+$/.test(strip(tds[0]))) {
      // 名称列格式: 「装備名［卡名］角色名」→ 拆出装备名与卡名
      const rawName = strip(tds[2]);
      const bm = rawName.match(/^(.*?)[［[]([^］\]]+)[］\]](.*)$/);
      r = { no: strip(tds[0]), rarity: null, atkType: strip(tds[3]), attr: '', hp: num(strip(tds[4])), atk: num(strip(tds[5])), ex: num(strip(tds[6])), exUp: num(strip(tds[7])), ct: num(strip(tds[8])), crit: num(strip(tds[9])), ability: tds[10].replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').trim(), obtain: '', charCard: bm ? bm[2] : '' };
      r.name = bm ? bm[1] : rawName;
    }
    if (!r) continue;
    const nameLink = m[0].match(/<a[^>]+href="\.\/\?([^"]+)"[^>]*title="([^"]*)"/);
    r.part = pg.part;
    if (pg.part !== 3) r.name = nameLink ? decodeURIComponent(nameLink[2] || nameLink[1]) : strip(tds[1]); // part3 已在上方拆好
    r.icon = icon ? icon[1] : '';
    r.href = nameLink ? nameLink[1] : '';
    wikiEquips.push(r);
  }
  console.log(`  ${pg.name}: +${wikiEquips.filter((x) => x.part === pg.part).length}`);
  await sleep(400);
}

// ---- 2. 与 dump 装备名称匹配 ----
console.log('[2/4] matching with unit_list.json equip_data...');
const raw = JSON.parse(readFileSync(join(__dirname, 'unit_list.json'), 'utf8'));
const byName = new Map(); // equip_name -> { equip_id, instances:[...] }
for (const u of raw) {
  for (const e of (u.equip_data || [])) {
    if (!byName.has(e.equip_name)) byName.set(e.equip_name, { equip_id: e.equip_id, part: e.equip_part, rarity: e.rarity, exclusive: !!e.exclusive_unit_id, instances: [] });
    byName.get(e.equip_name).instances.push({ unit_id: u.unit_id, unit: u.unit_name, char: u.character_name, lv: e.lv, max_lv: e.max_lv, lb: e.limit_break_count, params: (e.parameter_list || []).map((p) => [p.parameter_type, p.parameter_value]), skill: e.skill_data ? e.skill_data.skill_detail : '', skill_lv: e.skill_data ? e.skill_data.lv : null });
  }
}
let matched = 0, unmatchedDump = [], unmatchedWiki = 0;
for (const w of wikiEquips) {
  const d = byName.get(w.name);
  if (d) { w.equip_id = d.equip_id; w.owned = true; w.instances = d.instances; matched++; } else { w.owned = false; unmatchedWiki++; }
}
for (const [name, d] of byName) if (!wikiEquips.some((w) => w.name === name)) unmatchedDump.push(name);
// 2.5 装飾品名修正: 游戏内名称含角色括号 (如「アルモタヘル(ちぃ)の被り物」), Wiki 表名省略括号段 (「アルモタヘルの被り物」) → 去括号名二次匹配
const stripParen = (s) => s.replace(/[(（][^)）]*[)）]/g, '');
for (const [name, d] of byName) {
  if (wikiEquips.some((w) => w.name === name)) continue;
  const alt = stripParen(name);
  if (alt === name) continue;
  const w = wikiEquips.find((x) => x.name === alt && !x.owned);
  if (w) { w.equip_id = d.equip_id; w.owned = true; w.instances = d.instances; w.nameAlt = name; matched++; unmatchedDump = unmatchedDump.filter((n) => n !== name); unmatchedWiki--; }
}
console.log(`  wiki rows=${wikiEquips.length}, matched=${matched}, dump 未匹配=${unmatchedDump.length}, wiki 未持有=${unmatchedWiki}`);
if (unmatchedDump.length) console.log('  dump 里有但 Wiki 没有:', unmatchedDump.slice(0, 20).join(' / '));

// ---- 参数映射对照报告 (前 12 件已持有装备: dump 参数 vs Wiki 数值列) ----
console.log('\n== parameter_type 对照报告 (dump [t:v] vs Wiki HP/ATK/EX/EXup/CT/crit) ==');
for (const w of wikiEquips.filter((x) => x.owned).slice(0, 12)) {
  const inst = w.instances[0];
  console.log(`  [p${w.part}] ${w.name} ★${w.rarity ?? '?'} | dump {${inst.params.map((p) => p[0] + ':' + p[1]).join(', ')}} | wiki hp=${w.hp ?? '-'} atk=${w.atk ?? '-'} ex=${w.ex ?? '-'} exUp=${w.exUp ?? '-'} ct=${w.ct ?? '-'} crit=${w.crit ?? '-'}`);
}

// ---- 3. 输出 equip_wiki.json + 下载图标 ----
writeFileSync(join(__dirname, 'equip_wiki.json'), JSON.stringify({ rows: wikiEquips }, null, 1), 'utf8');
console.log(`\n[3/4] equip_wiki.json written (${wikiEquips.length} rows, owned ${matched})`);
const EQ_DIR = join(__dirname, 'img', 'equip');
mkdirSync(EQ_DIR, { recursive: true });
let ok = 0, skip = 0, fail = 0;
for (const w of wikiEquips.filter((x) => x.owned && x.icon)) {
  const file = join(EQ_DIR, `${w.equip_id}.png`);
  if (existsSync(file)) { skip++; continue; }
  let done = false;
  for (let i = 0; i < 3 && !done; i++) {
    try {
      const res = await fetch(BASE + encodeURI(w.icon), { headers: UA });
      if (res.ok) { writeFileSync(file, Buffer.from(await res.arrayBuffer())); done = true; }
    } catch { /* retry */ }
    if (!done) await sleep(500);
  }
  if (done) ok++; else { fail++; console.log(`  FAIL: ${w.equip_id} ${w.name}`); }
  await sleep(150);
}
console.log(`icons: ok=${ok} skip=${skip} fail=${fail}`);

// ---- 4. Wiki 一覧未收录装备: 按 attach2 hex 命名规律构造 URL 补图 ----
// 已收录装备的图标文件名均为 img_equip_<装备名>_NF.png, 未收录的活动装备同样遵循该约定
console.log('\n[4/4] fetching icons for equipments missing from wiki list pages...');
let ok4 = 0, skip4 = 0, fail4 = 0;
for (const [name, d] of byName) {
  const file = join(EQ_DIR, `${d.equip_id}.png`);
  if (existsSync(file)) { skip4++; continue; }
  const hex = Buffer.from(`equip_${name}_NF.png`, 'utf8').toString('hex').toUpperCase();
  const url = `${BASE}attach2/696D67_${hex}.png`; // 编码约定: hex('img')_hex('equip_<名>_NF.png') + 明文 '.png' 后缀
  let done = false;
  for (let i = 0; i < 3 && !done; i++) {
    try {
      const res = await fetch(url, { headers: UA });
      if (res.ok && (res.headers.get('content-type') || '').includes('image')) {
        writeFileSync(file, Buffer.from(await res.arrayBuffer())); done = true;
      }
    } catch { /* retry */ }
    if (!done) await sleep(500);
  }
  if (done) ok4++; else { fail4++; console.log(`  MISS: ${d.equip_id} ${name}`); }
  await sleep(150);
}
console.log(`extra icons: ok=${ok4} skip=${skip4} fail=${fail4}`);

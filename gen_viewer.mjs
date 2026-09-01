// 读取 unit_list.json，生成单文件交互式角色图鉴 index.html
// 若存在 img/ 目录（fetch_images.mjs 产物），自动在卡片/详情中使用本地图片
// 若存在 wiki_data.json（fetch_images.mjs 产物），合并 Wiki 面板数值并提供全图鉴收集视图
// 用法: node gen_viewer.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(__dirname, 'unit_list.json'), 'utf8'));

// Wiki 全图鉴数据: owned=已持有；wiki 中文属性/类型 → json 数字 ID 映射
let wikiRows = [];
try { wikiRows = JSON.parse(readFileSync(join(__dirname, 'wiki_data.json'), 'utf8')).rows; } catch { /* wiki_data.json 不存在 */ }
const WIKI_ATTR_ID = { '炎': 1, '水': 2, '雷': 3, '光': 4, '闇': 5 };
const WIKI_ROLE_ID = { ATK: 1, SPD: 2, DEF: 3, SUP: 4, HEAL: 5, 'ヒール': 5 }; // HEAL=Wiki 现行记法, ヒール=旧记法兜底
const WIKI_CAMP_ID = { '人間': 1, '神族': 2, '魔族': 3 };

// 扫描本地图片: img/{unit_id}.png 为立绘, img/{unit_id}_icon.png 为 Wiki 头像, img/w{no}_icon.png 为未持有卡头像
let imgSet = new Set();
try { imgSet = new Set(readdirSync(join(__dirname, 'img'))); } catch { /* img 目录不存在 */ }
const pickArt = (id) => {
  if (imgSet.has(`${id}.png`)) return `img/${id}.png`;
  if (imgSet.has(`${id}.jpg`)) return `img/${id}.jpg`;
  return null;
};
const pickIcon = (id) => (imgSet.has(`${id}_icon.png`) ? `img/${id}_icon.png` : null);
// 未持有卡头像: img/w{no}_icon.png (fetch_images.mjs 下载)
for (const r of wikiRows) r.wimg = imgSet.has(`w${r.no}_icon.png`) ? `img/w${r.no}_icon.png` : null;

// ---- 字段映射（已通过攻略 Wiki 交叉验证）----
const ATTR = { 1: '炎', 2: '水', 3: '雷', 4: '光', 5: '闇' };
const ATTR_COLOR = { 1: '#ff6b4a', 2: '#4a9eff', 3: '#3fd97f', 4: '#ffd94a', 5: '#8b5cf6' };
const ROLE = { 1: 'ATK', 2: 'SPD', 3: 'DEF', 4: 'SUP', 5: 'HEAL' };
const CAMP = { 1: '人間', 2: '神族', 3: '魔族' };
// 所属名称已全部经 Wiki 角色详情页「所属」栏核验 (3=守護天使, 7=コラプサー, 8=極星学園 等)
const AFFIL = { 0: '無所属', 1: '流星学園', 2: '新星学園', 3: '守護天使', 4: 'ネビュラ', 5: '流星附属', 7: 'コラプサー', 8: '極星学園' };

const cleanStyle = (s) => String(s ?? '').replace(/<style[^>]*>|<\/style>/g, '');

const units = raw.map((u) => ({
  id: u.u_unit_id,
  unit_id: u.unit_id,
  char_id: u.character_id,
  cname: u.character_name,
  uname: u.unit_name,
  fname: cleanStyle(u.full_name),
  rarity: u.rarity,
  max_rarity: u.max_rarity,
  attr: u.attr_type,
  role: u.role,
  camp: u.camp,
  camps: u.camp_list,       // 完整陣営集合 (可能多个, camp 为主值)
  affil: u.affiliation,
  affils: u.affiliation_list, // 完整所属集合 (可能多个, affiliation 为主值)
  lv: u.lv,
  max_lv: u.max_lv,
  love: u.love_lv,
  max_love: u.max_love_lv,
  power: u.power,
  team_hp: u.team_hp,
  limit: u.lv_limit_count,
  bond: u.is_bond_unit,
  event: u.is_event_unit,
  awake: u.is_awake_unit,
  illust: u.unit_illust_id,
  art: pickArt(u.unit_id),
  icon: pickIcon(u.unit_id),
  birthday: u.birthday,
  constellation: u.constellation,
  star: u.guardian_star,
  year: u.school_year,
  committee: u.committee,
  club: u.club,
  hobby: u.hobby,
  cv: u.cv,
  profile: u.profile,
  // 新版 dump 已解析的实体 (旧版为类型名占位符): 技能 / 升星解锁被动 / 当前练度白值 / 好感加成
  skills: (u.skill_data || []).map((s) => ({ type: s.skill_data_type, name: s.skill_name, detail: s.skill_detail, lv: s.lv, max_lv: s.max_lv, cost: s.cost_ex_gauge, unlock: s.is_unlock, cond: s.unlock_condition })),
  uniques: (u.unique_skill_data || []).map((s) => ({ name: s.skill_name, detail: s.detail, unlock: s.is_unlock, cond: s.unlock_condition })),
  st: (u.status_data && u.status_data.base_data) ? { hp: +u.status_data.base_data.hp, atk: u.status_data.base_data.attack, crit: u.status_data.base_data.critical, initEx: u.status_data.base_data.init_ex_gauge, maxEx: u.status_data.base_data.max_ex_gauge, exRate: u.status_data.base_data.ex_gauge_rate, wtMin: u.status_data.base_data.min_wt, wtMax: u.status_data.base_data.max_wt } : null,
  loveB: (u.status_data && u.status_data.add_love_lv) ? { hp: +u.status_data.add_love_lv.hp, atk: u.status_data.add_love_lv.attack, crit: u.status_data.add_love_lv.critical } : null,
})).sort((a, b) => b.power - a.power || a.char_id - b.char_id);

// 合并 Wiki 数据到持有卡 (fetch_images.mjs 已按 编号→标题 匹配, ownedUnit=持有 unit_id)
const wikiByUnit = new Map();
for (const [idx, r] of wikiRows.entries()) {
  if (r.ownedUnit != null && !wikiByUnit.has(r.ownedUnit)) wikiByUnit.set(String(r.ownedUnit), { ...r, rowIdx: idx });
}
for (const u of units) {
  const w = wikiByUnit.get(String(u.unit_id));
  if (!w) continue;
  Object.assign(u, {
    wRar: w.rarity, // Wiki ★ = 初始稀有度 (json rarity 是升星〔限界突破〕后的当前稀有度)
    whp: w.hp, watk: w.atk, wex: w.ex, wexUp: w.exUp, wctMin: w.ctMin, wctMax: w.ctMax,
    wcrit: w.crit, watkType: w.atkType, wdate: w.releaseDate, wobtain: w.obtain, whref: w.href, rowIdx: w.rowIdx,
  });
}

const stats = {
  total: units.length,
  totalPower: units.reduce((s, u) => s + u.power, 0),
  maxLv: units.filter((u) => u.lv >= u.max_lv).length,
  maxLove: units.filter((u) => u.max_love > 0 && u.love >= u.max_love).length,
  r5: units.filter((u) => u.rarity === 5).length,
  chars: new Set(units.map((u) => u.char_id)).size,
  collected: wikiRows.filter((r) => r.owned).length,
  dexTotal: wikiRows.length,
};

// Wiki 行类型统一归一为数字 ID (前端筛选/显示共用, 与持有卡的 u.role 同一套枚举)
for (const r of wikiRows) r.typeId = WIKI_ROLE_ID[r.type] ?? 0;

const payload = JSON.stringify({ units, stats, wikiRows, ATTR, ATTR_COLOR, ROLE, CAMP, AFFIL, WIKI_ATTR_ID, WIKI_CAMP_ID })
  .replace(/</g, '\\u003c');

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>星骑图鉴 · Twinkle Star Knights X</title>
<style>
  :root {
    --bg: #0b0e1a; --panel: #141830; --panel2: #1b2145; --line: #2a3161;
    --text: #e8ebff; --dim: #9aa3cf; --gold: #ffd76a; --pink: #ff7eb6;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg); color: var(--text);
    font-family: "Segoe UI", "Microsoft YaHei", "Hiragino Sans", sans-serif;
    min-height: 100vh;
    background-image:
      radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,.6) 50%, transparent 51%),
      radial-gradient(1px 1px at 60% 70%, rgba(255,255,255,.4) 50%, transparent 51%),
      radial-gradient(2px 2px at 80% 20%, rgba(255,215,106,.5) 50%, transparent 51%),
      radial-gradient(1px 1px at 40% 80%, rgba(255,255,255,.5) 50%, transparent 51%),
      radial-gradient(ellipse 80% 50% at 50% -10%, rgba(90,80,200,.35), transparent);
  }
  header { padding: 28px 32px 8px; }
  h1 { font-size: 26px; letter-spacing: 2px; }
  h1 .star { color: var(--gold); }
  .sub { color: var(--dim); font-size: 13px; margin-top: 4px; }
  .stats { display: flex; flex-wrap: wrap; gap: 14px; padding: 18px 32px 6px; }
  .stat {
    background: linear-gradient(135deg, var(--panel), var(--panel2));
    border: 1px solid var(--line); border-radius: 12px; padding: 12px 20px; min-width: 120px;
  }
  .stat .v { font-size: 22px; font-weight: 700; color: var(--gold); }
  .stat .k { font-size: 12px; color: var(--dim); margin-top: 2px; }
  .toolbar { padding: 14px 32px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; position: sticky; top: 0;
    background: rgba(11,14,26,.92); backdrop-filter: blur(8px); z-index: 10; border-bottom: 1px solid var(--line); }
  input[type=search], select {
    background: var(--panel); color: var(--text); border: 1px solid var(--line);
    border-radius: 8px; padding: 8px 12px; font-size: 14px; outline: none;
  }
  input[type=search] { width: 220px; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip {
    padding: 6px 12px; border-radius: 999px; border: 1px solid var(--line);
    background: var(--panel); color: var(--dim); font-size: 13px; cursor: pointer; user-select: none;
  }
  .chip.on { color: #fff; border-color: currentColor; font-weight: 700; }
  /* 组标签: 金色标题 + 竖线分隔; 亮=该组为「全部」, 暗=已有具体筛选, 点击重置该组 */
  .chip.lead {
    border: none; background: none; padding: 6px 2px; color: var(--dim);
    font-weight: 700; letter-spacing: 1px;
  }
  .chip.lead::after {
    content: ''; display: inline-block; width: 1px; height: 12px;
    background: var(--line); margin-left: 8px; vertical-align: -1px;
  }
  .chip.lead.on { color: var(--gold); text-shadow: 0 0 10px rgba(255,215,106,.35); }
  .chip.lead:hover { color: var(--gold); }
  .chip .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 5px; vertical-align: 1px; }
  .count { color: var(--dim); font-size: 13px; margin-left: auto; }
  main { padding: 20px 32px 60px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 14px; }
  .card {
    background: linear-gradient(160deg, var(--panel), var(--panel2));
    border: 1px solid var(--line); border-radius: 14px; overflow: hidden; cursor: pointer;
    transition: transform .15s, box-shadow .15s; position: relative;
  }
  .card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,.5), 0 0 0 1px rgba(255,215,106,.25); }
  .portrait {
    height: 86px; display: flex; align-items: center; justify-content: center; position: relative;
    font-size: 44px; font-weight: 800; color: rgba(255,255,255,.92); text-shadow: 0 2px 12px rgba(0,0,0,.55);
  }
  .portrait .pimg {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: cover; object-position: top center; z-index: 1; image-rendering: auto;
  }
  .portrait .picon {
    position: absolute; inset: 0; margin: auto; width: 74px; height: 74px;
    object-fit: cover; z-index: 1; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,.45);
  }
  .timg { width: 32px; height: 32px; object-fit: cover; border-radius: 6px; vertical-align: middle; }
  .rstars { position: absolute; top: 6px; left: 8px; font-size: 13px; letter-spacing: 1px; color: var(--gold); text-shadow: 0 1px 4px rgba(0,0,0,.8); z-index: 2; }
  .attrbadge { position: absolute; top: 6px; right: 8px; font-size: 12px; font-weight: 700;
    background: rgba(0,0,0,.45); border-radius: 999px; padding: 2px 8px; z-index: 2; }
  .badges { position: absolute; bottom: 5px; left: 8px; display: flex; gap: 5px; z-index: 2; }
  .wikilink { position: absolute; bottom: 5px; right: 8px; z-index: 3; font-size: 11px; line-height: 1;
    color: #c8d6ff; background: rgba(0,0,0,.5); border-radius: 6px; padding: 3px 7px; text-decoration: none; }
  .wikilink:hover { background: rgba(64,110,255,.6); color: #fff; }
  .tag { font-size: 11px; padding: 2px 7px; border-radius: 999px; background: rgba(0,0,0,.5); border: 1px solid rgba(255,255,255,.25); }
  .card.notown { opacity: .62; filter: grayscale(.35); cursor: default; }
  .card.notown:hover { filter: grayscale(.1); }
  .tag.max { background: linear-gradient(90deg, #c9962c, #ffd76a); color: #201500; font-weight: 800; border: none; }
  .tag.lovemax { background: linear-gradient(90deg, #d4508f, #ff7eb6); color: #2a0012; font-weight: 800; border: none; }
  .cardbody { padding: 10px 12px 12px; }
  .uname { font-size: 15px; font-weight: 700; line-height: 1.3; }
  .cname { font-size: 12.5px; color: var(--dim); margin-top: 2px; }
  .nums { display: flex; justify-content: space-between; margin-top: 9px; font-size: 12.5px; }
  .nums b { color: var(--gold); font-size: 14px; }
  .nums .heart { color: var(--pink); }
  .meta { margin-top: 6px; font-size: 11.5px; color: var(--dim); display: flex; gap: 6px; flex-wrap: wrap; }
  .meta span { background: rgba(255,255,255,.06); border-radius: 5px; padding: 1.5px 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 7px 10px; border-bottom: 1px solid var(--line); text-align: left; white-space: nowrap; }
  th { color: var(--dim); font-weight: 600; position: sticky; top: 0; background: var(--panel); cursor: pointer; user-select: none; }
  tr:hover td { background: rgba(255,255,255,.04); }
  .tdwrap { overflow-x: auto; background: var(--panel); border: 1px solid var(--line); border-radius: 12px; }
  .role-chip { font-weight: 700; font-size: 12px; }
  .empty { color: var(--dim); text-align: center; padding: 60px 0; }
  /* modal */
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.65); display: none; align-items: center; justify-content: center; z-index: 50; padding: 24px; }
  .overlay.show { display: flex; }
  .modal {
    background: linear-gradient(160deg, var(--panel), var(--panel2));
    border: 1px solid var(--line); border-radius: 16px; max-width: 860px; width: 100%;
    max-height: 85vh; padding: 26px 28px; position: relative;
    display: flex; gap: 18px; overflow: hidden;
  }
  /* 同图模糊铺底 (氛围), 立绘本体在右侧展示面板等比完整显示 */
  .martbg { position: absolute; inset: 0; z-index: 0; pointer-events: none; border-radius: 15px; overflow: hidden; }
  .martbg img { position: absolute; inset: -40px; width: calc(100% + 80px); height: calc(100% + 80px);
    object-fit: cover; filter: blur(28px) brightness(.5) saturate(1.2); transform: scale(1.12); }
  .martbg::after { content: ''; position: absolute; inset: 0; background: rgba(10, 12, 26, .35); }
  .mmain { flex: 1; min-width: 0; position: relative; z-index: 1; overflow-y: auto; padding-right: 4px; }
  /* 弹窗滚动条: 细条/透明轨道/悬停点亮 */
  .mmain, .mfig { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.14) transparent; }
  .mmain::-webkit-scrollbar, .mfig::-webkit-scrollbar { width: 6px; }
  .mmain::-webkit-scrollbar-track, .mfig::-webkit-scrollbar-track { background: transparent; }
  .mmain::-webkit-scrollbar-thumb, .mfig::-webkit-scrollbar-thumb { background: rgba(255,255,255,.14); border-radius: 3px; }
  .mmain:hover::-webkit-scrollbar-thumb, .mfig:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,.22); }
  .mmain::-webkit-scrollbar-thumb:hover, .mfig::-webkit-scrollbar-thumb:hover { background: rgba(255,217,106,.5); }
  .mfig { flex: none; width: 252px; position: relative; z-index: 1; display: flex; flex-direction: column; gap: 10px; max-height: 100%; overflow-y: auto; padding-right: 2px; }
  .figpanel { height: clamp(200px, 32vh, 330px); flex: none; border-radius: 14px; border: 1px solid var(--line);
    display: flex; align-items: center; justify-content: center; overflow: hidden; }
  /* 右栏内的白值/档案紧凑单列版 */
  .mfig .section { margin-top: 2px; }
  .mfig .statgrid { grid-template-columns: 1fr; gap: 6px; }
  .mfig .stat { flex-direction: row; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 2px 8px; padding: 7px 10px; }
  .mfig .stat .sv { font-size: 16px; }
  .mfig .grid2 { grid-template-columns: 1fr; font-size: 12.5px; gap: 5px; }
  .figpanel img { max-width: 92%; max-height: 92%; object-fit: contain; filter: drop-shadow(0 8px 18px rgba(0,0,0,.55)); }
  .figpanel .ficon { width: 100%; height: 100%; object-fit: cover; }
  .modal .close { position: absolute; top: 12px; right: 16px; font-size: 22px; color: var(--dim); cursor: pointer; background: none; border: none; z-index: 2; }
  .modal h2 { font-size: 20px; }
  .mmain .sub2 { color: var(--dim); font-size: 13px; margin: 2px 0 14px; }
  .wlink { color: #7ab7ff; text-decoration: none; font-weight: 600; }
  .wlink:hover { text-decoration: underline; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; font-size: 13.5px; }
  .grid2 .k { color: var(--dim); }
  .section { margin-top: 16px; }
  .section h3 { font-size: 13px; color: var(--gold); margin-bottom: 6px; letter-spacing: 1px; }
  .profile { white-space: pre-line; font-size: 13.5px; line-height: 1.75; color: #cfd5f7; background: rgba(0,0,0,.25); border-radius: 10px; padding: 12px 14px; }
  .statgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; margin-top: 8px; }
  .stat { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
  .stat .sv { font-size: 19px; font-weight: 800; color: #fff; }
  .stat .sk { font-size: 11px; color: var(--dim); }
  .stat .sk i { font-style: normal; color: var(--pink); margin-left: 4px; }
  .stag { display: inline-block; font-size: 10px; font-weight: 800; padding: 1px 7px; border-radius: 99px; margin-right: 4px; vertical-align: 1px; }
  .st-ex { background: rgba(255,217,74,.15); color: var(--gold); }
  .st-u { background: rgba(74,158,255,.18); color: #7ac0ff; }
  .st-s { background: rgba(255,138,196,.15); color: var(--pink); }
  .st-p { background: rgba(139,92,246,.22); color: #c3a6ff; }
  .skill { padding: 8px 0; border-bottom: 1px dashed rgba(255,255,255,.08); }
  .skill:last-child { border-bottom: 0; }
  .sname b { font-size: 13.5px; }
  .smeta { font-size: 11px; color: var(--dim); margin-left: 8px; }
  .sdetail { font-size: 12.5px; color: #c9d0f0; line-height: 1.6; margin-top: 3px; }
  .slock { opacity: .55; }
  .slocktag { font-size: 10px; color: #aab; border: 1px solid #556; border-radius: 99px; padding: 0 6px; margin-left: 6px; }
  .scond { font-size: 11.5px; color: #9aa3c7; margin-top: 2px; }
  .progressbar { height: 6px; border-radius: 3px; background: rgba(255,255,255,.1); margin-top: 4px; overflow: hidden; }
  .progressbar i { display: block; height: 100%; border-radius: 3px; background: linear-gradient(90deg, var(--gold), #ffe9a8); }
</style>
</head>
<body>
<header>
  <h1><span class="star">✦</span> 星骑图鉴 <span style="font-size:14px;color:var(--dim)">Twinkle Star Knights X</span></h1>
  <div class="sub">数据来源: unit_list.json（Frida dump）· 点击卡片查看详情</div>
</header>
<div class="stats" id="stats"></div>
<div class="toolbar">
  <input type="search" id="q" placeholder="搜索 角色名 / 卡名 / CV …">
  <div class="chips" id="attrChips"></div>
  <div class="chips" id="roleChips"></div>
  <div class="chips" id="rarChips"></div>
  <div class="chips" id="campChips"></div>
  <div class="chips" id="ownChips" style="display:none"></div>
  <select id="sortSel">
    <option value="power">排序：战力</option>
    <option value="lv">排序：等级</option>
    <option value="love">排序：好感度</option>
    <option value="rarity">排序：稀有度</option>
    <option value="uid">排序：编号</option>
    <option value="date">排序：实装日期</option>
  </select>
  <button id="dirBtn" class="chip" style="font-family:inherit" title="切换排序方向">↓ 降序</button>
  <select id="viewSel">
    <option value="card">视图：卡牌</option>
    <option value="table">视图：表格</option>
    <option value="char">视图：按角色</option>
    <option value="dex">视图：全图鉴</option>
  </select>
  <span class="count" id="count"></span>
</div>
<main id="main"></main>

<div class="overlay" id="overlay"><div class="modal" id="modal"></div></div>

<script>
const DATA = ${payload};
const WIKI_BASE = 'https://twinklestarknights.wikiru.jp/?';
const { units, stats, wikiRows, ATTR, ATTR_COLOR, ROLE, CAMP, AFFIL, WIKI_ATTR_ID, WIKI_CAMP_ID } = DATA;
const state = { q: '', attr: 0, role: 0, rar: 0, camp: 0, own: 0, sort: 'power', desc: false, view: 'card' };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stars = (n) => '★'.repeat(n);
// 稀有度显示: 升星(限界突破)过的卡显示 初始→当前 (json rarity=当前, Wiki ★=初始)
const rareStr = (u) => (u.wRar && u.wRar < u.rarity ? \`★\${u.wRar}→\${u.rarity}\` : stars(u.rarity));
// 头像(50x50)用 picon 居中展示, 立绘大图用 pimg 裁剪铺满 (按文件名后缀区分)
const imgTag = (src) => (!src ? '' : \`<img class="\${src.endsWith('_icon.png') ? 'picon' : 'pimg'}" src="\${src}" loading="lazy" onerror="this.remove()">\`);
const affilName = (a) => AFFIL[a] ?? ('所属' + a);
// 双重陣営/所属卡: 显示完整集合 (如 人間·神族 / 新星学園·ネビュラ?)
const campStr = (u) => (u.camps || [u.camp]).map((id) => CAMP[id]).join('·');
const affilStr = (u) => (u.affils || [u.affil]).map(affilName).join('·');
const unitByRow = new Map(); // rowIdx -> 持有 unit
for (const u of units) if (u.rowIdx != null) unitByRow.set(u.rowIdx, u);

document.getElementById('stats').innerHTML = [
  ['持有卡牌', stats.total], ['登场角色', stats.chars], ['总战力', stats.totalPower.toLocaleString()],
  ['图鉴收集', stats.collected + ' / ' + stats.dexTotal], ['★5', stats.r5], ['满级', stats.maxLv], ['好感满', stats.maxLove],
].map(([k, v]) => \`<div class="stat"><div class="v">\${v}</div><div class="k">\${k}</div></div>\`).join('');

function chipRow(el, items, key) {
  const box = document.getElementById(el);
  box.innerHTML = items.map(([v, label, color], i) => {
    const on = state[key] === v;
    const lead = i === 0;
    return \`<span class="chip \${lead ? 'lead' : ''}\${on ? ' on' : ''}" data-v="\${v}" \${lead ? 'title="点击重置该组筛选"' : ''} \${color ? \`style="color:\${on ? color : ''}"\` : ''}>\${color ? \`<span class="dot" style="background:\${color}"></span>\` : ''}\${label}</span>\`;
  }).join('');
  box.querySelectorAll('.chip').forEach((c) => c.onclick = () => {
    const v = +c.dataset.v;
    // 再次点击已激活的筛选项 = 重置该组为「全部」
    state[key] = (state[key] === v && v !== 0) ? 0 : v;
    renderToolbar(); render();
  });
}
function renderToolbar() {
  chipRow('attrChips', [[0, '属性'], ...Object.entries(ATTR).map(([k, v]) => [+k, v, ATTR_COLOR[k]])], 'attr');
  chipRow('roleChips', [[0, '类型'], ...Object.entries(ROLE).map(([k, v]) => [+k, v])], 'role');
  chipRow('rarChips', [[0, '稀有度'], [5, '★5'], [4, '★4'], [3, '★3'], [2, '★2']], 'rar');
  chipRow('campChips', [[0, '种族'], ...Object.entries(CAMP).map(([k, v]) => [+k, v])], 'camp');
  chipRow('ownChips', [[0, '持有'], [1, '已持有'], [2, '未持有']], 'own');
}

function filtered() {
  const q = state.q.toLowerCase();
  let arr = units.filter((u) =>
    (!q || (u.cname + u.uname + u.fname + u.cv).toLowerCase().includes(q)) &&
    (!state.attr || u.attr === state.attr) &&
    (!state.role || u.role === state.role) &&
    (!state.rar || u.rarity === state.rar) &&
    (!state.camp || u.camps.includes(state.camp)));
  const cmp = {
    power: (a, b) => b.power - a.power,
    lv: (a, b) => b.lv - a.lv || b.power - a.power,
    love: (a, b) => b.love - a.love || b.power - a.power,
    rarity: (a, b) => b.rarity - a.rarity || b.power - a.power,
    uid: (a, b) => a.unit_id - b.unit_id,
    date: (a, b) => (b.wdate || '').localeCompare(a.wdate || '') || b.power - a.power,
  }[state.sort];
  arr.sort(cmp);
  return state.desc ? arr.reverse() : arr;
}

function cardHTML(u) {
  const c = ATTR_COLOR[u.attr];
  const lvMax = u.lv >= u.max_lv;
  const loveMax = u.max_love > 0 && u.love >= u.max_love;
  return \`<div class="card" data-id="\${u.id}">
    <div class="portrait" style="background:linear-gradient(150deg,\${c}55,\${c}18 60%,transparent),linear-gradient(160deg,#1b2145,#141830)">
      \${imgTag(u.icon || u.art)}
      <div class="rstars">\${rareStr(u)}</div>
      <div class="attrbadge" style="color:\${c}">\${ATTR[u.attr]}</div>
      \${esc(u.cname[0])}
      <div class="badges">
        \${lvMax ? '<span class="tag max">Lv MAX</span>' : (u.limit > 0 ? \`<span class="tag">解放\${u.limit}</span>\` : '')}
        \${loveMax ? '<span class="tag lovemax">♥MAX</span>' : ''}
        \${u.bond ? '<span class="tag">绊</span>' : ''}
      </div>
    </div>
    <div class="cardbody">
      <div class="uname">\${esc(u.uname)}</div>
      <div class="cname">\${esc(u.cname)}</div>
      <div class="nums"><span>Lv \${u.lv}<span style="color:var(--dim)">/\${u.max_lv}</span></span><span class="heart">♥ \${u.love}</span><span><b>\${u.power.toLocaleString()}</b></span></div>
      <div class="meta"><span class="role-chip" style="color:\${{1:'#ff8a7a',2:'#7ae0ff',3:'#8fa0ff',4:'#c39bff',5:'#ff9ec4'}[u.role]}">\${ROLE[u.role]}</span><span>\${esc(campStr(u))}</span><span>\${esc(affilStr(u))}</span></div>
    </div>
  </div>\`;
}

function render() {
  document.getElementById('ownChips').style.display = state.view === 'dex' ? '' : 'none';
  if (state.view === 'dex') { renderDex(); return; }
  const arr = filtered();
  document.getElementById('count').textContent = \`共 \${arr.length} 张\`;
  const main = document.getElementById('main');
  if (!arr.length) { main.innerHTML = '<div class="empty">没有符合筛选条件的卡牌</div>'; return; }
  if (state.view === 'card') {
    main.innerHTML = '<div class="grid">' + arr.map(cardHTML).join('') + '</div>';
    main.querySelectorAll('.card').forEach((el) => el.onclick = () => showModal(+el.dataset.id));
  } else if (state.view === 'table') {
    const rows = arr.map((u) => \`<tr>
      <td>\${u.icon || u.art ? \`<img class="timg" src="\${u.icon || u.art}" loading="lazy" onerror="this.remove()">\` : ''}</td>
      <td style="color:var(--gold)">\${rareStr(u)}</td>
      <td style="color:\${ATTR_COLOR[u.attr]}">\${ATTR[u.attr]}</td>
      <td>\${esc(u.cname)}</td><td>\${esc(u.uname)}</td>
      <td class="role-chip">\${ROLE[u.role]}</td><td>\${esc(campStr(u))}</td><td>\${esc(affilStr(u))}</td>
      <td>\${u.lv}/\${u.max_lv}\${u.lv >= u.max_lv ? ' <span style="color:var(--gold)">MAX</span>' : ''}</td>
      <td style="color:var(--pink)">\${u.love}</td>
      <td><b>\${u.power.toLocaleString()}</b></td>
      <td>\${u.limit || '-'}</td><td>\${esc(u.birthday)}</td><td>\${esc(u.cv)}</td>
    </tr>\`).join('');
    main.innerHTML = \`<div class="tdwrap"><table><thead><tr>
      <th></th><th>★</th><th>属性</th><th>角色</th><th>卡名</th><th>类型</th><th>种族</th><th>所属</th><th>Lv</th><th>♥</th><th>战力</th><th>解放</th><th>生日</th><th>CV</th>
    </tr></thead><tbody>\${rows}</tbody></table></div>\`;
  } else if (state.view === 'char') {
    const byChar = new Map();
    for (const u of arr) { if (!byChar.has(u.char_id)) byChar.set(u.char_id, []); byChar.get(u.char_id).push(u); }
    const list = [...byChar.values()].map((g) => ({ g, top: g.reduce((a, b) => b.power > a.power ? b : a) }))
      .sort((a, b) => b.top.power - a.top.power);
    main.innerHTML = '<div class="grid">' + list.map(({ g, top }) => {
      const c = ATTR_COLOR[top.attr];
      const cards = g.map((u) => \`<div style="margin:3px 0;display:flex;gap:8px;align-items:baseline;font-size:12.5px">
        <span style="color:var(--gold);font-size:11px">\${rareStr(u)}</span>
        <span style="color:\${ATTR_COLOR[u.attr]};font-weight:700">\${ATTR[u.attr]}</span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${esc(u.uname)}</span>
        <span style="color:var(--dim)">Lv\${u.lv}</span><span><b style="color:var(--gold)">\${u.power.toLocaleString()}</b></span></div>\`).join('');
      return \`<div class="card" data-id="\${top.id}">
        <div class="portrait" style="background:linear-gradient(150deg,\${c}55,\${c}18 60%,transparent),linear-gradient(160deg,#1b2145,#141830);font-size:38px">
          \${imgTag(top.icon || top.art)}
          <div class="rstars">\${g.length} 张卡</div>\${esc(top.cname[0])}</div>
        <div class="cardbody">
          <div class="uname">\${esc(top.cname)}</div>
          <div class="cname">最高战力卡：\${esc(top.uname)}</div>
          <div class="nums"><span>Lv \${Math.max(...g.map((x) => x.lv))}</span><span><b>\${top.power.toLocaleString()}</b></span></div>
          <div style="margin-top:8px;border-top:1px dashed var(--line);padding-top:7px">\${cards}</div>
        </div></div>\`;
    }).join('') + '</div>';
    main.querySelectorAll('.card').forEach((el) => el.onclick = () => showModal(+el.dataset.id));
  }
}

// 全图鉴视图: 展示 Wiki 全部角色 (含未持有), 未持有置灰
function renderDex() {
  const main = document.getElementById('main');
  const q = state.q.toLowerCase();
  const arr = wikiRows.map((r, idx) => ({ r, idx })).filter(({ r }) =>
    (!q || (r.title + r.yomi + r.no).toLowerCase().includes(q)) &&
    (!state.attr || WIKI_ATTR_ID[r.attr] === state.attr) &&
    (!state.role || r.typeId === state.role) &&
    (!state.camp || WIKI_CAMP_ID[r.camp] === state.camp) &&
    (!state.rar || r.rarity === state.rar) &&
    (!state.own || (state.own === 1 ? r.owned : !r.owned)));
  const ownedFirst = (a, b) => (b.r.owned - a.r.owned) || (b.r.rarity || 0) - (a.r.rarity || 0) || a.r.no.localeCompare(b.r.no);
  const cmp = {
    power: ownedFirst,
    lv: ownedFirst,
    love: ownedFirst,
    rarity: (a, b) => (b.r.rarity || 0) - (a.r.rarity || 0) || a.r.no.localeCompare(b.r.no), // 按初始稀有度
    uid: (a, b) => a.r.no.localeCompare(b.r.no),
    date: (a, b) => (b.r.releaseDate || '').localeCompare(a.r.releaseDate || '') || a.r.no.localeCompare(b.r.no),
  }[state.sort] || ownedFirst;
  arr.sort(cmp);
  if (state.desc) arr.reverse();
  const ownCnt = arr.filter((x) => x.r.owned).length;
  document.getElementById('count').textContent = \`共 \${arr.length} 名（持有 \${ownCnt} / 未持有 \${arr.length - ownCnt}）\`;
  if (!arr.length) { main.innerHTML = '<div class="empty">没有符合筛选条件的角色</div>'; return; }
  main.innerHTML = '<div class="grid">' + arr.map(({ r, idx }) => {
    const u = unitByRow.get(idx);
    const c = ATTR_COLOR[WIKI_ATTR_ID[r.attr] || 0];
    const imgSrc = u ? (u.icon || u.art || r.wimg) : r.wimg;
    const rst = u ? rareStr(u) : stars(r.rarity || 0);
    return \`<div class="card \${r.owned ? '' : 'notown'}" data-row="\${idx}">
      <div class="portrait" style="background:linear-gradient(150deg,\${c}55,\${c}18 60%,transparent),linear-gradient(160deg,#1b2145,#141830)">
        \${imgTag(imgSrc)}
        <div class="rstars">\${rst}</div>
        <div class="attrbadge" style="color:\${c}">\${r.attr || '?'}</div>
        \${!imgSrc ? esc((r.title || '?')[0]) : ''}
        <div class="badges">
          \${r.owned ? '<span class="tag">已持有</span>' : '<span class="tag" style="background:#555">未持有</span>'}
        </div>
        \${r.href ? \`<a class="wikilink" href="\${WIKI_BASE}\${r.href.replace(/&/g, '&amp;')}" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="在 Wiki 中查看">↗ Wiki</a>\` : ''}
      </div>
      <div class="cardbody">
        <div class="uname">\${esc(r.title || r.no)}</div>
        <div class="cname">\${esc(r.yomi || '')}</div>
        <div class="meta"><span class="role-chip">\${ROLE[r.typeId] || r.type || '?'}</span><span>\${r.camp || '?'}</span><span>\${esc(r.affil || '')}</span>\${r.releaseDate ? \`<span>\${r.releaseDate}</span>\` : ''}</div>
      </div>
    </div>\`;
  }).join('') + '</div>';
  main.querySelectorAll('.card').forEach((el) => {
    const u = unitByRow.get(+el.dataset.row);
    if (u) el.onclick = () => showModal(u.id);
  });
}

function showModal(id) {
  const u = units.find((x) => x.id === id);
  if (!u) return;
  const c = ATTR_COLOR[u.attr];
  const loveMax = u.max_love > 0 && u.love >= u.max_love;
  const row = (k, v) => \`<div><span class="k">\${k}</span> \${v ?? '<span class="k">-</span>'}</div>\`;
  // 白值面板 (当前练度白值 + 好感加成明细, Wiki 只有 Lv1 值)
  const statHtml = u.st ? \`<div class="section"><h3>白值（当前练度）</h3><div class="statgrid">
      <div class="stat"><span class="sv">\${u.st.hp.toLocaleString()}</span><span class="sk">HP\${u.loveB && u.loveB.hp ? \`<i>+\${u.loveB.hp} 好感</i>\` : ''}</span></div>
      <div class="stat"><span class="sv">\${u.st.atk.toLocaleString()}</span><span class="sk">ATK\${u.loveB && u.loveB.atk ? \`<i>+\${u.loveB.atk} 好感</i>\` : ''}</span></div>
      <div class="stat"><span class="sv">\${u.st.crit}</span><span class="sk">CRIT\${u.loveB && u.loveB.crit ? \`<i>+\${u.loveB.crit}</i>\` : ''}</span></div>
      <div class="stat"><span class="sv">\${u.st.initEx}<span class="k"> / \${u.st.maxEx}</span></span><span class="sk">开局 EX</span></div>
      <div class="stat"><span class="sv">\${u.st.exRate}</span><span class="sk">EX 上升</span></div>
      <div class="stat"><span class="sv">\${u.st.wtMin}~\${u.st.wtMax}</span><span class="sk">行动CT</span></div>
    </div></div>\` : '';
  // 技能区: EX1/EX2/ユニゾン/シスター技 + 升星解锁的固有被动 (含效果文本/EX消耗/等级/解锁条件)
  const skillTag = (s) => s.type === 2 ? '<span class="stag st-u">ユニゾン</span>' : s.type === 3 ? '<span class="stag st-s">シスター</span>' : \`<span class="stag st-ex">EX\${s._exn}</span>\`;
  const skillBlock = (s, tagHtml) => \`<div class="skill\${s.unlock ? '' : ' slock'}">
      <div class="sname">\${tagHtml} <b>\${esc(s.name || '固有被动')}</b>\${s.cost > 0 ? \`<span class="smeta">EX 消耗 \${s.cost}</span>\` : ''}\${s.max_lv ? \`<span class="smeta">Lv \${s.lv}/\${s.max_lv}</span>\` : ''}\${s.unlock ? '' : '<span class="slocktag">未解锁</span>'}</div>
      \${s.detail ? \`<div class="sdetail">\${esc(s.detail)}</div>\` : ''}
      \${s.cond && !s.unlock ? \`<div class="scond">解锁条件：\${esc(s.cond)}</div>\` : ''}
    </div>\`;
  let exN = 0;
  const skillsHtml = (u.skills || []).length ? \`<div class="section"><h3>技能</h3>\` +
    u.skills.map((s) => { if (s.type === 1) s._exn = ++exN; return skillBlock(s, skillTag(s)); }).join('') +
    (u.uniques || []).map((s) => skillBlock(s, '<span class="stag st-p">被动</span>')).join('') + \`</div>\` : '';
  // 弹窗结构: 同图模糊底 + 左侧信息(滚动) + 右侧立绘展示面板(等比完整显示)
  document.getElementById('modal').innerHTML = \`
    <div class="martbg">\${u.art ? \`<img src="\${u.art}" onerror="this.parentElement.remove()">\` : ''}</div>
    <button class="close" onclick="document.getElementById('overlay').classList.remove('show')">✕</button>
    <div class="mmain">
      <div><h2>\${esc(u.uname)}</h2><div class="sub2">\${esc(u.fname)} · <span style="color:var(--gold)">\${rareStr(u)}</span> · <span style="color:\${c};font-weight:700">\${ATTR[u.attr]}</span> · \${ROLE[u.role]}\${u.whref ? \` · <a class="wlink" href="\${WIKI_BASE}\${u.whref.replace(/&/g, '&amp;')}" target="_blank" rel="noopener">Wiki ↗</a>\` : ''}</div></div>
      <div class="grid2" style="margin-top:14px">
      \${row('战力', '<b style="color:var(--gold)">' + u.power.toLocaleString() + '</b>')}
      \${row('队伍HP', u.team_hp.toLocaleString())}
      \${row('等级', u.lv + ' / ' + u.max_lv + (u.lv >= u.max_lv ? ' <span style="color:var(--gold)">MAX</span>' : ''))}
      \${row('上限解放', u.limit + ' 次')}
      \${row('稀有度', rareStr(u) + (u.max_rarity ? ' <span class="k">/ 上限' + stars(u.max_rarity) + '</span>' : ''))}
      \${row('好感度', '<span style="color:var(--pink)">♥ ' + u.love + ' / ' + (u.max_love || '?') + (loveMax ? ' MAX' : '') + '</span>')}
      \${row('种族', esc(campStr(u)))}
      \${row('所属', esc(affilStr(u)))}
      \${row('卡牌编号', u.unit_id + ' (illust ' + u.illust + ')')}
    </div>
    \${skillsHtml}
      \${u.profile ? \`<div class="section"><h3>简介</h3><div class="profile">\${esc(u.profile)}</div></div>\` : ''}
    </div>
    <div class="mfig">
      <div class="figpanel" style="background:linear-gradient(150deg,\${c}40,\${c}12 60%,transparent),linear-gradient(160deg,#1b2145,#141830)">
        \${u.art ? \`<img src="\${u.art}" onerror="this.remove()">\` : (u.icon ? \`<img class="ficon" src="\${u.icon}" onerror="this.remove()">\` : \`<span style="font-size:72px;font-weight:800">\${esc(u.cname[0])}</span>\`)}
      </div>
      \${statHtml}
      <div class="section"><h3>档案</h3>
        <div class="grid2">
          \${row('全名', esc(u.fname))}\${row('生日', esc(u.birthday))}
          \${row('守护星', esc(u.star))}\${row('学年', u.year ? u.year + ' 年级' : '')}
          \${row('CV', esc(u.cv))}\${row('社团', esc(u.club || '-'))}
          \${row('委员/职务', esc(u.committee || '-'))}\${row('爱好', esc(u.hobby || '-'))}
        </div>
      </div>
    </div>
  \`;
  document.getElementById('overlay').classList.add('show');
}
document.getElementById('overlay').onclick = (e) => { if (e.target.id === 'overlay') e.target.classList.remove('show'); };
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.getElementById('overlay').classList.remove('show'); });

let deb;
document.getElementById('q').oninput = (e) => { clearTimeout(deb); deb = setTimeout(() => { state.q = e.target.value.trim(); render(); }, 120); };
document.getElementById('sortSel').onchange = (e) => { state.sort = e.target.value; render(); };
document.getElementById('viewSel').onchange = (e) => { state.view = e.target.value; render(); };
const dirBtn = document.getElementById('dirBtn');
dirBtn.onclick = () => { state.desc = !state.desc; dirBtn.textContent = state.desc ? '↑ 升序' : '↓ 降序'; render(); };

renderToolbar();
render();
</script>
</body>
</html>`;

const out = join(__dirname, 'index.html');
writeFileSync(out, html, 'utf8');
console.log(`OK -> ${out} (${(html.length / 1024).toFixed(1)} KB)`);
console.log(`卡牌 ${stats.total} 张 / 角色 ${stats.chars} 名 / 总战力 ${stats.totalPower.toLocaleString()} / ★5 ${stats.r5} / 满级 ${stats.maxLv} / 好感满 ${stats.maxLove}`);
console.log(`图鉴收集 ${stats.collected}/${stats.dexTotal} (Wiki 全角色, 含覚醒強化別枠)`);

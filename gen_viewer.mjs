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
// 装备图鉴数据 (fetch_equips.mjs 产物, 按名称精确匹配 dump equip_name)
let equipWikiRows = [];
try { equipWikiRows = JSON.parse(readFileSync(join(__dirname, 'equip_wiki.json'), 'utf8')).rows; } catch { /* equip_wiki.json 不存在 */ }
const EQ_PART = { 1: '武器', 2: '防具', 3: '装飾品' };
const EQ_PARAM = { 0: 'HP', 1: 'ATK', 2: 'EX上昇', 3: 'クリ', 4: 'EX', 5: '行動CT' };
const WIKI_ATTR_ID = { '炎': 1, '水': 2, '雷': 3, '光': 4, '闇': 5 };
const WIKI_ROLE_ID = { ATK: 1, SPD: 2, DEF: 3, SUP: 4, HEAL: 5, 'ヒール': 5 }; // HEAL=Wiki 现行记法, ヒール=旧记法兜底
const WIKI_CAMP_ID = { '人間': 1, '神族': 2, '魔族': 3 };

// 扫描本地图片: img/{unit_id}.png 为立绘, img/{unit_id}_icon.png 为 Wiki 头像, img/w{no}_icon.png 为未持有卡头像
let imgSet = new Set();
try { imgSet = new Set(readdirSync(join(__dirname, 'img'))); } catch { /* img 目录不存在 */ }
let eqImgSet = new Set();
try { eqImgSet = new Set(readdirSync(join(__dirname, 'img', 'equip'))); } catch { /* img/equip 目录不存在 */ }
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
const SP_TYPE = { 1: '魔法', 2: '斬撃', 3: '打撃' }; // sp_equip_types[0] = 攻撃タイプ (可装备武器类型)
const SP_TYPE_ID = { '魔法': 1, '斬撃': 2, '打撃': 3 }; // Wiki 一覧「攻撃タイプ」列文本 → ID
// 所属名称已全部经 Wiki 角色详情页「所属」栏核验 (3=守護天使, 7=コラプサー, 8=極星学園 等)
const AFFIL = { 0: '無所属', 1: '流星学園', 2: '新星学園', 3: '守護天使', 4: 'ネビュラ', 5: '流星附属', 7: 'コラプサー', 8: '極星学園' };

const cleanStyle = (s) => String(s ?? '').replace(/<style[^>]*>|<\/style>/g, '');
// full_name 的「東雲<style=p24>しののめ</style>」片段 → HTML <ruby> 注音 (style 标签内容即假名读法)
const rubyName = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/&lt;style=p\d+&gt;([\s\S]*?)&lt;\/style&gt;/g, '<rt>$1</rt>');

const units = raw.map((u) => ({
  id: u.u_unit_id,
  unit_id: u.unit_id,
  char_id: u.character_id,
  cname: u.character_name,
  uname: u.unit_name,
  fname: cleanStyle(u.full_name),
  fnameRuby: rubyName(u.full_name),
  rarity: u.rarity,
  max_rarity: u.max_rarity,
  attr: u.attr_type,
  role: u.role,
  spType: (u.sp_equip_types || [])[0] || 0,
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
  core: u.core_lv, maxCore: u.max_core_lv, // コア (核心) 等级, 与练度相关
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
  // skills[].ss* = specific_skill_* (EX2+ 强化版技能, dump 里挂原 EX 槽; 无强化槽为 access violation 占位, 置空)
  skills: (u.skill_data || []).map((s) => ({
    type: s.skill_data_type, name: s.skill_name, detail: s.skill_detail, lv: s.lv, max_lv: s.max_lv, cost: s.cost_ex_gauge, unlock: s.is_unlock, cond: s.unlock_condition,
    ssName: /^<error>/.test(String(s.specific_skill_name || '')) ? '' : (s.specific_skill_name || ''),
    ssDetail: /^<error>/.test(String(s.specific_skill_name || '')) ? '' : (s.specific_skill_detail || ''),
    ssCost: s.specific_skill_cost_ex_gauge || 0,
  })),
  uniques: (u.unique_skill_data || []).map((s) => ({ name: s.skill_name, detail: s.detail, unlock: s.is_unlock, cond: s.unlock_condition })),
  st: (u.status_data && u.status_data.base_data) ? { hp: +u.status_data.base_data.hp, atk: u.status_data.base_data.attack, crit: u.status_data.base_data.critical, initEx: u.status_data.base_data.init_ex_gauge, maxEx: u.status_data.base_data.max_ex_gauge, exRate: u.status_data.base_data.ex_gauge_rate, wtMin: u.status_data.base_data.min_wt, wtMax: u.status_data.base_data.max_wt } : null,
  equips: (u.equip_data || []).map((e) => ({
    part: e.equip_part, name: e.equip_name, rarity: e.rarity, lv: e.lv, max_lv: e.max_lv,
    lb: e.limit_break_count, max_lb: e.max_limit_break_count,
    params: (e.parameter_list || []).map((p) => ({ t: p.parameter_type, v: p.parameter_value })),
    skill: e.skill_data ? e.skill_data.skill_detail : '', skill_lv: e.skill_data ? e.skill_data.lv : null,
    enchTotal: (e.enchant_frame_list || []).length,
    enchOpen: (e.enchant_frame_list || []).filter((x) => x.is_enchant_release).length,
    icon: eqImgSet.has(`${e.equip_id}.png`) ? `img/equip/${e.equip_id}.png` : null,
  })),
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

// 合并装备 Wiki 数据 (名称精确匹配): アビリティ满强文本 / 入手方法 / 专武对应卡名
// 装备 Wiki 行按名称索引: 注册 name 与 nameAlt 两个 key (游戏内装飾品名含角色括号, Wiki 表名省略)
const eqWikiByName = new Map();
for (const r of equipWikiRows.filter((r) => r.owned)) {
  eqWikiByName.set(r.name, r);
  if (r.nameAlt) eqWikiByName.set(r.nameAlt, r);
}
for (const u of units) {
  for (const e of u.equips) {
    const w = eqWikiByName.get(e.name);
    if (!w) continue;
    e.wAbility = w.ability; e.wObtain = w.obtain; e.wNo = w.no || ''; e.charCard = w.charCard || '';
  }
  // 装备加成合计 (t0=HP t1=ATK t2=EX上昇 t3=クリ%×100 t4=EX蓄积), 附到白值面板; 并算 HP/ATK 总值 (基础+装备+好感) 供显示与排序
  const b = { hp: 0, atk: 0, crit: 0, exUp: 0, ex: 0 };
  for (const e of u.equips) for (const p of e.params) {
    if (p.t === 0) b.hp += p.v; else if (p.t === 1) b.atk += p.v; else if (p.t === 3) b.crit += p.v;
    else if (p.t === 2) b.exUp += p.v; else if (p.t === 4) b.ex += p.v;
  }
  b.crit = Math.round(b.crit) / 100;
  if (b.hp || b.atk || b.crit || b.exUp || b.ex) u.eqBonus = b;
  if (u.st) {
    const lb = u.loveB || {};
    u.hpTotal = u.st.hp + b.hp + (lb.hp || 0);
    u.atkTotal = u.st.atk + b.atk + (lb.atk || 0);
    u.exUpTotal = (u.st.exRate || 0) + b.exUp; // EX上升合计 (基础+装备)
  }
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

// Wiki 行类型/攻撃タイプ统一归一为数字 ID (前端筛选/显示共用, 与持有卡的 u.role/u.spType 同一套枚举)
for (const r of wikiRows) {
  r.typeId = WIKI_ROLE_ID[r.type] ?? 0;
  r.spId = SP_TYPE_ID[r.atkType] ?? 0;
}

// ---- シスター (sister_unit_list.json dump + sister_wiki.json 全图鉴) ----
let sisterRaw = [];
try { sisterRaw = JSON.parse(readFileSync(join(__dirname, 'sister_unit_list.json'), 'utf8')); } catch { /* 未 dump */ }
let sisterWiki = [];
try { sisterWiki = JSON.parse(readFileSync(join(__dirname, 'sister_wiki.json'), 'utf8')).rows; } catch { /* 未抓取 */ }
// next_lv_list[0] = 下一级预览 (含 <color=#16C97B> 差分高亮 rich text, 前端 colorize 还原)
const nextLv = (d) => (d && Array.isArray(d.next_lv_list) && d.next_lv_list[0]) ? { lv: d.next_lv_list[0].lv, detail: d.next_lv_list[0].skill_detail || '' } : null;
// 注意: シスター是独立单位类型, 图片一律用 Wiki 专属图 (sw{idx}_icon/sw{idx}), 不复用 unit 立绘 (sister_unit_id 与基础卡 unit_id 重号)
const sisters = sisterRaw.map((s) => ({
  id: s.u_sister_unit_id,
  sid: s.sister_unit_id,
  cname: s.character_name,
  kana: s.character_name_kana,
  attr: s.attr_type,
  role: s.role,
  camp: s.camp,
  lb: s.limit_break_count,
  support: s.support_skill_data ? { name: s.support_skill_data.skill_name, detail: s.support_skill_data.skill_detail, lv: s.support_skill_data.lv, max: s.support_skill_data.max_lv, next: nextLv(s.support_skill_data) } : null,
  active: s.active_skill_data ? { name: s.active_skill_data.skill_name, detail: s.active_skill_data.skill_detail, lv: s.active_skill_data.lv, max: s.active_skill_data.max_lv, next: nextLv(s.active_skill_data) } : null,
  extra: s.extra_support_skill_data && s.extra_support_skill_data.release_skill_data ? {
    flg: s.extra_support_skill_data.extra_support_skill_flg,
    released: s.extra_support_skill_data.is_release,
    name: s.extra_support_skill_data.release_skill_data.skill_name,
    detail: s.extra_support_skill_data.release_skill_data.skill_detail,
  } : null,
}));
// Wiki 行合并到持有 sister (character_name 与 Wiki「名称」精确匹配, fetch_sisters.mjs 已标注 owned/ownedSister)
const sisterByName = new Map(sisters.map((s) => [s.cname, s]));
const sisterRows = sisterWiki.map((r, idx) => {
  const o = sisterByName.get(r.name) || null;
  if (o) o.wiki = { cond: r.cond, target: r.target, gauge: r.gauge, obtain: r.obtain, date: r.date, team: r.team, wimg: r.wimg || null, wart: r.wart || null };
  return {
    idx, name: r.name, attr: WIKI_ATTR_ID[r.attr] || 0, typeId: WIKI_ROLE_ID[r.type] || 0,
    team: r.team, cond: r.cond, target: r.target, effect: r.effect, gauge: r.gauge, obtain: r.obtain, date: r.date,
    href: r.href || null, // Wiki 页面路径 (URL 编码, 拼在 https://twinklestarknights.wikiru.jp/? 后)
    wimg: r.wimg || null, wart: r.wart || null, owned: !!o, sid: o ? o.sid : null,
  };
});
// Wiki 未收录的持有 sister 兜底追加 (仅 dump 数据, 无 Wiki 专属图)
for (const s of sisters) {
  if (sisterRows.some((r) => r.sid === s.sid)) continue;
  sisterRows.push({ idx: sisterRows.length, name: s.cname, attr: s.attr, typeId: s.role, team: '', cond: '', target: '', effect: '', gauge: '', obtain: '', date: '', href: null, wimg: null, wart: null, owned: true, sid: s.sid });
}
stats.sisterOwned = sisters.length;
stats.sisterTotal = sisterRows.length;

const payload = JSON.stringify({ units, stats, wikiRows, sisters, sisterRows, ATTR, ATTR_COLOR, ROLE, CAMP, AFFIL, WIKI_ATTR_ID, WIKI_CAMP_ID, EQ_PART, EQ_PARAM, SP_TYPE })
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
  .rowbreak { flex-basis: 100%; height: 0; }
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
  .mmain { flex: 1; min-width: 0; position: relative; z-index: 1; overflow-y: auto; padding-right: 4px; overscroll-behavior: contain; }
  /* 弹窗滚动条: 细条/透明轨道/悬停点亮 */
  .mmain, .mfig { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.14) transparent; }
  .mmain::-webkit-scrollbar, .mfig::-webkit-scrollbar { width: 6px; }
  .mmain::-webkit-scrollbar-track, .mfig::-webkit-scrollbar-track { background: transparent; }
  .mmain::-webkit-scrollbar-thumb, .mfig::-webkit-scrollbar-thumb { background: rgba(255,255,255,.14); border-radius: 3px; }
  .mmain:hover::-webkit-scrollbar-thumb, .mfig:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,.22); }
  .mmain::-webkit-scrollbar-thumb:hover, .mfig::-webkit-scrollbar-thumb:hover { background: rgba(255,217,106,.5); }
  .mfig { flex: none; width: 252px; position: relative; z-index: 1; display: flex; flex-direction: column; gap: 10px; max-height: 100%; overflow-y: auto; padding-right: 2px; overscroll-behavior: contain; }
  .figpanel { height: clamp(200px, 32vh, 330px); flex: none; border-radius: 14px; border: 1px solid var(--line);
    display: flex; align-items: center; justify-content: center; overflow: hidden; }
  /* 右栏内的白值/档案紧凑单列版 */
  .mfig .section { margin-top: 2px; }
  .mfig .statgrid { grid-template-columns: 1fr; gap: 6px; }
  .mfig .stat { flex-direction: row; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 2px 8px; padding: 7px 10px; }
  .mfig .stat .sv { font-size: 16px; }
  .mfig .grid2 { grid-template-columns: 1fr; font-size: 12.5px; gap: 5px; }
  /* 装备区 */
  .eq { display: flex; gap: 10px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 10px; background: rgba(255,255,255,.02); }
  .eq .eico { width: 38px; height: 38px; flex: none; border-radius: 8px; background: #0d1126; border: 1px solid var(--line); display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--dim); overflow: hidden; }
  .eq .eico img { width: 100%; height: 100%; object-fit: cover; }
  .eq .eqi { flex: 1; min-width: 0; }
  .eq .eqn { font-weight: 700; font-size: 13.5px; }
  .eq .epart { font-size: 10.5px; color: var(--dim); border: 1px solid var(--line); border-radius: 5px; padding: 1px 6px; margin-right: 6px; vertical-align: 1px; }
  .eq .starr { color: #ffd94a; letter-spacing: -1px; }
  .eq .eqm { font-size: 12px; color: var(--dim); margin: 3px 0 4px; }
  .eq .eqp { display: flex; flex-wrap: wrap; gap: 4px; }
  .eq .eqp span { font-size: 11.5px; padding: 2px 7px; border-radius: 6px; background: rgba(255,255,255,.06); border: 1px solid var(--line); }
  .eq .eqs { font-size: 12px; color: var(--dim); margin-top: 4px; line-height: 1.55; }
  .eq .eqs b { color: var(--fg); font-size: 11px; border-radius: 4px; padding: 0 4px; margin-right: 4px; background: rgba(255,255,255,.08); }
  .figpanel img { max-width: 92%; max-height: 92%; object-fit: contain; filter: drop-shadow(0 8px 18px rgba(0,0,0,.55)); }
  .figpanel .ficon { width: 100%; height: 100%; object-fit: cover; }
  .modal .close { position: absolute; top: 12px; right: 16px; font-size: 22px; color: var(--dim); cursor: pointer; background: none; border: none; z-index: 2; }
  .modal h2 { font-size: 20px; }
  .mmain .sub2 { color: var(--dim); font-size: 13px; margin: 2px 0 14px; }
  .mmain ruby rt { color: var(--dim); font-size: 10px; } /* 姓名注音 (ルビ): 汉字上假名下 */
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
  .st-ex2 { background: rgba(255,157,74,.18); color: #ffb066; border: 1px solid #ffb06644; } /* EX2+ 强化技 */
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
  <div class="chips" id="spChips"></div>
  <div class="chips" id="ownChips" style="display:none"></div>
  <select id="viewSel">
    <option value="card">视图：卡牌</option>
    <option value="table">视图：表格</option>
    <option value="char">视图：按角色</option>
    <option value="dex">视图：全图鉴</option>
    <option value="sister">视图：シスター</option>
  </select>
  <span class="count" id="count"></span>
  <div class="rowbreak"></div>
  <select id="sortSel">
    <option value="power">排序：战力</option>
    <option value="atk">排序：ATK（含装备）</option>
    <option value="exup">排序：EX 上升（含装备）</option>
    <option value="exupbase">排序：基础 EX 上升</option>
    <option value="lv">排序：等级</option>
    <option value="love">排序：好感度</option>
    <option value="rarity">排序：稀有度</option>
    <option value="uid">排序：编号</option>
    <option value="date">排序：实装日期</option>
  </select>
  <button id="dirBtn" class="chip" style="font-family:inherit" title="切换排序方向">↓ 降序</button>
</div>
<main id="main"></main>

<div class="overlay" id="overlay"><div class="modal" id="modal"></div></div>

<script>
const DATA = ${payload};
const WIKI_BASE = 'https://twinklestarknights.wikiru.jp/?';
const { units, stats, wikiRows, sisters, sisterRows, ATTR, ATTR_COLOR, ROLE, CAMP, AFFIL, WIKI_ATTR_ID, WIKI_CAMP_ID, EQ_PART, EQ_PARAM, SP_TYPE } = DATA;
const sisterById = new Map(sisters.map((s) => [s.sid, s]));
const state = { q: '', attr: 0, role: 0, rar: 0, camp: 0, sp: 0, own: 0, sort: 'power', desc: false, view: 'card' };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// dump rich text 还原: 先转义, 再把 color 标签 (esc 后为 &lt;color=...&gt;) 还原为彩色 span, 换行转 br
// 注意: 本函数位于 HTML 模板字符串内, 正则里的反斜杠在 .mjs 源码中必须双写
const colorize = (s) => esc(s)
  .replace(/&lt;color=(#[0-9A-Fa-f]{6})&gt;/g, '<span style="color:$1">')
  .replace(/&lt;\\/color&gt;/g, '</span>')
  .replace(/\\n/g, '<br>');
const stars = (n) => '★'.repeat(n);
// 千分比原始值 → 百分比文本 (300 -> '3', 1195 -> '11.95')
const pct = (v) => { const x = (v || 0) / 100; return Number.isInteger(x) ? String(x) : String(+x.toFixed(2)); };
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
  chipRow('spChips', [[0, '攻撃'], ...Object.entries(SP_TYPE).map(([k, v]) => [+k, v])], 'sp');
  chipRow('ownChips', [[0, '持有'], [1, '已持有'], [2, '未持有']], 'own');
}

function filtered() {
  const q = state.q.toLowerCase();
  let arr = units.filter((u) =>
    (!q || (u.cname + u.uname + u.fname + u.cv).toLowerCase().includes(q)) &&
    (!state.attr || u.attr === state.attr) &&
    (!state.role || u.role === state.role) &&
    (!state.sp || u.spType === state.sp) &&
    (!state.rar || u.rarity === state.rar) &&
    (!state.camp || u.camps.includes(state.camp)));
  const cmp = {
    power: (a, b) => b.power - a.power,
    atk: (a, b) => (b.atkTotal || 0) - (a.atkTotal || 0) || b.power - a.power,
    exup: (a, b) => (b.exUpTotal || 0) - (a.exUpTotal || 0) || b.power - a.power,
    exupbase: (a, b) => ((b.st && b.st.exRate) || 0) - ((a.st && a.st.exRate) || 0) || b.power - a.power,
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
        \${u.core > 0 ? \`<span class="tag">コア\${u.core}</span>\` : ''}
        \${loveMax ? '<span class="tag lovemax">♥MAX</span>' : ''}
        \${u.bond ? '<span class="tag">绊</span>' : ''}
      </div>
    </div>
    <div class="cardbody">
      <div class="uname">\${esc(u.uname)}</div>
      <div class="cname">\${esc(u.cname)}</div>
      <div class="nums"><span>Lv \${u.lv}<span style="color:var(--dim)">/\${u.max_lv}</span></span><span class="heart">♥ \${u.love}</span><span><b>\${u.power.toLocaleString()}</b></span></div>
      <div class="meta"><span class="role-chip" style="color:\${{1:'#ff8a7a',2:'#7ae0ff',3:'#8fa0ff',4:'#c39bff',5:'#ff9ec4'}[u.role]}">\${ROLE[u.role]}</span>\${SP_TYPE[u.spType] ? \`<span>\${SP_TYPE[u.spType]}</span>\` : ''}<span>\${esc(campStr(u))}</span><span>\${esc(affilStr(u))}</span></div>
    </div>
  </div>\`;
}

function render() {
  const isSis = state.view === 'sister';
  document.getElementById('ownChips').style.display = (state.view === 'dex' || isSis) ? '' : 'none';
  // シスター视图: 无稀有度/种族/攻撃タイプ概念, 隐藏对应筛选组
  document.getElementById('rarChips').style.display = isSis ? 'none' : '';
  document.getElementById('campChips').style.display = isSis ? 'none' : '';
  document.getElementById('spChips').style.display = isSis ? 'none' : '';
  if (isSis) { renderSister(); return; }
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
      <td class="role-chip">\${ROLE[u.role]}</td><td>\${SP_TYPE[u.spType] || ''}</td><td>\${esc(campStr(u))}</td><td>\${esc(affilStr(u))}</td>
      <td>\${u.lv}/\${u.max_lv}\${u.lv >= u.max_lv ? ' <span style="color:var(--gold)">MAX</span>' : ''}</td>
      <td style="color:var(--pink)">\${u.love}</td>
      <td><b>\${u.power.toLocaleString()}</b></td>
      <td>\${u.limit || '-'}</td><td>\${esc(u.birthday)}</td><td>\${esc(u.cv)}</td>
    </tr>\`).join('');
    main.innerHTML = \`<div class="tdwrap"><table><thead><tr>
      <th></th><th>★</th><th>属性</th><th>角色</th><th>卡名</th><th>类型</th><th>攻撃</th><th>种族</th><th>所属</th><th>Lv</th><th>♥</th><th>战力</th><th>解放</th><th>生日</th><th>CV</th>
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
    (!state.sp || r.spId === state.sp) &&
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
        <div class="meta"><span class="role-chip">\${ROLE[r.typeId] || r.type || '?'}</span>\${SP_TYPE[r.spId] ? \`<span>\${SP_TYPE[r.spId]}</span>\` : ''}<span>\${r.camp || '?'}</span><span>\${esc(r.affil || '')}</span>\${r.releaseDate ? \`<span>\${r.releaseDate}</span>\` : ''}</div>
      </div>
    </div>\`;
  }).join('') + '</div>';
  main.querySelectorAll('.card').forEach((el) => {
    const u = unitByRow.get(+el.dataset.row);
    if (u) el.onclick = () => showModal(u.id);
  });
}

// シスター视图: Wiki 全 71 名 (未持有置灰), 全部可点开详情 (未持有显示 Wiki 满级参考)
function renderSister() {
  const main = document.getElementById('main');
  const q = state.q.toLowerCase();
  const arr = sisterRows.filter((r) =>
    (!q || r.name.toLowerCase().includes(q)) &&
    (!state.attr || r.attr === state.attr) &&
    (!state.role || r.typeId === state.role) &&
    (!state.own || (state.own === 1 ? r.owned : !r.owned)));
  if (state.sort === 'date') arr.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.idx - b.idx); // 其余排序值均按图鉴顺
  if (state.desc) arr.reverse();
  const ownCnt = arr.filter((x) => x.owned).length;
  document.getElementById('count').textContent = \`共 \${arr.length} 名（持有 \${ownCnt} / 未持有 \${arr.length - ownCnt}）\`;
  if (!arr.length) { main.innerHTML = '<div class="empty">没有符合筛选条件的シスター</div>'; return; }
  main.innerHTML = '<div class="grid">' + arr.map((r) => {
    const s = r.sid != null ? sisterById.get(r.sid) : null;
    const c = ATTR_COLOR[r.attr] || '#8890b8';
    const imgSrc = r.wimg; // 一律 Wiki シスター专属图标 (Q 版), 不复用 unit 图
    return \`<div class="card \${r.owned ? '' : 'notown'}" data-idx="\${r.idx}"\${r.owned ? '' : ' style="cursor:pointer"'}>
      <div class="portrait" style="background:linear-gradient(150deg,\${c}55,\${c}18 60%,transparent),linear-gradient(160deg,#1b2145,#141830)">
        \${imgTag(imgSrc)}
        <div class="attrbadge" style="color:\${c}">\${ATTR[r.attr] || '?'}</div>
        \${!imgSrc ? esc(r.name[0]) : ''}
        <div class="badges">
          \${r.owned ? (s && s.lb > 0 ? \`<span class="tag">突破\${s.lb}</span>\` : '<span class="tag">已持有</span>') : '<span class="tag" style="background:#555">未持有</span>'}
        </div>
      </div>
      <div class="cardbody">
        <div class="uname">\${esc(r.name)}</div>
        <div class="meta"><span class="role-chip">\${ROLE[r.typeId] || '?'}</span>\${r.gauge ? \`<span>ゲージ \${esc(r.gauge)}</span>\` : ''}\${r.date ? \`<span>\${esc(r.date)}</span>\` : ''}</div>
      </div>
    </div>\`;
  }).join('') + '</div>';
  main.querySelectorAll('.card').forEach((el) => {
    el.onclick = () => showSister(+el.dataset.idx);
  });
}

// シスター详情弹窗 (持有+未持有): 持有=dump 当前练度技能 + Wiki 参考; 未持有=Wiki 满级效果参考; 标题区均带 Wiki 页面链接
function showSister(rowIdx) {
  const r = sisterRows[rowIdx];
  if (!r) return;
  const s = r.sid != null ? sisterById.get(r.sid) : null;
  const c = ATTR_COLOR[r.attr] || '#8890b8';
  const row = (k, v) => \`<div><span class="k">\${k}</span> \${v ?? '<span class="k">-</span>'}</div>\`;
  const wikiUrl = r.href ? \`\${WIKI_BASE}\${r.href.replace(/&/g, '&amp;')}\` : null;
  const nextStr = (n) => (n ? \`<div class="sdetail" style="color:#9aa3c7">→ Lv\${n.lv}: \${colorize(n.detail)}</div>\` : '');
  const sisSkill = (tag, name, lv, max, detail, next, extraHtml = '', lock = false) => \`<div class="skill\${lock ? ' slock' : ''}">
      <div class="sname">\${tag} <b>\${esc(name)}</b>\${lv ? \`<span class="smeta">Lv \${lv}/\${max}</span>\` : ''}\${lock ? '<span class="slocktag">未解放</span>' : ''}</div>
      \${detail ? \`<div class="sdetail">\${colorize(detail)}</div>\` : ''}
      \${nextStr(next)}
      \${extraHtml}
    </div>\`;
  const condHtml = r.cond ? \`<div class="scond">発動条件：\${esc(r.cond)}\${r.target ? \` ／ 対象：\${esc(r.target)}\` : ''}</div>\` : '';
  const teamHtml = r.team ? sisSkill('<span class="stag st-s">参考</span>', 'チームスキル（满级）', null, null, r.team, null) : '';
  const skillsHtml = s ? \`<div class="section"><h3>技能</h3>
    \${s.support ? sisSkill('<span class="stag st-ex">支援</span>', s.support.name, s.support.lv, s.support.max, s.support.detail, s.support.next) : ''}
    \${s.active ? sisSkill('<span class="stag st-u">アクティブ</span>', s.active.name, s.active.lv, s.active.max, s.active.detail, s.active.next, condHtml) : ''}
    \${s.extra && s.extra.name ? sisSkill('<span class="stag st-p">解放</span>', s.extra.name, null, null, s.extra.detail, null, '', !s.extra.released) : ''}
    \${teamHtml}
  </div>\` : \`<div class="section"><h3>技能 <span class="k">（未持有 · Wiki 满级参考）</span></h3>
    \${r.effect ? sisSkill('<span class="stag st-u">アクティブ</span>', 'アクティブスキル', null, null, r.effect, null, condHtml) : ''}
    \${teamHtml}
  </div>\`;
  const sisArt = r.wart || r.wimg; // Wiki シスター专属立绘 (Q 版 SD), 无立绘时退回图标
  document.getElementById('modal').innerHTML = \`
    <div class="martbg">\${sisArt ? \`<img src="\${sisArt}" onerror="this.parentElement.remove()">\` : ''}</div>
    <button class="close" onclick="closeOverlay()">✕</button>
    <div class="mmain">
      <div><h2>\${esc(r.name)}\${s ? '' : ' <span class="slocktag" style="margin-left:8px">未持有</span>'}</h2><div class="sub2"><span style="color:var(--gold)">シスター</span> · <span style="color:\${c};font-weight:700">\${ATTR[r.attr] || '?'}</span> · \${ROLE[r.typeId] || '?'}\${s && s.camp ? ' · ' + CAMP[s.camp] : ''}\${r.date ? ' · 実装 ' + esc(r.date) : ''}\${wikiUrl ? \` · <a class="wlink" href="\${wikiUrl}" target="_blank" rel="noopener">Wiki ↗</a>\` : ''}</div></div>
      <div class="grid2" style="margin-top:14px">
        \${s ? row('限界突破', s.lb + ' 次') : row('Wiki 図鑑番号', 'No.' + (r.idx + 1))}
        \${r.gauge ? row('ゲージ速度', esc(r.gauge)) : ''}
        \${r.obtain ? row('入手方法', esc(r.obtain)) : ''}
        \${s ? row('シスター番号', s.sid) : ''}
      </div>
      \${skillsHtml}
    </div>
    <div class="mfig">
      <div class="figpanel" style="background:linear-gradient(150deg,\${c}40,\${c}12 60%,transparent),linear-gradient(160deg,#1b2145,#141830)">
        \${sisArt ? \`<img src="\${sisArt}" onerror="this.remove()">\` : \`<span style="font-size:72px;font-weight:800">\${esc(r.name[0])}</span>\`}
      </div>
    </div>
  \`;
  openOverlay();
}

function showModal(id) {
  const u = units.find((x) => x.id === id);
  if (!u) return;
  const c = ATTR_COLOR[u.attr];
  const loveMax = u.max_love > 0 && u.love >= u.max_love;
  const row = (k, v) => \`<div><span class="k">\${k}</span> \${v ?? '<span class="k">-</span>'}</div>\`;
  // 白值面板 (当前练度白值 + 好感加成明细, Wiki 只有 Lv1 值)
  const statHtml = u.st ? \`<div class="section"><h3>白值（当前练度）</h3><div class="statgrid">
      <div class="stat"><span class="sv">\${(u.hpTotal || u.st.hp).toLocaleString()}</span><span class="sk">HP\${(u.eqBonus && u.eqBonus.hp) || (u.loveB && u.loveB.hp) ? \`<i>合计(基础 \${u.st.hp.toLocaleString()}\${u.eqBonus && u.eqBonus.hp ? \` + 装备 \${u.eqBonus.hp}\` : ''}\${u.loveB && u.loveB.hp ? \` + 好感 \${u.loveB.hp}\` : ''})</i>\` : ''}</span></div>
      <div class="stat"><span class="sv">\${(u.atkTotal || u.st.atk).toLocaleString()}</span><span class="sk">ATK\${(u.eqBonus && u.eqBonus.atk) || (u.loveB && u.loveB.atk) ? \`<i>合计(基础 \${u.st.atk.toLocaleString()}\${u.eqBonus && u.eqBonus.atk ? \` + 装备 \${u.eqBonus.atk}\` : ''}\${u.loveB && u.loveB.atk ? \` + 好感 \${u.loveB.atk}\` : ''})</i>\` : ''}</span></div>
      <div class="stat"><span class="sv">\${pct((u.st.crit || 0) + (u.eqBonus ? u.eqBonus.crit * 100 : 0) + ((u.loveB && u.loveB.crit) || 0))}%</span><span class="sk">CRIT\${(u.eqBonus && u.eqBonus.crit) || (u.loveB && u.loveB.crit) ? \`<i>合计(基础 \${pct(u.st.crit)}%\${u.eqBonus && u.eqBonus.crit ? \` + 装备 \${pct(u.eqBonus.crit * 100)}%\` : ''}\${u.loveB && u.loveB.crit ? \` + 好感 \${pct(u.loveB.crit)}%\` : ''})</i>\` : ''}</span></div>
      <div class="stat"><span class="sv">\${u.st.initEx + (u.eqBonus ? u.eqBonus.ex : 0)}</span><span class="sk">EX\${u.eqBonus && u.eqBonus.ex ? \`<i>合计(基础 \${u.st.initEx} + 装备 \${u.eqBonus.ex})</i>\` : ''}</span></div>
      <div class="stat"><span class="sv">\${u.st.exRate + (u.eqBonus ? u.eqBonus.exUp : 0)}</span><span class="sk">EX 上升\${u.eqBonus && u.eqBonus.exUp ? \`<i>合计(基础 \${u.st.exRate} + 装备 \${u.eqBonus.exUp})</i>\` : ''}</span></div>
      <div class="stat"><span class="sv">\${u.st.wtMin}~\${u.st.wtMax}</span><span class="sk">行动CT</span></div>
    </div></div>\` : '';
  // 装备参数: 当前练度参数 chips + Wiki 满强アビリティ
  const paramStr = (p) => EQ_PARAM[p.t] === undefined ? p.t + ':' + p.v : \`\${EQ_PARAM[p.t]}\${p.t === 3 ? (p.v / 100).toFixed(2) + '%' : '+' + p.v.toLocaleString()}\`;
  // 装备区: 每卡 3 部位 (dump 里 equip_data 顺序随机, 渲染前按 武器→防具→装飾品 固定排序)
  const eqHtml = (u.equips || []).length ? \`<div class="section"><h3>装备</h3><div style="display:flex;flex-direction:column;gap:8px">
    \${[...u.equips].sort((a, b) => a.part - b.part).map((e) => \`<div class="eq">
      <div class="eico">\${e.icon ? \`<img src="\${e.icon}" loading="lazy" onerror="this.style.visibility='hidden'">\` : \`<span>\${(e.name || '?')[0]}</span>\`}</div>
      <div class="eqi">
        <div class="eqn"><span class="epart">\${EQ_PART[e.part] || e.part}</span><span class="starr">\${'★'.repeat(e.rarity || 1)}</span> \${esc(e.name)}</div>
        <div class="eqm">Lv \${e.lv}/\${e.max_lv}\${e.max_lb ? \` · 突破 \${e.lb}/\${e.max_lb}\` : ''}\${e.enchTotal ? \` · 附魔 \${e.enchOpen}/\${e.enchTotal}\` : ''}\${e.wObtain ? \` · \${esc(e.wObtain)}\` : ''}</div>
        <div class="eqp">\${(e.params || []).map((p) => \`<span>\${paramStr(p)}</span>\`).join('')}</div>
        \${e.skill ? \`<div class="eqs"><b>アビリティ</b> \${esc(e.skill)}\${e.skill_lv ? \` <span class="k">Lv\${e.skill_lv}</span>\` : ''}</div>\` : ''}
        \${e.wAbility && e.wAbility !== e.skill ? \`<div class="eqs"><b>初期(最大)</b> \${esc(e.wAbility)}</div>\` : ''}
      </div>
    </div>\`).join('')}
  </div></div>\` : '';
  // 技能区: EX1/EX2/ユニゾン/シスター技 + EX2+ (specific_skill, 挂原 EX 槽下方) + 升星解锁的固有被动
  const skillTag = (s) => s.type === 2 ? '<span class="stag st-u">ユニゾン</span>' : s.type === 3 ? '<span class="stag st-s">シスター</span>' : \`<span class="stag st-ex">EX\${s._exn}</span>\`;
  const skillBlock = (s, tagHtml) => \`<div class="skill\${s.unlock ? '' : ' slock'}">
      <div class="sname">\${tagHtml} <b>\${esc(s.name || '固有被动')}</b>\${s.cost > 0 ? \`<span class="smeta">EX 消耗 \${s.cost}</span>\` : ''}\${s.max_lv ? \`<span class="smeta">Lv \${s.lv}/\${s.max_lv}</span>\` : ''}\${s.unlock ? '' : '<span class="slocktag">未解锁</span>'}</div>
      \${s.detail ? \`<div class="sdetail">\${esc(s.detail)}</div>\` : ''}
      \${s.ssName ? \`<div class="sname" style="margin-top:7px"><span class="stag st-ex2">EX\${s._exn || 1}+</span> <b>\${esc(s.ssName)}</b>\${s.ssCost > 0 ? \`<span class="smeta">EX 消耗 \${s.ssCost}</span>\` : ''}</div><div class="sdetail">\${esc(s.ssDetail)}</div>\` : ''}
      \${s.cond && !s.unlock ? \`<div class="scond">解锁条件：\${esc(s.cond)}</div>\` : ''}
    </div>\`;
  let exN = 0;
  const skillsHtml = (u.skills || []).length ? \`<div class="section"><h3>技能</h3>\` +
    u.skills.map((s) => { if (s.type === 1) s._exn = ++exN; return skillBlock(s, skillTag(s)); }).join('') +
    (u.uniques || []).map((s) => skillBlock(s, '<span class="stag st-p">被动</span>')).join('') + \`</div>\` : '';
  // 弹窗结构: 同图模糊底 + 左侧信息(滚动) + 右侧立绘展示面板(等比完整显示)
  document.getElementById('modal').innerHTML = \`
    <div class="martbg">\${u.art ? \`<img src="\${u.art}" onerror="this.parentElement.remove()">\` : ''}</div>
    <button class="close" onclick="closeOverlay()">✕</button>
    <div class="mmain">
      <div><h2>\${esc(u.uname)}</h2><div class="sub2"><ruby>\${u.fnameRuby}</ruby> · <span style="color:var(--gold)">\${rareStr(u)}</span> · <span style="color:\${c};font-weight:700">\${ATTR[u.attr]}</span> · \${ROLE[u.role]}\${u.spType && SP_TYPE[u.spType] ? \` · \${SP_TYPE[u.spType]}\` : ''}\${u.whref ? \` · <a class="wlink" href="\${WIKI_BASE}\${u.whref.replace(/&/g, '&amp;')}" target="_blank" rel="noopener">Wiki ↗</a>\` : ''}</div></div>
      <div class="grid2" style="margin-top:14px">
      \${row('战力', '<b style="color:var(--gold)">' + u.power.toLocaleString() + '</b>')}
      \${row('队伍HP', u.team_hp.toLocaleString())}
      \${row('等级', u.lv + ' / ' + u.max_lv + (u.lv >= u.max_lv ? ' <span style="color:var(--gold)">MAX</span>' : ''))}
      \${row('上限解放', u.limit + ' 次')}
      \${u.maxCore ? row('コア', u.core + '/' + u.maxCore) : ''}
      \${row('稀有度', rareStr(u) + (u.max_rarity ? ' <span class="k">/ 上限' + stars(u.max_rarity) + '</span>' : ''))}
      \${row('好感度', '<span style="color:var(--pink)">♥ ' + u.love + ' / ' + (u.max_love || '?') + (loveMax ? ' MAX' : '') + '</span>')}
      \${row('种族', esc(campStr(u)))}
      \${row('所属', esc(affilStr(u)))}
      \${row('卡牌编号', u.unit_id + ' (illust ' + u.illust + ')')}
    </div>
    \${eqHtml}
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
          \${row('全名', '<ruby>' + u.fnameRuby + '</ruby>')}\${row('生日', esc(u.birthday))}
          \${row('守护星', esc(u.star))}\${row('学年', u.year ? u.year + ' 年级' : '')}
          \${row('CV', esc(u.cv))}\${row('社团', esc(u.club || '-'))}
          \${row('委员/职务', esc(u.committee || '-'))}\${row('爱好', esc(u.hobby || '-'))}
        </div>
      </div>
    </div>
  \`;
  openOverlay();
}
document.getElementById('overlay').onclick = (e) => { if (e.target.id === 'overlay') closeOverlay(); };
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOverlay(); });

// 弹窗开关: 联动 history (手机端系统返回手势/返回键优先关弹窗, 不退出页面) + 锁定背景滚动 (iOS 用 position:fixed 方案)
let lockedScrollY = 0;
function openOverlay() {
  const ov = document.getElementById('overlay');
  if (ov.classList.contains('show')) return;
  history.pushState({ modal: 1 }, '');
  ov.classList.add('show');
  lockedScrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = \`-\${lockedScrollY}px\`;
  document.body.style.width = '100%';
}
function unlockBg() {
  if (document.body.style.position !== 'fixed') return;
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  window.scrollTo(0, lockedScrollY);
}
function closeOverlay() {
  const ov = document.getElementById('overlay');
  const wasOpen = ov.classList.contains('show');
  ov.classList.remove('show');
  unlockBg();
  // ✕/遮罩/Esc 关闭时清理 pushState 的历史项 (会触发 popstate, 那时弹窗已关, 监听器空转)
  if (wasOpen && history.state && history.state.modal) history.back();
}
// 系统返回手势/返回键: 弹窗开着则拦截为关弹窗
window.addEventListener('popstate', () => {
  const ov = document.getElementById('overlay');
  if (ov.classList.contains('show')) { ov.classList.remove('show'); unlockBg(); }
});

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

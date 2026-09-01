// 临时探查: skill_data[].specific_skill_* (EX2+) 结构与分布
import { readFileSync } from 'node:fs';
const raw = JSON.parse(readFileSync('unit_list.json', 'utf8'));
const TYPE_NAME = { 1: 'EX1', 2: 'EX2', 3: 'ユニゾン' };
const err = (s) => /^<error>/.test(String(s || ''));
const dist = {}; let named = 0, unlocked = 0;
const samples = [];
for (const u of raw) {
  for (const s of (u.skill_data || [])) {
    const nm = s.specific_skill_name;
    if (!nm) continue;
    if (err(nm)) { dist['(error)'] = (dist['(error)'] || 0) + 1; continue; }
    named++;
    const key = TYPE_NAME[s.skill_data_type] || s.skill_data_type;
    dist[key] = (dist[key] || 0) + 1;
    if (s.is_unlock) unlocked++;
    if (samples.length < 5) samples.push({ id: u.u_unit_id, card: u.unit_name, type: key, slotName: s.skill_name, ssName: nm, unlock: s.is_unlock, cond: s.unlock_condition, lv: s.lv, cost: s.specific_skill_cost_ex_gauge });
  }
}
console.log('分布:', JSON.stringify(dist), '\n有 EX2+ 的技能数:', named, '| 已解锁:', unlocked);
console.log(JSON.stringify(samples, null, 1));

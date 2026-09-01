// 临时脚本: 从専武角色详情页找缺图装备的 icon
import { readFileSync } from 'node:fs';
const H = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', 'Accept-Language': 'ja' };
const rows = JSON.parse(readFileSync('wiki_data.json', 'utf8')).rows;
const dec = (u) => {
  const parts = u.replace(/^attach2\//, '').replace(/\.png$/i, '').split('_');
  return parts.map((p) => /^[0-9A-Fa-f]+$/.test(p) && p.length % 2 === 0 ? Buffer.from(p, 'hex').toString('utf8') : p).join('_');
};
for (const uid of ['1086001', '1125001']) {
  const r = rows.find((x) => String(x.ownedUnit) === uid);
  console.log(uid, '→', r ? r.title : '?', '| href:', r ? r.href : '?');
  if (!r || !r.href) continue;
  const html = await (await fetch('https://twinklestarknights.wikiru.jp/' + r.href, { headers: H })).text();
  const links = [...html.matchAll(/data-src="(attach2\/[^"]+)"/g)].map((x) => x[1]).filter((u) => /^attach2\/696D67_6571756970/i.test(u));
  console.log('  equip icons found:', links.length);
  for (const l of links) console.log('   ', l.slice(0, 48) + '… →', dec(l));
  await new Promise((res) => setTimeout(res, 400));
}

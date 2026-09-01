// 临时试验: 寻找 Wiki 未收录装备的 attach2 图片源
const H = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', 'Accept-Language': 'ja' };
const BASE = 'https://twinklestarknights.wikiru.jp/';
const NAME = '星鍵リベレーション';

const probe = async (u) => {
  const r = await fetch(u, { headers: H });
  const t = await r.text();
  return { u, s: r.status, len: t.length, ct: r.headers.get('content-type') || '', t };
};

// 1. 站内搜索页
const q = encodeURIComponent(NAME);
for (const path of [`?cmd=search&word=${q}&type=AND`, `?plugin=search&q=${q}`, `?plugin=attach&pcmd=list`, `?plugin=attach2&pcmd=list`]) {
  try {
    const { s, len, ct, t } = await probe(BASE + path);
    console.log(`[${s}] len=${len} ct=${ct} :: ${path.slice(0, 60)}`);
    if (s === 200 && /html/.test(ct)) {
      const links = [...t.matchAll(/(?:href|src)="([^"]*(?:attach2|equip|img_equip)[^"]*)"/g)].map((x) => x[1]).slice(0, 10);
      if (links.length) console.log('  links:', JSON.stringify(links, null, 1));
      const hit = t.includes(NAME);
      console.log('  contains name:', hit);
    }
  } catch (e) { console.log('[ERR]', path.slice(0, 50), e.message); }
  await new Promise((r) => setTimeout(r, 400));
}
// 2. 用户提供的已知图片 URL 是否可直接下载
const KNOWN = 'attach2/696D67_65717569705FE6989FE98DB5E383AAE38399E383ACE383BCE382B7E383A7E383B35F4E462E706E67.png';
const { s, len, ct } = await probe(BASE + KNOWN);
console.log(`[known img] [${s}] len=${len} ct=${ct}`);

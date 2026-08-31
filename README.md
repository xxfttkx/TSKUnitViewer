# TSKUnitViewer — Twinkle Star Knights X 交互式角色图鉴

基于 Frida dump 的游戏数据 `unit_list.json`，生成单文件交互式角色图鉴 `index.html`，并从攻略 Wiki 抓取角色图片。

**在线版：https://xxfttkx.github.io/TSKUnitViewer/**（GitHub Pages 部署，数据与图片随仓库更新）

## 目录结构

```
unit_list/
├── unit_list.json      # 游戏数据（Frida / il2cpp-bridge dump 自客户端内存）
├── gen_viewer.mjs      # 生成图鉴页脚本
├── fetch_images.mjs    # Wiki 图片爬虫脚本（同时产出全图鉴数据 wiki_data.json）
├── wiki_data.json      # 全图鉴数据（fetch_images.mjs 产物，281 行，含 owned/ownedUnit 标记）
├── index.html          # 生成产物：交互式图鉴（数据内嵌，双击即可打开；亦是 GitHub Pages 首页）
├── img/                # 爬取的图片（fetch_images.mjs 产物）
│   ├── {unit_id}.png       # 立绘大图（来自角色详情页）
│   ├── {unit_id}_icon.png  # Wiki 50x50 头像（立绘缺失时的兜底）
│   └── w{no}_icon.png      # 未持有角色的头像（全图鉴视图用）
└── README.md
```

## 使用方法

```powershell
# 1. 生成图鉴（读取 unit_list.json + img/，输出 index.html）
node gen_viewer.mjs

# 2. 爬取 Wiki 角色图片（可选，~205 张立绘 + 头像，约 3 分钟）
node fetch_images.mjs
node fetch_images.mjs --icon-only   # 仅下载 50x50 头像，秒下
```

- `fetch_images.mjs` 支持断点续传（已存在的文件自动跳过），可重复执行补漏。
- 重新 dump 数据或补图后，再跑一次 `gen_viewer.mjs` 刷新页面即可。

## 图鉴功能

- **四种视图**：卡牌网格（默认按战力排序）/ 表格 / 按角色分组 / **全图鉴**（Wiki 全部 281 行角色，未持有置灰标记「未持有」，支持同样筛选排序）
- **筛选**：属性、类型、稀有度、种族；全图鉴视图另有**持有状态**筛选（已持有/未持有，一键只看没抽到的）；搜索支持角色名、卡名、全名、CV（全图鉴视图下按 Wiki 卡名/ヨミ/编号搜索）
- **排序**：战力 / 等级 / 好感度 / 稀有度 / 编号 / 实装日期，右侧按钮可切换 **降序/升序**（全图鉴下「稀有度」按初始★排序、默认已持有优先；「实装日期」按 Wiki 实装日排序）
- **稀有度显示**：觉醒过的卡显示为 `★初始→当前`（如 `★1→5`），未觉醒只显示当前★；详情弹窗含「稀有度 / 上限★5」
- **图片展示**：卡牌视图/表格/按角色/全图鉴均显示 Wiki 50x50 头像；详情弹窗为「模糊立绘底 + 右侧展示面板」——立绘等比完整显示不裁剪（兼容各种尺寸/横竖图），同图放大模糊铺满弹窗作氛围底
- **角标**：`Lv MAX`（金色）、`♥MAX`（粉色）、突破次数、绊卡
- **顶部统计**：持有卡牌、登场角色、总战力、**图鉴收集 210/281**、★5、满级、好感满
- **点击卡片**：详情弹窗（战力、队伍HP、好感度、生日、CV、简介等档案；全图鉴中仅已持有卡可点），弹窗标题下有「Wiki ↗」直达该角色的 Wiki 详情页；全图鉴每张卡右下角也有「↗ Wiki」角标（含未持有卡）

## 数据字段映射

`unit_list.json` 中枚举字段的含义（已通过 [攻略 Wiki](https://twinklestarknights.wikiru.jp/?%E3%82%AD%E3%83%A3%E3%83%A9%E3%82%AF%E3%82%BF%E3%83%BC%E4%B8%80%E8%A6%A7) 交叉验证，映射表位于 `gen_viewer.mjs` 开头，如有出入可直接修改）：

| 字段 | 映射 |
|---|---|
| `attr_type` | 1=炎 2=水 3=雷 4=光 5=闇 |
| `role` | 1=ATK 2=SPD 3=DEF 4=SUP 5=HEAL（json 枚举与 Wiki 一览页现行记法一致，页面筛选/显示统一用英文；`ヒール` 旧记法已兼容） |
| `camp` | 1=人間 2=神族 3=魔族 |
| `affiliation` | 0=無所属 1=流星学園 2=新星学園 3=守護天使 4=ネビュラ 5=流星附属 7=コラプサー 8=極星学園（全部经 Wiki 角色详情页「所属」栏核验；6 未在 dump 中出现）。`affiliation` 为主所属 |

其他字段说明：

- `camp_list` / `affiliation_list` 是每张卡的**完整陣営/所属集合**（`camp`/`affiliation` 为主值）；存在双重所属的卡（如主 4 副 2），图鉴以 `·` 分隔显示完整集合，种族筛选也按集合匹配（任一命中即显示）
- `rarity` 是**当前稀有度**（觉醒后会增长），不是初始稀有度；初始稀有度以 Wiki 行的 ★ 为准（合并后存于 `wRar`），`max_rarity` 为稀有度上限（当前所有卡均为 5）
- `is_have` 全部为 0，不可用于判断持有；本 dump 即当前账号全部持有卡
- `love_lv` 为好感度，刚入手未培养的卡可能为 0
- `lv_limit_count` 为限界突破次数；突破后 `max_lv` 会随之增长
- `skill_data` / `status_data` / `buff_effect` 等字段是 il2cpp dump 时的类型名占位或读取失败的字符串，无实际数值，图鉴中已剔除

## 图片爬取说明（fetch_images.mjs）

- 数据源：[キャラクター一覧](https://twinklestarknights.wikiru.jp/?%E3%82%AD%E3%83%A3%E3%83%A9%E3%82%AF%E3%82%BF%E3%83%BC%E4%B8%80%E8%A6%A7)（2026/08/31 时点：★3 221 名 / ★2 47 名 / ★1 12 名 / 合計 280 名，另有覚醒強化別枠的クロト《厄災》单独一行，故表格共 281 行）
- 产物：`wiki_data.json`（全图鉴：编号、初始★、卡名、属性/类型/陣営、Lv1 白值、EX/CT、暴击、实装日、入手方法、`owned`/`ownedUnit` 持有标记）+ 图片
- **匹配规则**（按顺序回退，见脚本步骤 2）：
  1. 「［卡名］角色名」与 Wiki 标题**精确匹配**（最可靠）
  2. `unit_id` 后 6 位 == Wiki 行编号（如 `1001001` → `001001`）；编号冲突（如 `006001` 有两张クロト）按卡名/角色名消歧
  3. 编号唯一但名字对不上时先尝试标题包含匹配（部分卡游戏内编号与 Wiki 错位，如 `1002004` アイシクルノヴァ ↔ Wiki `002003`）；都失败才仅按编号兜底并打 `WARN`
- 匹配成功的行会写入 `ownedUnit`（持有 unit_id），`gen_viewer.mjs` 直接引用，无需重复实现匹配
- 立绘来自每张卡的角色详情页（请求间隔 350ms）；文件名含「私服/表情/差分/戦闘/攻撃/ドット」的图会被排除
- Wiki 未收录的卡会跳过，页面自动回退为属性色渐变 + 角色首字
- 图片版权属于官方及 Wiki 上传者，仅供个人研究使用

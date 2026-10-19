# TSKUnitViewer — Twinkle Star Knights X 交互式角色图鉴

基于 Frida dump 的游戏数据 `userdata/unit_list.json`，生成单文件交互式角色图鉴 `index.html`，并从攻略 Wiki 抓取角色图片。

**在线版**：<https://xxfttkx.github.io/TSKUnitViewer/>（GitHub Pages 部署，数据与图片随仓库更新）

## 目录结构

```
unit_list/
├── userdata/           # 游戏数据（Frida / il2cpp-bridge dump 自客户端内存）
│   ├── unit_list.json      # 持有卡牌（含角色+装备），221 张
│   ├── sister_unit_list.json # 持有シスター（14 名）
│   └── warehouse.json      # 仓库道具（item_list/stren_list/chara_piece_list/event_item_list 等）
├── gen_viewer.mjs      # 生成图鉴页脚本
├── fetch_images.mjs    # Wiki 角色图片爬虫脚本（同时产出全图鉴数据 wiki_data.json）
├── fetch_equips.mjs    # Wiki 装备爬虫脚本（武器/防具/装飾品一覧 → equip_wiki.json + 装备图标）
├── wiki_data.json      # 全图鉴数据（fetch_images.mjs 产物，290 行，含 owned/ownedUnit 标记）
├── equip_wiki.json     # 装备图鉴数据（fetch_equips.mjs 产物，458 行，按名称匹配 dump 装备）
├── index.html          # 生成产物：交互式图鉴（数据内嵌，双击即可打开；亦是 GitHub Pages 首页）
├── img/                # 爬取的图片（fetch_images.mjs 产物）
│   ├── {unit_id}.png       # 立绘大图（来自角色详情页）
│   ├── {unit_id}_icon.png  # Wiki 50x50 头像（立绘缺失时的兜底）
│   ├── w{no}_icon.png      # 未持有角色的头像（全图鉴视图用）
│   └── equip/{equip_id}.png # 装备图标（fetch_equips.mjs 产物，dump 中持有的装备）
└── README.md
```

## 使用方法

```powershell
# 1. 生成图鉴（读取 userdata/ 下的 dump + img/ + equip_wiki.json，输出 index.html）
node gen_viewer.mjs

# 2. 爬取 Wiki 角色图片（可选，~205 张立绘 + 头像，约 3 分钟）
node fetch_images.mjs
node fetch_images.mjs --icon-only   # 仅下载 50x50 头像，秒下

# 3. 爬取 Wiki 装备数据 + 图标（可选，武器/防具/装飾品一覧，约 10 秒）
node fetch_equips.mjs
```

- `fetch_images.mjs` 支持断点续传（已存在的文件自动跳过），可重复执行补漏。
- 重新 dump 数据或补图后，再跑一次 `gen_viewer.mjs` 刷新页面即可。

## 图鉴功能

- **五种视图**：卡牌网格（默认按战力排序）/ 表格 / 按角色分组 / **全图鉴**（Wiki 全部 290 行角色，未持有置灰标记「未持有」，持有碎片的卡另有绿色「碎片 N」角标，支持同样筛选排序）/ **シスター**（Wiki 全部 73 名支援角色，未持有置灰，仅持有点开详情）
- **筛选**：属性、类型、**攻撃タイプ**（魔法/斬撃/打撃）、稀有度、种族、**升星**（可升星〔可立即限界突破或コアLV强化〕/ 素材不足〔有提升空间但碎片不够〕，仅持有卡视图可用）；全图鉴视图另有**持有状态**筛选（已持有/未持有，一键只看没抽到的）与**碎片**筛选（有碎片）；搜索支持角色名、卡名、全名、CV（全图鉴视图下按 Wiki 卡名/ヨミ/编号搜索）
- **排序**：战力 / ATK（含装备加成）/ EX 上升（含装备加成）/ 基础 EX 上升 / 等级 / 好感度 / 稀有度 / 编号 / 实装日期 / **升星差距**（碎片足够者在前、其次差得少的在前），右侧按钮可切换 **降序/升序**（全图鉴下「稀有度」按初始★排序、默认已持有优先；「实装日期」按 Wiki 实装日排序）
- **稀有度显示**：升星（限界突破）过的卡显示为 `★初始→当前`（如 `★1→5`），未升星只显示当前★；详情弹窗含「稀有度 / 上限★5」
- **图片展示**：卡牌视图/表格/按角色/全图鉴均显示 Wiki 50x50 头像；详情弹窗为「模糊立绘底 + 右侧展示面板」——立绘等比完整显示不裁剪（兼容各种尺寸/横竖图），同图放大模糊铺满弹窗作氛围底
- **角标**：`Lv MAX`（金色）、`♥MAX`（粉色）、上限解放次数、绊卡、**升星**（见下）
- **升星（限界突破 / コアLV强化）**：读取 `userdata/warehouse.json` 的 `chara_piece_list`（角色碎片持有数，`item_id` 即卡牌 `unit_id`），按官方消耗规则计算每张卡能否升星：
  - ★1→2 需 **50** / ★2→3 需 **100** / ★3→4 需 **200** / ★4→5 需 **300** 碎片（限界突破）
  - ★5 后改走コアLV强化：0→1 需 **50** / 1→2 需 **120** / 2→3 需 **180** 碎片
  - 卡片角标显示「可升星 ★N」或「升★N 持有/所需」；详情弹窗新增「升星」区块（碎片名 + 进度条 + 差多少）；表格视图新增「升星」列（可升星 / 差 N）；顶部统计新增「可升星」「可强化コア」两项
  - **未持有角色也可能持有碎片**：全图鉴视图下这类卡（当前 6 名）显示绿色「碎片 N」角标（只显示数量，未持有没有 dump 练度故不推算差值），可用「有碎片」筛选一键找出
- **详情弹窗分区**：左栏=基本信息 / **升星** / **装备**（3 部位：武器·防具·装飾品，图标+★+Lv/突破+附魔槽+当前参数+アビリティ当前&满强文本+入手方法，专武有「専武」标）/ 技能 / 简介；右栏=立绘 / 白值（当前练度）/ 档案
- **顶部统计**：持有卡牌、登场角色、总战力、**图鉴收集 221/290**、★5、满级、好感满、**可升星**、**可强化コア**
- **点击卡片**：详情弹窗（战力、队伍HP、好感度、生日、CV、简介等档案；全图鉴中仅已持有卡可点），弹窗标题下有「Wiki ↗」直达该角色的 Wiki 详情页；全图鉴每张卡右下角也有「↗ Wiki」角标（含未持有卡）
- **シスター详情**：支援/アクティブ/解放三种技能（当前练度 Lv 与效果文本，アクティブ附 Wiki 发动条件/对象，次级预览带官方差分高亮色），外加 Wiki 的ゲージ速度/入手方法/実装日与满级チームスキル参考
- **シスター图片**：シスター是独立单位类型（`sister_unit_id` 虽与基础卡 `unit_id` 同号但立绘不同），卡片图标与弹窗立绘**全部使用 Wiki 专属 Q 版 SD 图**（`fetch_sisters.mjs` 抓取存 `img/sw{idx}_icon.png` / `img/sw{idx}.png`），不复用 unit 全身立绘

## 数据字段映射

`unit_list.json` 中枚举字段的含义（已通过 [攻略 Wiki](https://twinklestarknights.wikiru.jp/?%E3%82%AD%E3%83%A3%E3%83%A9%E3%82%AF%E3%82%BF%E3%83%BC%E4%B8%80%E8%A6%A7) 交叉验证，映射表位于 `gen_viewer.mjs` 开头，如有出入可直接修改）：

| 字段 | 映射 |
|---|---|
| `attr_type` | 1=炎 2=水 3=雷 4=光 5=闇 |
| `role` | 1=ATK 2=SPD 3=DEF 4=SUP 5=HEAL（json 枚举与 Wiki 一览页现行记法一致，页面筛选/显示统一用英文；`ヒール` 旧记法已兼容） |
| `camp` | 1=人間 2=神族 3=魔族 |
| `sp_equip_types` | 1=魔法 2=斬撃 3=打撃（攻撃タイプ/可装备武器类型，与 Wiki「攻撃タイプ」列 212/212 全量一致） |
| `affiliation` | 0=無所属 1=流星学園 2=新星学園 3=守護天使 4=ネビュラ 5=流星附属 7=コラプサー 8=極星学園（全部经 Wiki 角色详情页「所属」栏核验；6 未在 dump 中出现）。`affiliation` 为主所属 |

其他字段说明：

- `equip_data[].parameter_list[].parameter_type`：0=HP 1=ATK 2=EX上昇 3=クリ(值×100=%) 4=EX 5=行動CT（经 Wiki 装备一覧对照确认）；dump 值为**当前练度值**，Wiki 一覧数值为满强化(Lv50)值
- `equip_data[].equip_part`：1=武器 2=防具 3=装飾品；`exclusive_unit_id` 非 null 为专武（新版 dump 非专武为 null，旧版为 0）；`enchant_frame_list[].enchant_data` 新版已解析（含 skill_id/tier/effect_rarity/effect_type/effect_value/detail），不再是类型名占位

- `camp_list` / `affiliation_list` 是每张卡的**完整陣営/所属集合**（`camp`/`affiliation` 为主值）；存在双重所属的卡（如主 4 副 2），图鉴以 `·` 分隔显示完整集合，种族筛选也按集合匹配（任一命中即显示）
- `rarity` 是**当前稀有度**（升星〔限界突破〕后会增长），不是初始稀有度；初始稀有度以 Wiki 行的 ★ 为准（合并后存于 `wRar`），`max_rarity` 为稀有度上限（当前所有卡均为 5）
- 本 dump 即当前账号全部持有卡；`is_have` 字段已在新版 dump 中移除
- `love_lv` 为好感度，刚入手未培养的卡可能为 0
- `lv_limit_count` 为**上限解放**次数（提升等级上限，解放后 `max_lv` 随之增长）；注意与升星区分——升星在游戏内叫**限界突破**（★+1，体现在 `rarity` 增长）
- `skill_data` / `status_data` 等实体在新版 dump 中已完整解析（含 EX2+ 强化技能、各项加成明细等）；旧版的 `<error>: access violation` 占位与 `buff_effect` 字段已移除
- **仓库数据**：`userdata/warehouse.json` 含 `item_list`（普通道具）、`stren_list`（强化素材）、`chara_piece_list`（角色碎片）、`event_item_list`（活动道具）、`important_item_list`（重要道具）；图鉴目前只用 `chara_piece_list`
- **碎片匹配**：`chara_piece_list[].item_id` 即卡牌 `unit_id`（139 种碎片，221 张持有卡中 133 张命中，其余为未获得过碎片=0 个）。极少数碎片由同角色的多张卡**共用**（如 `1006001` 同时供 `[未完の魔王]クロト` 与 `[最後の魔王]クロト《厄災》`，见该道具 `detail` 首行），此情况按 `item_id` 归属即可，数值仍正确
- **未持有角色的碎片**：不属于任何已持有卡的碎片（139 种中 6 种）对应 Wiki 未持有角色，按 `item_name`（去掉「のピース」）匹配 Wiki 卡名归入全图鉴行。不可用「`item_id` 去首位 == Wiki 编号」规则（编号存在错位，如 `1020004 聖夜のキャロル` 会撞到 `020004 ルルカ`）

## 图片爬取说明（fetch_images.mjs）

- 数据源：[キャラクター一覧](https://twinklestarknights.wikiru.jp/?%E3%82%AD%E3%83%A3%E3%83%A9%E3%82%AF%E3%82%BF%E3%83%BC%E4%B8%80%E8%A6%A7)（当前 `wiki_data.json` 共 290 行，含覚醒強化別枠的クロト《厄災》等单独行）
- 产物：`wiki_data.json`（全图鉴：编号、初始★、卡名、属性/类型/陣営、Lv1 白值、EX/CT、暴击、实装日、入手方法、`owned`/`ownedUnit` 持有标记）+ 图片
- **匹配规则**（按顺序回退，见脚本步骤 2）：
  1. 「［卡名］角色名」与 Wiki 标题**精确匹配**（最可靠）
  2. `unit_id` 后 6 位 == Wiki 行编号（如 `1001001` → `001001`）；编号冲突（如 `006001` 有两张クロト）按卡名/角色名消歧
  3. 编号唯一但名字对不上时先尝试标题包含匹配（部分卡游戏内编号与 Wiki 错位，如 `1002004` アイシクルノヴァ ↔ Wiki `002003`）；都失败才仅按编号兜底并打 `WARN`
- 匹配成功的行会写入 `ownedUnit`（持有 unit_id），`gen_viewer.mjs` 直接引用，无需重复实现匹配
- 立绘来自每张卡的角色详情页（请求间隔 350ms）；文件名含「私服/表情/差分/戦闘/攻撃/ドット」的图会被排除
- Wiki 未收录的卡会跳过，页面自动回退为属性色渐变 + 角色首字
- 图片版权属于官方及 Wiki 上传者，仅供个人研究使用

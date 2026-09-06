# unit_list.json 字段说明

Frida / il2cpp-bridge 从游戏客户端内存 dump 的 `TSK.Network.Domain.UnitEntity` 列表（每元素 = 一张持有卡牌）。本文按功能分组说明各字段含义与枚举映射，验证方式为「与[攻略 Wiki](https://twinklestarknights.wikiru.jp/?%E3%82%AD%E3%83%A3%E3%83%A9%E3%82%AF%E3%82%BF%E3%83%BC%E4%B8%80%E8%A6%A7) 角色详情页交叉对照」。

## 标识 / 名称

| 字段 | 说明 |
|---|---|
| `u_unit_id` | dump 内部对象 ID（无游戏意义） |
| `unit_id` | 卡牌唯一 ID，7 位（如 `1001001`）；后 6 位与 Wiki 一览页行编号对应（`001001`） |
| `character_id` | 角色 ID（同一角色的不同卡共享） |
| `character_name` | 角色名（如 `フィオナ`） |
| `character_name_kana` | 角色名读音（ヨミ） |
| `unit_name` | 卡名（如 `太陽の祝福`） |
| `full_name` | 完整名（`［卡名］角色名`，可能含样式标签，需清理） |
| `unit_illust_id` | 立绘 ID（一般与 unit_id 相同） |
| `awake_unit_illust_id` / `awakened_illust_display_type` | 升星后立绘 / 显示方式（多数 0） |

## 稀有度 / 属性 / 类型

| 字段 | 说明 |
|---|---|
| `rarity` | **当前稀有度**（升星〔限界突破〕后会增长，不是初始值）；初始★以 Wiki 为准，无初始★4 |
| `max_rarity` | 稀有度上限（当前所有卡均为 5） |
| `attr_type` | 属性：1=炎 2=水 3=雷 4=光 5=闇 |
| `role` | 类型：1=ATK 2=SPD 3=DEF 4=SUP 5=HEAL（与 Wiki 一览页现行英文记法一致） |
| `camp` / `camp_list` | 陣営：1=人間 2=神族 3=魔族；`camp_list` 为完整集合（存在双重陣営卡，如 `人間·魔族`），`camp` 是主值 |
| `affiliation` / `affiliation_list` | 所属：0=無所属 1=流星学園 2=新星学園 3=守護天使 4=ネビュラ 5=流星附属 7=コラプサー 8=極星学園；`affiliation_list` 为完整集合（双重所属，主值在前），6 未出现 |
| `sp_equip_types` | **攻撃タイプ**（可装备的武器类型）：1=魔法 2=斬撃 3=打撃 —— 与 Wiki 一覧「攻撃タイプ」列 212/212 全量一致（2026/09/01 验证） |

## 养成 / 数值

| 字段 | 说明 |
|---|---|
| `lv` / `max_lv` | 当前 / 上限等级（突破上限解放后 `max_lv` 增长，一般 100） |
| `lv_limit_count` | 上限解放次数（0~4） |
| `core_lv` / `max_core_lv` | 核心（コア）等级 / 上限 3（仅部分卡有核心系统，其余 0） |
| `total_exp` / `current_exp` / `max_exp` | 经验值 |
| `power` | 战力（含装备/好感等的综合数值，排序用） |
| `team_hp` | 队伍 HP 贡献 |
| `love_lv` / `max_love_lv` | 好感度 / 上限（刚入手可能为 0；30 为满） |
| `total_love_exp` / `current_love_exp` / `max_love_exp` | 好感经验 |
| `bond_lv` / `is_bond_unit` | 绊等级 / 是否绊卡 |

### status_data（等级 + 好感加成后的面板）

`status_data.base_data`（当前白值）与 `status_data.add_love_lv`（好感满级加成，各项 0 表示无）：

| 字段 | 说明 |
|---|---|
| `hp` | HP（含好感加成） |
| `attack` | ATK（含好感加成） |
| `critical` | 暴击率，**原始值 ÷100 = %**（如 500=5%）；与装备 `クリ` 参数同单位可直接相加 |
| `init_ex_gauge` | 开局 EX 量（不受装备影响，验证：有无 EX 装备的卡分布重叠） |
| `max_ex_gauge` | EX 槽上限（300 或 200，与消费 EX 成整数比） |
| `ex_gauge_rate` | EX 上升（基础值；装备 `EX上昇` 参数在其上加算） |
| `min_wt` / `max_wt` | 行动 CT（玩家惯用名，即速度/行动间隔），如 `17~21` |
| `weight` | 重量 |

`base_status_data`（顶层，区别于 status_data）是升星前的基础白值快照。

## 装备 equip_data（每卡最多 3 件：部位 1=武器 2=防具 3=装飾品）

| 字段 | 说明 |
|---|---|
| `equip_id` | 装备 ID，首位 = 部位（1/2/3） |
| `equip_name` | 装备名（专武含「○○のブーケ」等；Wiki 装飾品一覧写作「装備名［卡名］角色名」） |
| `equip_part` / `equip_type` | 部位 / 武器子类型（防具装飾品为 0） |
| `exclusive_unit_id` | 专武标记（非 0 = 对应角色 unit_id） |
| `rarity` | 装备稀有度 1~3 |
| `lv` / `max_lv` | 当前 / 满级（50） |
| `limit_break_count` / `max_limit_break_count` | 装备突破 |
| `parameter_list[].parameter_type` | 0=HP 1=ATK 2=EX上昇 3=クリ(值÷100=%) 4=EX蓄积 5=行動CT —— dump 为**当前练度值**，Wiki 一覧为满强化值 |
| `skill_data.skill_detail` / `lv` | アビリティ当前效果文本 / 技能等级 |
| `enchant_frame_list[]` | 附魔槽（`is_enchant_release` 解锁状态；附魔详情 dump 为类型名占位，未解析） |

## 技能

| 字段 | 说明 |
|---|---|
| `skill_data` | EX1/EX2/ユニゾン/シスター技列表（`skill_type` 区分；含名称/效果文本/EX消耗/CT/等级/解锁条件） |
| `unique_skill_data[]` | 升星解锁的固有被动（`detail` 效果、`is_unlock`、`unlock_condition` 如「限界突破★4にすると解放」） |
| `skill_category_id_list` | 技能类别 ID 列表（如 1001/2001/3001/3002/3004/9999，具体语义未考证） |
| `skill_category_id_list_by_ex_type` | 按 EX 类别的技能类别（对象，内部字段未展开） |

## 耐性 resist_data（7 种异常状态）

`poison`(毒) / `paralysis`(麻痹) / `confusion`(混乱) / `atrophy`(萎縮) / `seal`(封印) / `burn`(焼却) / `flostbite`(凍傷，官方拼写)。

值为 0~3，多数卡全 3，少数 2/0——**语义未确认**（推测 3=标准、更低=有弱点，需与游戏内实测对照）。

## 其他 / 未解析

| 字段 | 说明 |
|---|---|
| `birthday` / `constellation` / `guardian_star` / `school_year` / `committee` / `club` / `hobby` / `cv` / `profile` | 角色档案（生日/星座/守护星/学年/委员会/社团/爱好/CV/简介） |
| `is_rental` / `is_used` / `is_prohibited` / `friend_user_id` | 好友租借相关（全部 0） |
| `is_have` | **全部为 0，不可用于判断持有**（本 dump 即账号全部持有卡） |
| `is_event_unit` | 是否活动卡 |
| `notice_flg` | 通知标记（1=190 张 / 0=22 张，语义未考证） |
| `specific_gauge_data` | 特殊槽（特定技用；文本字段访问违规，仅 icon_id/is_unlock 可读） |
| `tab_batch_data` / `exclusive_exchange_shop_data` / `strengthen_flag_list` | UI 标签页 / 专武交换所 / 强化旗标实体（已解析，图鉴未使用） |
| `buff_effect` | 读取失败占位（`<error>: access violation`），无数据 |
| `class_name` | dump 标注的来源类全名（`TKS.Network.Domain.UnitEntity`） |
| `effect_rate` | 全部 0 |
| `unit_view_type` | 全部 2（视图/模型类型，无区分度） |

## シスター sister_unit_list.json（12 名持有）

「シスター」是随队支援系统角色，与上阵卡互相独立。注意：**シスター是独立单位类型**，虽然 `sister_unit_id` 与对应角色基础卡的 `unit_id` 数字相同（如 1001001=フィオナ），但两者立绘/头像完全不同——页面**一律使用 Wiki 专属图**（Q 版 SD 风格），不复用 `img/{unit_id}*.png` 的 unit 全身立绘。

| 字段 | 说明 |
|---|---|
| `sister_unit_id` / `u_sister_unit_id` | シスター ID / dump 实例 ID |
| `character_name` / `character_name_kana` | 名称（含【魔王】【新春】等变体；与 Wiki「シスター」页名称**精确对应**，71 名全量匹配成功） |
| `attr_type` / `role` / `camp` | 属性/类型/种族，与 unit 同一套枚举 |
| `limit_break_count` | シスター限界突破次数（0/1） |
| `support_skill_data` | **支援スキル**：`skill_name`/`skill_detail`/`lv`/`max_lv`(10)，`next_lv_list` 为后续各级预览（含 `<color=#16C97B>` 差分高亮 rich text） |
| `active_skill_data` | **アクティブスキル**：结构同上，另含 `skill_type`；发动条件/对象 dump 中无，由 Wiki 表补充 |
| `extra_support_skill_data` | **解放スキル**：`release_skill_data.skill_name/detail`（满级文本）；`is_release`=1 已解放 / 0 未解放；`extra_support_skill_flg`=1 表示该シスター持有解放技 |
| `is_rental` / `is_used` / `is_prohibited` / `notice_flg` | 租借/使用中/禁止/通知旗标（图鉴未使用） |
| `effect_rate` / `limit_date_text` | 读取失败占位（`<error>: access violation`） |
| `attack_type` | 全部 0（シスター不直接攻击） |

Wiki 侧数据（`fetch_sisters.mjs` → `sister_wiki.json`，71 名）：チームスキル（满级合计文本）、アクティブスキル発動条件/対象/効果（满级）、ゲージ速度、入手方法、実装日。图片全部为 Wiki 专属资源：图标 `img/sw{idx}_icon.png`（71 张，一覧表 lazyload `data-src`）、Q 版立绘 `img/sw{idx}.png`（71 张，逐详情页抓取，attach2 第二段 hex 解码文件名，形如 `シスター{名}.png`）。

## 页面已使用 / 未使用速查

- **已使用**：标识名称、稀有度属性类型陣営所属、`sp_equip_types`(攻撃タイプ待接入)、养成数值、status_data 白值、equip_data、skill_data、unique_skill_data、resist_data（待接入）、档案；シスター三技能/解放状态 + Wiki 合并字段
- **未使用**：经验类、core_lv、租借标记、`skill_category_id_list`、`tab_batch_data`、`exclusive_exchange_shop_data`、`strengthen_flag_list`、`specific_gauge_data`

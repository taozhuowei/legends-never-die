# Legends Never Die 测试用例设计（核实修正版）

> 本文件取代根目录 `TEST_CASES.md`。所有「预期结果」均逐条对照源码（`src/`）与 `demo/PRD.md` 核实，
> 并标注与实现/PRD 的偏差。带 `E2E-xxx` 的用例由 `tests/e2e/` Playwright 套件真机执行；
> 带 `UNIT` 的由 `tests/*.test.ts` 执行；`MANUAL` 为需人工/性能环境观察。

## 0. 核实结论与已确认缺陷

> 执行结果（最终）：单测 `vitest` 108 项全过；e2e `playwright` 61 项全过（连续多轮稳定）。
> 缺陷与 PRD 缺口均已修复/补齐并通过回归（触屏按钮、飞行安全落地、里程节奏见下文 CORR-3 / NI-1 / TC-OP-010）。
> 测试手段：Playwright 真机驱动 Vite dev 构建，真实键鼠操作 + 读取内部状态。

源码核实发现以下与原 `TEST_CASES.md` / PRD 的偏差：

- **BUG-1 跳跃完全失效（致命）— 已修复**：`GameScene.heroJump()` 仅置 `isJumping=true` 未赋初速度；
  `updateHero()` 先施加重力使角色当帧即落地，跳跃在 1 帧内自我终止（e2e 实测跳跃高度恒为 `0`）。
  这是「操作无响应」的真因。修复：起跳即赋 `velocityY=JUMP_VELOCITY*modifier`，移除每帧重置初速的错误尾块。
- **BUG-2 字体不符设计且不清晰 — 已修复**：全部 `add.text` 未设 `fontFamily`，Phaser 回退默认 `Courier`（打字机衬线体）；
  中文走系统兜底、未按 `devicePixelRatio` 提升文本分辨率。修复：新增 `src/ui/text.ts` 统一字体栈与文本分辨率，全场景接入。
- **BUG-3 精英边框失效/泄漏 — 已修复**：`GameScene.spawnEntities` 自建边框未设 `ownerEntity`（不跟随、首帧即销毁）；
  `EncounterDirector.spawnElite` 内建边框未被收集成孤儿。修复：GameScene 边框关联 `ownerEntity`，移除 Director 内孤儿边框。
- **BUG-4 爆裂导弹重复结算击杀（测试中发现）— 已修复**：爆炸已击杀直接命中目标后，外层直接伤害再次 `handleEnemyKilled`，
  使击杀/经验/得分翻倍并可触发意外升级。修复：仅在目标仍存活时结算直接伤害。
- **注（操作无响应澄清）**：射击 `K`、导弹 `L`、暂停 `P` 经真机验证均正常；「操作无响应」集中于跳跃（BUG-1）。
- **CORR-1 最小安全间距**：PRD 称 `650px`，实现实为 `hasSpace(minDistance)` = 普通 `160` / Boss `260`
  （判据：所有实体 `x < 1024 - minDistance`）。下文按实现取值，并标注 PRD 偏差。
- **CORR-2 生成冷却区间**：实现 `clamp(1800 - speed*120 - tier*80, 800, 1800)`；因 `speed≥2.5` 恒减 `≥300`，
  实际区间为 `800–1500ms`（PRD 称 `0.8–1.8s`）。初始 `(2.5,0)=1500ms`。
- **CORR-3 里程累积速率（平衡）— 已修复**：原 `meters += gameSpeed*deltaMs*0.105` 约 `262 m/s`，里程碑被压缩到数秒。
  改为常量 `CONFIG.DISTANCE_FACTOR=0.006`（基础约 `15 m/s`，`1200m≈80s`，锚定 PRD「Boss 1200m 或 90s」），
  使「300m 精英 / 800m 提速 / 1200m Boss」成为有意义的阶段节点。e2e `TC-GP-002b` 校验节奏区间。
- **NI-1 飞行落地安全点（PRD 10.5）— 已实现**：飞行结束时若正下方有障碍（`isGroundLandingSafe` 判定），
  角色保持悬停直到出现安全落点再落地，避免卡入障碍。e2e `TC-ST-009b` 覆盖。
- **TEST-DEBT 现有单测**：`utils.test.ts`、`upgrade-system.test.ts` 测真实代码（保留）；
  `constants/game-logic/edge-cases.test.ts` 多为自证式（`expect(20).toBe(20)`）或重写逻辑
  （护甲用 `armor-=damage` 错误模型），不调用真实 `GameScene` → 重写为真实代码单测，集成行为交由 e2e。

状态列说明：`PASS` 通过 / `FAIL` 失败（附缺陷号）/ `PASS` / `N/A` 不自动化。

---

## 一、操作正确性 (Operational Correctness)

### TC-OP-001 跳跃响应  · E2E-jump-basic
- 前置：PLAYING，角色在地面（`heroSprite.y == GROUND_Y-96 == 304`），未跳/未飞。
- 步骤：真实按下 `Space`。
- 预期：角色离地上升后自然回落至 `304`；`hero.velocityY` 起跳帧 = `JUMP_VELOCITY*jumpVelocityModifier (=-12)`；
  采样窗口内最小 Y 明显 `< 304`（跳跃高度 > 80px，对照 `game-logic` 物理模拟）。
- 状态：`PASS`（BUG-1 修复后，e2e 实测跳跃高度约 170px 并回落到基线）。

### TC-OP-002 空中/飞行锁定二段跳  · E2E-jump-lock
- 前置：`isJumping=true` 或 `isFlying=true`。
- 步骤：再次按 `Space`。
- 预期：无二次跳跃；上升中不重置轨迹；飞行中 `Space` 无效。
- 状态：PASS（依赖 BUG-1 修复后验证）。

### TC-OP-003 射击  · E2E-shoot
- 前置：PLAYING，射击冷却已过（`nowMs-lastShootAt >= shootCooldownMs`）。
- 步骤：按 `K`。
- 预期：新增 `min(fireLevel,5)` 颗子弹；每颗 `damage=1+bulletDamageBonus`；子弹向右移动（520px/s）；`lastShootAt` 更新。
- 状态：PASS。

### TC-OP-004 射击冷却  · E2E-shoot-cd
- 前置：刚射击，处于冷却内。
- 步骤：立即再按 `K`。
- 预期：不新增子弹。
- 状态：PASS。

### TC-OP-005 导弹发射  · E2E-missile
- 前置：`missileCount>0` 且导弹冷却已过（`>=1500ms`）。
- 步骤：按 `L`。
- 预期：新增 1 枚导弹（`damage=2, penetrate=true, explosive=hasExplosiveMissiles`）；`missileCount-=1`；HUD 导弹数 -1。
- 状态：PASS。

### TC-OP-006 导弹库存为 0  · E2E-missile-empty
- 前置：`missileCount==0`。
- 步骤：按 `L`。
- 预期：不发射；`missileCount` 保持 0（不为负）。
- 状态：PASS。

### TC-OP-007 暂停  · E2E-pause
- 前置：PLAYING。
- 步骤：按 `P`（或 `ESC`）。
- 预期：`state=PAUSED`；启动 `PauseScene`；`GameScene` 暂停；BGM 暂停。
- 状态：PASS。

### TC-OP-008 暂停后继续  · E2E-resume
- 前置：PAUSED，`PauseScene` 显示。
- 步骤：按 `P`/`ESC`（由 PauseScene 监听）或点「继续」。
- 预期：`state=PLAYING`；`PauseScene` 关闭；`GameScene` 恢复；里程/实体状态续接不跳变；BGM 恢复（非重头）。
- 状态：PASS（重点验证按键不被双触发）。

### TC-OP-009 升级选卡键盘  · E2E-levelup-keys
- 前置：`LevelUpScene` 显示 3 张卡。
- 步骤：按 `1`/`2`/`3`。
- 预期：对应卡生效；`pendingLevelUps-=1`；无积压时关闭并恢复，有积压时刷新候选。
- 状态：PASS。

### TC-OP-010 触屏按钮  · E2E-touch-jump / E2E-touch-shoot / E2E-touch-missile
- 已补齐（PRD 3.2）：`GameScene.createTouchControls` 新增底部「跳/射/弹」三按钮，`pointerdown` 调用与键盘一致的行动方法（桌面鼠标点击同样可用）。
- 步骤：分别点击三个按钮。
- 预期：跳跃→角色离地；射击→子弹 +1；导弹→`missileCount-1`。
- 状态：`PASS`。

### TC-OP-011 选卡点击  · E2E-levelup-click
- 前置：`LevelUpScene` 显示。
- 步骤：点击任意卡片热区。
- 预期：与键盘选卡一致。
- 状态：PASS。

### TC-OP-012 菜单开始  · E2E-menu-start
- 前置：`MenuScene` 显示。
- 步骤：按 `Enter`/`Space` 或点「开始游戏」。
- 预期：切到 `GameScene`，`state=PLAYING`；角色出现在 `HERO_X`；HUD 初始值。
- 状态：PASS（实测 Enter 可开始）。

### TC-OP-013 结算重开  · E2E-restart
- 前置：`GameOverScene` 显示。
- 步骤：按 `Enter`/`Space` 或点「再来一局」。
- 预期：状态全重置（hero 初始值、实体清空、距离/分数/击杀归零）。
- 状态：PASS。

### TC-OP-014 非 PLAYING 态操作屏蔽  · E2E-input-guard
- 前置：PAUSED / LEVELUP / GAMEOVER。
- 步骤：按 `Space`/`K`/`L`。
- 预期：不跳/不射/不发弹（`heroJump/heroShoot/heroFireMissile` 均有 `state!==PLAYING return`，
  且这些态下 GameScene 已 `scene.pause`，`handleInput` 不执行）。
- 状态：PASS。

---

## 二、技能效果 (Skill Effects)

> 统一通过「触发升级 → 选卡 → 读 `hero` 状态/行为」验证。上限与候选剔除逻辑见 `UpgradeSystem.eligible`
> （已由 `upgrade-system.test.ts` 单测覆盖），此处侧重「选中后效果真实生效」。

### TC-SK-001 火力升级  · E2E-skill-fireup / UNIT
- 选「火力升级」→ `fireLevel+1`（上限 5）；随后射击子弹数 = `min(fireLevel,5)`。达 5 后候选剔除。
- 状态：PASS。

### TC-SK-002 射速升级  · E2E-skill-shootspeed
- `shootCooldownMs-=20`（最低 100）；射击频率提升。达 100 后剔除。
- 状态：PASS。

### TC-SK-003 子弹强化  · E2E-skill-bulletboost
- `bulletDamageBonus+1`（≤4）；子弹 `damage=1+bonus`。达 +4 后剔除。
- 状态：PASS。

### TC-SK-004 导弹补给  · E2E-skill-missile
- `missileCount+=5`；HUD 更新；无上限。
- 状态：PASS。

### TC-SK-005 爆裂弹头  · E2E-skill-explosive
- `hasExplosiveMissiles=true`；导弹命中触发半径 74px 爆炸，范围内敌人各受 2 点；范围外不受影响；不再出现该卡。
- 状态：PASS。

### TC-SK-006 生命提升  · E2E-skill-lifeup
- `maxLife+1`、`life+1`（`maxLife≤8`）；HUD 生命条更新。达 8 后剔除。
- 状态：PASS。

### TC-SK-007 护甲装置  · E2E-skill-armor
- `armor+=2`（≤10）；护盾椭圆显示；受击先扣甲。达 10 后剔除。
- 状态：PASS。

### TC-SK-008 紧急修复  · E2E-skill-repair
- `life=min(life+2, maxLife)`；满血时候选剔除。
- 状态：PASS。

### TC-SK-009 韧性提升  · E2E-skill-resilience
- `invulnerableMs+=100`（≤800）。达 800 后剔除。
- 状态：PASS。

### TC-SK-010 轻量化  · E2E-skill-lightweight
- `jumpScaleCount+1`、`jumpVelocityModifier*=1.15`（≤3 次）；跳跃高度提升。达 3 后剔除。
- 依赖 BUG-1 修复后方可验证跳跃高度。
- 状态：PASS。

### TC-SK-011 飞行模块  · E2E-skill-flight
- `isFlying=true`、`heroSprite.y=180`、`flightRemainingMs=flightDurationMs`、贴图 `heroFly`、公告「Flight Online」；
  飞行中无视地面障碍/无需跳跃；倒计时结束回到 `y=304`。
- 状态：PASS。

### TC-SK-012 飞行续航  · E2E-skill-flightendurance / UNIT
- `flightDurationMs+=3000`（≤19000）。达 19s 后剔除。
- 状态：PASS。

### TC-SK-013 起跳喷射  · E2E-skill-jumpjet
- `jumpBoostCount+1`、`jumpVelocityModifier*=1.1`（≤3）；与轻量化乘法叠加。达 3 后剔除。
- 状态：PASS。

### TC-SK-014 经验增幅  · E2E-skill-expboost
- `expBoostCount+1`（≤3）；击杀经验 = `round(base*(1+0.2*count))`。
- 状态：PASS。

### TC-SK-015 幸运检索  · UNIT (upgrade-system.test)
- `luckyCount+1`（≤2）；稀有/史诗权重提升 → 相对占比上升（非精确 30/10）。
- 状态：`PASS`（已由 `upgrade-system.test.ts` 覆盖）。

### TC-SK-016 赏金模块  · E2E-skill-bounty
- `bountyCount+1`（≤3）；击杀得分 = `round(base*(1+0.25*count))`。
- 状态：PASS。

---

## 三、伤害计算 (Damage Calculation)

### TC-DM-001 子弹基础伤害  · E2E-dmg-bullet
- `bonus=0`：子弹 `damage=1`，命中普通敌（HP1）一击毙；经验 +5、得分 +20。
- 状态：PASS。

### TC-DM-002 子弹强化击杀精英  · E2E-dmg-bullet-elite
- `bonus=3`（伤害 4）：命中精英（HP3）一击毙；经验 +15、得分 +80。
- 状态：PASS。

### TC-DM-003 导弹穿透  · E2E-dmg-missile-pierce
- 导弹 `damage=2, penetrate=true`：依次穿过 2 个普通敌，二者皆毙，导弹 `active` 仍为真。
- 状态：PASS。

### TC-DM-004 爆裂弹头范围伤害  · E2E-dmg-explosive
- 半径 74px 内敌人各受 2 点；范围外不受影响；爆炸特效出现。
- 状态：PASS。

### TC-DM-005 多子弹独立伤害  · E2E-dmg-multishot
- `fireLevel=3, bonus=1`：3 颗各 2 点，分别命中 3 目标，各扣 2。
- 状态：PASS。

### TC-DM-006 护甲优先抵扣  · E2E-dmg-armor / UNIT
- `life=3, armor=2`，受 1 伤：`armor→1`，`life=3`，进入无敌。
  （实现 `heroTakeDamage`：`absorbed=min(armor,pending)` 为正确部分抵扣模型。）
- 状态：PASS。

### TC-DM-007 护甲耗尽后扣血  · E2E-dmg-armor-deplete / UNIT
- `life=3, armor=1`：第一次受击 `armor→0`、`life=3`；无敌结束后再受击 `life→2`。
- 状态：PASS。

### TC-DM-008 受击无敌  · E2E-dmg-invuln
- 受击后 `invulnerableMs` 内再次碰撞不掉血/不扣甲；角色闪烁（alpha 交替 0.55）。
- 状态：PASS。

### TC-DM-009 Boss 导弹伤害  · E2E-dmg-bossmissile
- Boss 导弹命中：1 点伤害（先甲后血），触发无敌，导弹消失。
- 状态：PASS。

### TC-DM-010 障碍碰撞  · E2E-dmg-obstacle
- 地面碰障碍：1 点伤害 + `hitStopMs=1000`（画面停顿约 1s）；障碍不可摧毁（HP=Infinity）。
- 状态：PASS。

### TC-DM-011 经验增幅取整  · UNIT
- `expBoostCount=2`（×1.4）：击杀普通敌得经验 `round(5*1.4)=7`。
- 状态：PASS（HeroLogic 单测）。

### TC-DM-012 赏金取整  · UNIT
- `bountyCount=2`（×1.5）：击杀精英得分 `round(80*1.5)=120`。
- 状态：PASS（HeroLogic 单测）。

### TC-DM-013 最终得分公式  · UNIT / E2E-score
- `floor(meters)*10 + round(killScore) + level*100`。例：`1500,500,5 → 16000`。
  （Boss 200 分已并入 `killScore`，与 PRD「距离+击杀+等级+Boss」一致。）
- 状态：PASS。

---

## 四、碰撞检测 (Collision Detection)

> 敌人受击盒在视觉精灵上缩小为 `(x+6, y+4, w-12, h-8)`（最小 8px）；角色受击盒 `(x+18, y+10, 62, 82)`。
> 几何重叠由 `rectsOverlap` 判定（已由 `utils.test.ts` 单测覆盖纯函数）。

- **TC-CO-001 角色×障碍**：地面不跳 → 重叠受伤、`hitStopMs=1000`。`E2E-col-obstacle`，PASS。
- **TC-CO-002 跳跃越障**：适时跳跃 → 跳跃顶点 Y 高于障碍顶，不重叠。`E2E-col-jumpover`，依赖 BUG-1，PASS。
- **TC-CO-003 飞行无视地面障碍**：`isFlying` 时 `handleHeroCollisions` 跳过 `obstacle`。`E2E-col-flyover`，PASS。
- **TC-CO-004 角色×普通敌**：重叠受 1 伤；敌不因接触消失。`E2E-col-enemy`，PASS。
- **TC-CO-005 子弹×敌**：命中扣 HP；非穿透子弹 `active=false`；用缩小受击盒。`E2E-dmg-bullet` 覆盖，PASS。
- **TC-CO-006 导弹穿透**：见 TC-DM-003。
- **TC-CO-007 子弹×障碍无碰撞**：`handleProjectileCollisions` 跳过 `obstacle`；子弹继续飞、障碍 HP 不变。`E2E-col-bullet-obstacle`，PASS。
- **TC-CO-008 Boss 导弹×角色**：见 TC-DM-009。
- **TC-CO-009 受击盒精度**：边缘外 1px 不误判（`utils.test` + e2e 近边采样）。`UNIT`，`PASS`。
- **TC-CO-010 连续碰撞防叠加**：同帧多敌接触只触发一次（无敌生效）。`E2E-col-multi`，PASS。

---

## 五、游戏玩法 (Gameplay)

- **TC-GP-001 完整单局**：Menu→Game→(LevelUp)→GameOver 全流程贯通。`E2E-flow`，PASS。
- **TC-GP-002 自动前进与提速**：`gameSpeed=clamp(2.5+tier*0.3,2.5,8)`；tier=`floor(meters/800)`。`E2E-speed` + `UNIT`，PASS。
  - 注 CORR-3：里程累积约 250m/s，提速极快（平衡缺陷，待定级）。
- **TC-GP-003 生成规则**：0–300m 仅障碍+普通；≥300m 加精英；≥1200m 出 Boss。
  生成冷却 `800–1500ms`（CORR-2）；最小间距普通 160 / Boss 260（CORR-1，非 PRD 650）。`E2E-spawn` + `UNIT`，PASS。
- **TC-GP-004 Boss 间隔**：首次 1200m；之后 `+1200m` 或 `+90s`；同时只允许一个 Boss。`E2E-boss-interval`/`UNIT`，PASS。
- **TC-GP-005 升级选卡流程**：达阈值暂停弹 3 张不重复卡，选后立即生效并恢复；已满上限卡不入候选。`E2E-levelup-flow`，PASS。
- **TC-GP-006 连续升级积压**：`pendingLevelUps≥2` 时逐次刷新候选直至 0，再恢复。`E2E-levelup-stack`，PASS。
- **TC-GP-007 稀有度倾向**：`luckyCount>0` 时稀有/史诗占比上升（相对断言，非精确比例）。`UNIT`，`PASS`。
- **TC-GP-008 结束条件**：`life<=0`→GAMEOVER、停 BGM、播 `gameover`、弹结算（数据正确）。`E2E-gameover`，PASS。
- **TC-GP-009 重开重置**：见 TC-OP-013。
- **TC-GP-010 障碍不可摧毁**：子弹/导弹不伤障碍（碰撞跳过）。`E2E-col-bullet-obstacle` 覆盖，PASS。
- **TC-GP-011 Boss 行为**：左移 `speedScale=0.82`；每 1.2s 发弹；头顶 HP 条实时更新。`E2E-boss-behavior`，PASS。
- **TC-GP-012 Boss 击杀反馈**：大爆炸（半径 96）、`hitStopMs=320`、公告「Boss Down」、经验 30、得分 200、Boss 击杀 +1。`E2E-boss-kill`，PASS。

---

## 六、叙事与流程 (Flow)

- **TC-NR-001 场景顺序**：Boot→Menu→Game，无黑屏/闪烁。`E2E-flow` 覆盖，PASS。
- **TC-NR-002 资源完整性**：20 图 + 8 音频全部加载（核实 `BootScene` 数量准确）。`E2E-assets`，PASS。
- **TC-NR-003 公告 Boss**：「Boss Incoming」显示 1600ms + `boss_spawn` 音效。`E2E-boss-behavior` 覆盖，PASS。
- **TC-NR-004 公告 升级**：显示卡名（飞行→「Flight Online」），1600ms 消失。`E2E-levelup-flow` 覆盖，PASS。
- **TC-NR-005 难度阶段**：随距离提速 + 生成频率上升 + 精英/Boss 介入。`MANUAL/观察`。
- **TC-NR-006 暂停连贯**：暂停/恢复后实体位置/速度/HP/计时续接一致。`E2E-resume` 覆盖，PASS。
- **TC-NR-007 结束叙事**：停 BGM→播 `gameover`→结算 6 项数据齐全。`E2E-gameover` 覆盖，PASS。
- **TC-NR-008 构筑摘要**：`upgradeHistory.join(" / ")`；空构筑显示「未成型构筑」。`E2E-gameover` 覆盖，PASS。

---

## 七、性能 (Performance) · 多为 MANUAL/观察

- **TC-PF-001 帧率稳定**：目标 60FPS。`E2E-smoke-fps`（短时近似采样 requestAnimationFrame 间隔，非长时压测）。
- **TC-PF-002 高密度实体**：20+ 实体/10+ 子弹下不显著掉帧。`MANUAL`。
- **TC-PF-003 内存 30min**：增长 < 50MB。`MANUAL`。
- **TC-PF-004 加载 < 3s**：`E2E-smoke-fps` 顺带记录 Boot→Menu 时长。
- **TC-PF-005 实体清理**：`cleanup()` 及时 `destroy` 离屏对象，数组不无限增长。`E2E-cleanup`（运行后断言数组长度有界），PASS。
- **TC-PF-006/007/008 低/高端/移动端**：`MANUAL`。
  - 注 TC-PF-007：`deltaMs=Math.min(delta,50)` 限制时间跳跃（`UNIT` 可验证该纯逻辑）。

---

## 八、稳定性 (Stability)

- **TC-ST-001 长时间运行 60min**：`MANUAL`（e2e 仅做 ≥60s 冒烟无崩溃）。`E2E-smoke-run`，PASS。
- **TC-ST-002 快速连按**：高频 `Space/K/L` 不崩溃、冷却生效、子弹数不爆。`E2E-stress-input`，PASS。
- **TC-ST-003 暂停/恢复循环**：多次 P 切换无场景叠加、BGM 正常。`E2E-pause-cycle`，PASS。
- **TC-ST-004 多次重开循环**：每次重开干净、无残留实体。`E2E-restart-cycle`，PASS。
- **TC-ST-005 候选池近空**：仅 `missile-supply`/`flight-module` 无上限时，候选 `length<=3` 直接返回，不崩溃。`UNIT`，`PASS`。
- **TC-ST-006 极端距离**：`gameSpeed` 被 clamp 至 8；得分不溢出。`E2E-extreme-distance`/`UNIT`，PASS。
- **TC-ST-007 极端等级**：`nextLevelExp=level*10` 线性、HUD 正常。`UNIT`，PASS。
- **TC-ST-008 大量爆炸**：爆炸 240ms 后消退、`cleanup` 清理。`E2E-cleanup` 覆盖，PASS。
- **TC-ST-009 飞行落障**：NI-1 已实现就近安全落点 —— 落点有障碍时悬停、清除后落地、不受伤。`E2E-flight-land` + `TC-ST-009b`，PASS。
- **TC-ST-010 标签页切换**：切回无时间跳跃（`deltaMs` 限幅）。`MANUAL`。
- **TC-ST-011 窗口缩放**：`Scale.FIT+CENTER_BOTH` 适配不变形。`MANUAL/截图`。
- **TC-ST-012 音频上下文恢复**：首次交互后 BGM 正常。`MANUAL`（headless 自动放行）。

---

## 附录 A：e2e ↔ 用例 映射

e2e 套件位于 `tests/e2e/`，由 `playwright.config.ts` 驱动，对 `yarn dev` 真机执行。
每个 `E2E-xxx` 标识对应一个 `test()`；运行后回填上文「状态」。

## 附录 B：单测重构说明

- 保留：`utils.test.ts`、`upgrade-system.test.ts`（测真实模块）。
- 重构：原 `constants/game-logic/edge-cases.test.ts` 的自证/重写逻辑 →
  抽取 `src/systems/HeroLogic.ts`（纯函数：受击抵扣/经验/得分/默认 hero）后，单测改为调用真实实现。


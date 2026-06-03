import { CONFIG, GameState } from "../constants";
import { UpgradeCard, Rarity, HeroStats, GameSummary } from "../types";
import { clamp, weightedChoice } from "../utils";

export const UPGRADE_DEFINITIONS: UpgradeCard[] = [
  {
    id: "fire-up",
    name: "火力升级",
    rarity: "common",
    description: "单次发射子弹数 +1，最高到 Lv5。",
    eligible: (h) => h.fireLevel < 5,
  },
  {
    id: "shoot-speed",
    name: "射速升级",
    rarity: "common",
    description: "普通射击冷却 -0.02 秒，最低 0.10 秒。",
    eligible: (h) => h.shootCooldownMs > 100,
  },
  {
    id: "bullet-boost",
    name: "子弹强化",
    rarity: "rare",
    description: "普通子弹伤害 +1，最多叠加 4 次。",
    eligible: (h) => h.bulletDamageBonus < 4,
  },
  {
    id: "missile-supply",
    name: "导弹补给",
    rarity: "common",
    description: "导弹 +5。",
    eligible: () => true,
  },
  {
    id: "explosive-warhead",
    name: "爆裂弹头",
    rarity: "epic",
    description: "导弹命中时会触发范围爆炸伤害。",
    eligible: (h) => !h.hasExplosiveMissiles,
  },
  {
    id: "life-up",
    name: "生命提升",
    rarity: "common",
    description: "最大生命 +1，当前生命同时 +1。",
    eligible: (h) => h.maxLife < 8,
  },
  {
    id: "armor-up",
    name: "护甲装置",
    rarity: "common",
    description: "护甲 +2，最高 10。",
    eligible: (h) => h.armor < 10,
  },
  {
    id: "emergency-repair",
    name: "紧急修复",
    rarity: "rare",
    description: "恢复 2 点生命，不超过最大生命。",
    eligible: (h) => h.life < h.maxLife,
  },
  {
    id: "resilience",
    name: "韧性提升",
    rarity: "rare",
    description: "受击无敌时间 +0.1 秒，最高 0.8 秒。",
    eligible: (h) => h.invulnerableMs < 800,
  },
  {
    id: "lightweight",
    name: "轻量化",
    rarity: "common",
    description: "跳跃高度提升 15%，最多 3 次。",
    eligible: (h) => h.jumpScaleCount < 3,
  },
  {
    id: "flight-module",
    name: "飞行模块",
    rarity: "epic",
    description: "立即进入 10 秒飞行状态。",
    eligible: () => true,
  },
  {
    id: "flight-endurance",
    name: "飞行续航",
    rarity: "rare",
    description: "飞行持续时间 +3 秒，最高 19 秒。",
    eligible: (h) => h.flightDurationMs < CONFIG.MAX_FLIGHT_MS,
  },
  {
    id: "jump-jet",
    name: "起跳喷射",
    rarity: "rare",
    description: "起跳速度再提升 10%，最多 3 次。",
    eligible: (h) => h.jumpBoostCount < 3,
  },
  {
    id: "exp-boost",
    name: "经验增幅",
    rarity: "rare",
    description: "击杀经验获取 +20%，最多 3 次。",
    eligible: (h) => h.expBoostCount < 3,
  },
  {
    id: "lucky-search",
    name: "幸运检索",
    rarity: "epic",
    description: "后续升级时更容易刷出稀有和史诗卡。",
    eligible: (h) => h.luckyCount < 2,
  },
  {
    id: "bounty-module",
    name: "赏金模块",
    rarity: "rare",
    description: "击杀得分 +25%，最多 3 次。",
    eligible: (h) => h.bountyCount < 3,
  },
];

export function buildUpgradeChoices(hero: HeroStats): UpgradeCard[] {
  const eligible = UPGRADE_DEFINITIONS.filter((card) => card.eligible(hero));
  if (eligible.length <= 3) return eligible;

  const rarityWeights: Record<Rarity, number> = {
    common: 60,
    rare: 30 + hero.luckyCount * 10,
    epic: 10 + hero.luckyCount * 5,
  };

  const choices: UpgradeCard[] = [];
  const pool = [...eligible];
  while (choices.length < 3 && pool.length > 0) {
    const selected = weightedChoice(
      pool.map((card) => ({ value: card, weight: rarityWeights[card.rarity] ?? 10 }))
    );
    choices.push(selected);
    const index = pool.findIndex((item) => item.id === selected.id);
    pool.splice(index, 1);
  }

  return choices;
}

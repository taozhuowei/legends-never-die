export type Rarity = "common" | "rare" | "epic";

export interface UpgradeCard {
  id: string;
  name: string;
  rarity: Rarity;
  description: string;
  eligible: (hero: HeroStats) => boolean;
}

export interface HeroStats {
  fireLevel: number;
  shootCooldownMs: number;
  bulletDamageBonus: number;
  missileCount: number;
  hasExplosiveMissiles: boolean;
  maxLife: number;
  life: number;
  armor: number;
  invulnerableMs: number;
  invulnerableUntil: number;
  velocityY: number;
  flightRemainingMs: number;
  jumpScaleCount: number;
  jumpBoostCount: number;
  jumpVelocityModifier: number;
  flightDurationMs: number;
  expBoostCount: number;
  luckyCount: number;
  bountyCount: number;
  isFlying: boolean;
  isJumping: boolean;
  level: number;
  exp: number;
  nextLevelExp: number;
  upgradeHistory: string[];
}

export interface GameSummary {
  score: number;
  distance: number;
  kills: number;
  bossKills: number;
  level: number;
  build: string;
}

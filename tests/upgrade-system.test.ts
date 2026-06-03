import { describe, it, expect } from "vitest";
import { UPGRADE_DEFINITIONS, buildUpgradeChoices } from "../src/systems/UpgradeSystem";
import { HeroStats } from "../src/types";
import { CONFIG } from "../src/constants";

function createDefaultHero(): HeroStats {
  return {
    fireLevel: 1,
    shootCooldownMs: CONFIG.SHOOT_COOLDOWN_MS,
    bulletDamageBonus: 0,
    missileCount: 0,
    hasExplosiveMissiles: false,
    maxLife: 3,
    life: 3,
    armor: 0,
    invulnerableMs: CONFIG.INVULNERABLE_MS,
    invulnerableUntil: 0,
    velocityY: 0,
    flightRemainingMs: CONFIG.DEFAULT_FLIGHT_MS,
    jumpScaleCount: 0,
    jumpBoostCount: 0,
    jumpVelocityModifier: 1,
    flightDurationMs: CONFIG.DEFAULT_FLIGHT_MS,
    expBoostCount: 0,
    luckyCount: 0,
    bountyCount: 0,
    isFlying: false,
    isJumping: false,
    level: 1,
    exp: 0,
    nextLevelExp: 10,
    upgradeHistory: [],
  };
}

describe("UPGRADE_DEFINITIONS", () => {
  it("has 16 upgrade cards", () => {
    expect(UPGRADE_DEFINITIONS).toHaveLength(16);
  });

  it("all cards have unique ids", () => {
    const ids = UPGRADE_DEFINITIONS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all cards have valid rarity", () => {
    const validRarities = new Set(["common", "rare", "epic"]);
    for (const card of UPGRADE_DEFINITIONS) {
      expect(validRarities.has(card.rarity)).toBe(true);
    }
  });

  it("all cards have non-empty name and description", () => {
    for (const card of UPGRADE_DEFINITIONS) {
      expect(card.name.length).toBeGreaterThan(0);
      expect(card.description.length).toBeGreaterThan(0);
    }
  });

  it("all cards have an eligible function", () => {
    for (const card of UPGRADE_DEFINITIONS) {
      expect(typeof card.eligible).toBe("function");
    }
  });

  it("expected card ids are present", () => {
    const ids = new Set(UPGRADE_DEFINITIONS.map((c) => c.id));
    const expected = [
      "fire-up", "shoot-speed", "bullet-boost", "missile-supply",
      "explosive-warhead", "life-up", "armor-up", "emergency-repair",
      "resilience", "lightweight", "flight-module", "flight-endurance",
      "jump-jet", "exp-boost", "lucky-search", "bounty-module",
    ];
    for (const id of expected) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it("rarity distribution matches PRD", () => {
    const common = UPGRADE_DEFINITIONS.filter((c) => c.rarity === "common").length;
    const rare = UPGRADE_DEFINITIONS.filter((c) => c.rarity === "rare").length;
    const epic = UPGRADE_DEFINITIONS.filter((c) => c.rarity === "epic").length;
    expect(common).toBe(6);
    expect(rare).toBe(7);
    expect(epic).toBe(3);
  });
});

describe("upgrade eligibility", () => {
  it("fire-up is eligible when fireLevel < 5", () => {
    const hero = createDefaultHero();
    const card = UPGRADE_DEFINITIONS.find((c) => c.id === "fire-up")!;
    expect(card.eligible(hero)).toBe(true);
    hero.fireLevel = 5;
    expect(card.eligible(hero)).toBe(false);
  });

  it("shoot-speed is eligible when cooldown > 100ms", () => {
    const hero = createDefaultHero();
    const card = UPGRADE_DEFINITIONS.find((c) => c.id === "shoot-speed")!;
    expect(card.eligible(hero)).toBe(true);
    hero.shootCooldownMs = 100;
    expect(card.eligible(hero)).toBe(false);
  });

  it("bullet-boost is eligible when bonus < 4", () => {
    const hero = createDefaultHero();
    const card = UPGRADE_DEFINITIONS.find((c) => c.id === "bullet-boost")!;
    expect(card.eligible(hero)).toBe(true);
    hero.bulletDamageBonus = 4;
    expect(card.eligible(hero)).toBe(false);
  });

  it("missile-supply is always eligible", () => {
    const hero = createDefaultHero();
    const card = UPGRADE_DEFINITIONS.find((c) => c.id === "missile-supply")!;
    expect(card.eligible(hero)).toBe(true);
  });

  it("explosive-warhead is eligible only when not yet acquired", () => {
    const hero = createDefaultHero();
    const card = UPGRADE_DEFINITIONS.find((c) => c.id === "explosive-warhead")!;
    expect(card.eligible(hero)).toBe(true);
    hero.hasExplosiveMissiles = true;
    expect(card.eligible(hero)).toBe(false);
  });

  it("life-up is eligible when maxLife < 8", () => {
    const hero = createDefaultHero();
    const card = UPGRADE_DEFINITIONS.find((c) => c.id === "life-up")!;
    expect(card.eligible(hero)).toBe(true);
    hero.maxLife = 8;
    expect(card.eligible(hero)).toBe(false);
  });

  it("armor-up is eligible when armor < 10", () => {
    const hero = createDefaultHero();
    const card = UPGRADE_DEFINITIONS.find((c) => c.id === "armor-up")!;
    expect(card.eligible(hero)).toBe(true);
    hero.armor = 10;
    expect(card.eligible(hero)).toBe(false);
  });

  it("emergency-repair is eligible when life < maxLife", () => {
    const hero = createDefaultHero();
    const card = UPGRADE_DEFINITIONS.find((c) => c.id === "emergency-repair")!;
    expect(card.eligible(hero)).toBe(false);
    hero.life = 1;
    expect(card.eligible(hero)).toBe(true);
  });

  it("resilience is eligible when invulnerableMs < 800", () => {
    const hero = createDefaultHero();
    const card = UPGRADE_DEFINITIONS.find((c) => c.id === "resilience")!;
    expect(card.eligible(hero)).toBe(true);
    hero.invulnerableMs = 800;
    expect(card.eligible(hero)).toBe(false);
  });

  it("lightweight is eligible when jumpScaleCount < 3", () => {
    const hero = createDefaultHero();
    const card = UPGRADE_DEFINITIONS.find((c) => c.id === "lightweight")!;
    expect(card.eligible(hero)).toBe(true);
    hero.jumpScaleCount = 3;
    expect(card.eligible(hero)).toBe(false);
  });

  it("flight-module is always eligible", () => {
    const hero = createDefaultHero();
    const card = UPGRADE_DEFINITIONS.find((c) => c.id === "flight-module")!;
    expect(card.eligible(hero)).toBe(true);
  });

  it("flight-endurance is eligible when duration < 19000ms", () => {
    const hero = createDefaultHero();
    const card = UPGRADE_DEFINITIONS.find((c) => c.id === "flight-endurance")!;
    expect(card.eligible(hero)).toBe(true);
    hero.flightDurationMs = CONFIG.MAX_FLIGHT_MS;
    expect(card.eligible(hero)).toBe(false);
  });

  it("jump-jet is eligible when jumpBoostCount < 3", () => {
    const hero = createDefaultHero();
    const card = UPGRADE_DEFINITIONS.find((c) => c.id === "jump-jet")!;
    expect(card.eligible(hero)).toBe(true);
    hero.jumpBoostCount = 3;
    expect(card.eligible(hero)).toBe(false);
  });

  it("exp-boost is eligible when expBoostCount < 3", () => {
    const hero = createDefaultHero();
    const card = UPGRADE_DEFINITIONS.find((c) => c.id === "exp-boost")!;
    expect(card.eligible(hero)).toBe(true);
    hero.expBoostCount = 3;
    expect(card.eligible(hero)).toBe(false);
  });

  it("lucky-search is eligible when luckyCount < 2", () => {
    const hero = createDefaultHero();
    const card = UPGRADE_DEFINITIONS.find((c) => c.id === "lucky-search")!;
    expect(card.eligible(hero)).toBe(true);
    hero.luckyCount = 2;
    expect(card.eligible(hero)).toBe(false);
  });

  it("bounty-module is eligible when bountyCount < 3", () => {
    const hero = createDefaultHero();
    const card = UPGRADE_DEFINITIONS.find((c) => c.id === "bounty-module")!;
    expect(card.eligible(hero)).toBe(true);
    hero.bountyCount = 3;
    expect(card.eligible(hero)).toBe(false);
  });
});

describe("buildUpgradeChoices", () => {
  it("returns 3 choices for default hero", () => {
    const hero = createDefaultHero();
    const choices = buildUpgradeChoices(hero);
    expect(choices).toHaveLength(3);
  });

  it("returns no duplicate cards", () => {
    const hero = createDefaultHero();
    for (let i = 0; i < 50; i++) {
      const choices = buildUpgradeChoices(hero);
      const ids = choices.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("all returned cards are eligible for the hero", () => {
    const hero = createDefaultHero();
    const choices = buildUpgradeChoices(hero);
    for (const card of choices) {
      expect(card.eligible(hero)).toBe(true);
    }
  });

  it("returns fewer choices when few cards are eligible", () => {
    const hero = createDefaultHero();
    hero.fireLevel = 5;
    hero.shootCooldownMs = 100;
    hero.bulletDamageBonus = 4;
    hero.hasExplosiveMissiles = true;
    hero.maxLife = 8;
    hero.armor = 10;
    hero.invulnerableMs = 800;
    hero.jumpScaleCount = 3;
    hero.jumpBoostCount = 3;
    hero.flightDurationMs = CONFIG.MAX_FLIGHT_MS;
    hero.expBoostCount = 3;
    hero.luckyCount = 2;
    hero.bountyCount = 3;
    const choices = buildUpgradeChoices(hero);
    const eligibleIds = new Set(choices.map((c) => c.id));
    expect(eligibleIds.has("missile-supply")).toBe(true);
    expect(eligibleIds.has("flight-module")).toBe(true);
    expect(choices.length).toBeLessThanOrEqual(3);
  });

  it("returns all eligible cards when 3 or fewer", () => {
    const hero = createDefaultHero();
    hero.fireLevel = 5;
    hero.shootCooldownMs = 100;
    hero.bulletDamageBonus = 4;
    hero.hasExplosiveMissiles = true;
    hero.maxLife = 8;
    hero.armor = 10;
    hero.life = hero.maxLife;
    hero.invulnerableMs = 800;
    hero.jumpScaleCount = 3;
    hero.jumpBoostCount = 3;
    hero.flightDurationMs = CONFIG.MAX_FLIGHT_MS;
    hero.expBoostCount = 3;
    hero.luckyCount = 2;
    hero.bountyCount = 3;
    const choices = buildUpgradeChoices(hero);
    const eligible = UPGRADE_DEFINITIONS.filter((c) => c.eligible(hero));
    expect(choices.length).toBe(eligible.length);
    expect(choices.length).toBeLessThanOrEqual(3);
  });

  it("lucky-search increases rare/epic probability", () => {
    const heroNormal = createDefaultHero();
    const heroLucky = createDefaultHero();
    heroLucky.luckyCount = 2;

    const N = 3000;
    let rareEpicNormal = 0;
    let rareEpicLucky = 0;

    for (let i = 0; i < N; i++) {
      const normalChoices = buildUpgradeChoices(heroNormal);
      const luckyChoices = buildUpgradeChoices(heroLucky);
      for (const c of normalChoices) {
        if (c.rarity === "rare" || c.rarity === "epic") rareEpicNormal++;
      }
      for (const c of luckyChoices) {
        if (c.rarity === "rare" || c.rarity === "epic") rareEpicLucky++;
      }
    }

    expect(rareEpicLucky).toBeGreaterThan(rareEpicNormal);
  });
});

import { describe, it, expect } from "vitest";
import { clamp, randomInt, randomChoice, weightedChoice, rectsOverlap } from "../src/utils";

describe("clamp", () => {
  it("returns value when within range", () => {
    expect(clamp(5, 1, 10)).toBe(5);
  });

  it("returns min when value below range", () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });

  it("returns max when value above range", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("handles min === max", () => {
    expect(clamp(5, 3, 3)).toBe(3);
  });

  it("handles value at boundaries", () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it("handles negative ranges", () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
    expect(clamp(-15, -10, -1)).toBe(-10);
  });
});

describe("randomInt", () => {
  it("returns value within range", () => {
    for (let i = 0; i < 200; i++) {
      const val = randomInt(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThanOrEqual(10);
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it("returns min when min === max", () => {
    for (let i = 0; i < 50; i++) {
      expect(randomInt(7, 7)).toBe(7);
    }
  });

  it("produces both endpoints over many calls", () => {
    const results = new Set<number>();
    for (let i = 0; i < 500; i++) {
      results.add(randomInt(1, 3));
    }
    expect(results.has(1)).toBe(true);
    expect(results.has(2)).toBe(true);
    expect(results.has(3)).toBe(true);
  });
});

describe("randomChoice", () => {
  it("returns an element from the array", () => {
    const arr = [10, 20, 30];
    for (let i = 0; i < 100; i++) {
      expect(arr).toContain(randomChoice(arr));
    }
  });

  it("returns the only element for single-element array", () => {
    expect(randomChoice([42])).toBe(42);
  });
});

describe("weightedChoice", () => {
  it("returns a value from the entries", () => {
    const entries = [
      { value: "a", weight: 1 },
      { value: "b", weight: 1 },
      { value: "c", weight: 1 },
    ];
    const valid = new Set(["a", "b", "c"]);
    for (let i = 0; i < 100; i++) {
      expect(valid.has(weightedChoice(entries))).toBe(true);
    }
  });

  it("always returns the only entry", () => {
    const entries = [{ value: "solo", weight: 10 }];
    for (let i = 0; i < 50; i++) {
      expect(weightedChoice(entries)).toBe("solo");
    }
  });

  it("respects weight distribution within tolerance", () => {
    const entries = [
      { value: "common", weight: 60 },
      { value: "rare", weight: 30 },
      { value: "epic", weight: 10 },
    ];
    const counts: Record<string, number> = { common: 0, rare: 0, epic: 0 };
    const N = 10000;
    for (let i = 0; i < N; i++) {
      counts[weightedChoice(entries)]++;
    }
    expect(counts.common / N).toBeGreaterThan(0.5);
    expect(counts.rare / N).toBeGreaterThan(0.2);
    expect(counts.epic / N).toBeGreaterThan(0.03);
  });

  it("handles zero-weight entries gracefully", () => {
    const entries = [
      { value: "zero", weight: 0 },
      { value: "one", weight: 1 },
    ];
    for (let i = 0; i < 50; i++) {
      expect(weightedChoice(entries)).toBe("one");
    }
  });
});

describe("rectsOverlap", () => {
  it("detects overlapping rectangles", () => {
    const a = { x: 0, y: 0, width: 50, height: 50 };
    const b = { x: 25, y: 25, width: 50, height: 50 };
    expect(rectsOverlap(a, b)).toBe(true);
  });

  it("detects non-overlapping rectangles", () => {
    const a = { x: 0, y: 0, width: 50, height: 50 };
    const b = { x: 100, y: 100, width: 50, height: 50 };
    expect(rectsOverlap(a, b)).toBe(false);
  });

  it("returns false for edge-touching rectangles (no overlap)", () => {
    const a = { x: 0, y: 0, width: 50, height: 50 };
    const b = { x: 50, y: 0, width: 50, height: 50 };
    expect(rectsOverlap(a, b)).toBe(false);
  });

  it("returns false for corner-touching rectangles", () => {
    const a = { x: 0, y: 0, width: 50, height: 50 };
    const b = { x: 50, y: 50, width: 50, height: 50 };
    expect(rectsOverlap(a, b)).toBe(false);
  });

  it("detects full containment", () => {
    const a = { x: 0, y: 0, width: 100, height: 100 };
    const b = { x: 10, y: 10, width: 20, height: 20 };
    expect(rectsOverlap(a, b)).toBe(true);
  });

  it("detects partial vertical overlap", () => {
    const a = { x: 0, y: 0, width: 50, height: 50 };
    const b = { x: 25, y: 0, width: 50, height: 50 };
    expect(rectsOverlap(a, b)).toBe(true);
  });

  it("detects partial horizontal overlap", () => {
    const a = { x: 0, y: 0, width: 50, height: 50 };
    const b = { x: 0, y: 25, width: 50, height: 50 };
    expect(rectsOverlap(a, b)).toBe(true);
  });

  it("returns false for rectangles separated vertically", () => {
    const a = { x: 0, y: 0, width: 50, height: 50 };
    const b = { x: 0, y: 50, width: 50, height: 50 };
    expect(rectsOverlap(a, b)).toBe(false);
  });
});

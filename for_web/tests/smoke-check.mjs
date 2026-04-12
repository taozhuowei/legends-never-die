import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(process.cwd());

const filesToParse = [
  "js/utils.js",
  "js/audio.js",
  "js/input.js",
  "js/bullet.js",
  "js/enemy.js",
  "js/hero.js",
  "js/game.js",
  "js/main.js",
];

for (const relativePath of filesToParse) {
  const absolutePath = path.join(root, relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  try {
    new vm.Script(source, { filename: absolutePath });
  } catch (error) {
    console.error(`Syntax error in ${relativePath}`);
    throw error;
  }
}

const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const requiredIds = [
  "game-canvas",
  "btn-start",
  "pause-screen",
  "levelup-screen",
  "upgrade-cards",
  "gameover-screen",
];

for (const id of requiredIds) {
  if (!indexHtml.includes(`id="${id}"`)) {
    throw new Error(`Missing required DOM id: ${id}`);
  }
}

const gameSource = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
if (!gameSource.includes("LEVELUP")) {
  throw new Error("Game state should include LEVELUP.");
}
if (!gameSource.includes("currentUpgradeChoices")) {
  throw new Error("Game should expose upgrade choices.");
}
if (!gameSource.includes("Boss Incoming")) {
  throw new Error("Game should announce boss encounters.");
}

const mainSource = fs.readFileSync(path.join(root, "js/main.js"), "utf8");
if (!mainSource.includes("window.render_game_to_text")) {
  throw new Error("Main should expose render_game_to_text.");
}
if (!mainSource.includes("window.advanceTime")) {
  throw new Error("Main should expose advanceTime.");
}

console.log("Smoke checks passed.");

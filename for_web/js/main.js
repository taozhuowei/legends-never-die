(function bootstrap() {
  const canvas = document.getElementById("game-canvas");
  const startScreen = document.getElementById("start-screen");
  const pauseScreen = document.getElementById("pause-screen");
  const levelupScreen = document.getElementById("levelup-screen");
  const gameoverScreen = document.getElementById("gameover-screen");
  const upgradeCards = document.getElementById("upgrade-cards");
  const levelupCopy = document.getElementById("levelup-copy");

  const btnStart = document.getElementById("btn-start");
  const btnResume = document.getElementById("btn-resume");
  const btnRestart = document.getElementById("btn-restart");
  const btnRestartPause = document.getElementById("btn-restart-pause");

  let game = null;
  let gameLoop = null;
  let automationMode = false;

  function setScreenVisibility(screen, visible) {
    screen.classList.toggle("hidden", !visible);
  }

  function refreshScreens(state) {
    setScreenVisibility(startScreen, state === GAME_STATE.START);
    setScreenVisibility(pauseScreen, state === GAME_STATE.PAUSED);
    setScreenVisibility(levelupScreen, state === GAME_STATE.LEVELUP);
    setScreenVisibility(gameoverScreen, state === GAME_STATE.GAMEOVER);

    if (state !== GAME_STATE.PLAYING && state !== GAME_STATE.START) {
      input.clearTransientState();
    }
  }

  function renderUpgradeCards(cards, pendingLevelUps) {
    upgradeCards.replaceChildren();

    if (!cards || cards.length === 0) {
      levelupCopy.textContent = "没有可选卡片。";
      return;
    }

    levelupCopy.textContent = pendingLevelUps > 1
      ? `按 1 / 2 / 3 或点击卡片。剩余 ${pendingLevelUps} 次升级选择。`
      : "按 1 / 2 / 3 或直接点击卡片。";

    cards.forEach((card, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "upgrade-card";
      button.dataset.rarity = card.rarity;
      button.innerHTML = `
        <kbd>${index + 1}</kbd>
        <h3>${card.name}</h3>
        <p>${card.description}</p>
        <div class="upgrade-rarity">${card.rarity}</div>
      `;
      button.addEventListener("click", () => {
        game.chooseUpgrade(index);
        if (game.state === GAME_STATE.PLAYING && !automationMode) {
          gameLoop.start();
        }
      });
      upgradeCards.appendChild(button);
    });
  }

  function updateGameOver(summary) {
    document.getElementById("final-score").innerHTML = `最终得分 <strong>${summary.score}</strong>`;
    document.getElementById("final-distance").innerHTML = `跑酷距离 <strong>${summary.distance}m</strong>`;
    document.getElementById("final-kills").innerHTML = `击杀总数 <strong>${summary.kills}</strong>`;
    document.getElementById("final-boss-kills").innerHTML = `Boss 击杀 <strong>${summary.bossKills}</strong>`;
    document.getElementById("final-level").innerHTML = `最终等级 <strong>Lv.${summary.level}</strong>`;
    document.getElementById("final-build").innerHTML = `本局构筑 <strong>${summary.build}</strong>`;
  }

  function startRun() {
    automationMode = false;
    game.start();
    game.render();
    refreshScreens(game.state);
    gameLoop.start();
  }

  function restartRun() {
    automationMode = false;
    game.restart();
    game.render();
    refreshScreens(game.state);
    gameLoop.start();
  }

  function bindControls() {
    btnStart.addEventListener("click", startRun);
    btnResume.addEventListener("click", () => {
      game.resume();
      refreshScreens(game.state);
      if (!automationMode) {
        gameLoop.start();
      }
    });
    btnRestart.addEventListener("click", restartRun);
    btnRestartPause.addEventListener("click", restartRun);

    document.addEventListener("keydown", (event) => {
      if (!game) {
        return;
      }

      if (game.state === GAME_STATE.START) {
        if (event.code === "Enter" || event.code === "Space") {
          event.preventDefault();
          startRun();
        }
        return;
      }

      if (game.state === GAME_STATE.LEVELUP) {
        if (["Digit1", "Digit2", "Digit3"].includes(event.code)) {
          const choiceIndex = Number(event.code.replace("Digit", "")) - 1;
          game.chooseUpgrade(choiceIndex);
          if (game.state === GAME_STATE.PLAYING && !automationMode) {
            gameLoop.start();
          }
        }
        return;
      }

      if (event.code === "KeyP" || event.code === "Escape") {
        event.preventDefault();
        if (game.state === GAME_STATE.PLAYING) {
          game.pause();
          refreshScreens(game.state);
          gameLoop.stop();
        } else if (game.state === GAME_STATE.PAUSED) {
          game.resume();
          refreshScreens(game.state);
          if (!automationMode) {
            gameLoop.start();
          }
        }
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        game.jump();
      } else if (event.code === "KeyK") {
        game.shoot();
      } else if (event.code === "KeyL") {
        game.fireMissile();
      }
    });

    input.bindVirtualButtons({
      jump: () => game?.jump(),
      shoot: () => game?.shoot(),
      missile: () => game?.fireMissile(),
    });
  }

  function exposeAutomationApi() {
    window.render_game_to_text = () => game.getTextSnapshot();
    window.advanceTime = (ms) => {
      automationMode = true;
      gameLoop.stop();
      return game.advanceTime(ms);
    };
    window.__game = game;
  }

  async function init() {
    const assets = new AssetLoader();
    await assets.loadAll();

    game = new Game(canvas, assets);
    gameLoop = createGameLoop((deltaMs) => game.update(deltaMs), () => game.render());
    game.setHooks({
      onStateChange: (state) => {
        refreshScreens(state);
        if (state === GAME_STATE.LEVELUP || state === GAME_STATE.GAMEOVER) {
          gameLoop.stop();
        }
      },
      onUpgradeChoices: renderUpgradeCards,
      onGameOver: updateGameOver,
    });

    bindControls();
    exposeAutomationApi();
    refreshScreens(game.state);
    game.render();
  }

  init().catch((error) => {
    console.error(error);
    alert("游戏初始化失败，请刷新后重试。");
  });
})();

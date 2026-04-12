Original prompt: 依据PRD，修改web端游戏，然后自动测试，没问题就启动让我看看

2026-03-22
- Read PRD and audited the current web build.
- Current web version diverges from PRD in core progression: random instant buffs instead of pause-and-pick upgrade cards.
- Current project also has malformed/garbled UI/config text and likely syntax issues in several browser files.
- Plan is to keep the existing Canvas/Vite stack, implement the missing PRD gameplay loop, add deterministic test hooks, then run browser automation and launch a local server.
- Replaced the core browser implementation with a PRD-aligned loop:
  start/pause/gameover/levelup states, three-card level-up picks, elite/Boss encounters, PRD score model, build summary, and deterministic browser hooks.
- Added a lightweight smoke check script that parses the browser files and verifies required DOM hooks.
- Browser automation passed on the local Vite server:
  start -> jump -> shoot kill -> pause/resume -> level-up pick -> lethal hit -> game over.
- Visual checks captured for gameplay and level-up overlays; local server is serving at http://127.0.0.1:4173.

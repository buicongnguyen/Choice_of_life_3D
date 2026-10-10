import { installMobileGameSupport } from './mobile-game-support.mjs';
installMobileGameSupport({
  "menus": [
    ".title-card",
    ".modal.pause",
    ".sheet.settings"
  ],
  "controls": [
    ".stick",
    ".hud-bottom"
  ],
  "classifyCanvasTaps": false
});

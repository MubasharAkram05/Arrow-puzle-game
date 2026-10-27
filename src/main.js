import './styles/index.css';
import { bindBoardInput } from './input/board-input.js';
import { loadSave } from './storage/save.js';
import { bindGameOver } from './ui/modals/gameover.js';
import { bindCloseButtons } from './ui/modals/modal.js';
import { bindSettings, openSettings } from './ui/modals/settings.js';
import { bindVictory } from './ui/modals/victory.js';
import { bindGameScreen } from './ui/screens/game.js';
import { bindHome, goHome } from './ui/screens/home.js';
import { bindLevels } from './ui/screens/levels.js';
import { applyTheme, watchSystemTheme } from './ui/theme.js';
import { $ } from './ui/dom.js';

/** App entry: load save, apply theme, wire every screen, show home. */
function boot() {
  loadSave();
  applyTheme();
  watchSystemTheme();
  bindBoardInput();
  bindGameScreen();
  bindHome();
  bindLevels();
  bindSettings();
  bindGameOver();
  bindVictory();
  bindCloseButtons();
  $('btn-home-settings').addEventListener('click', openSettings);
  goHome();
}

boot();

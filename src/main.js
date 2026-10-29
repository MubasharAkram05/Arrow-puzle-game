import './styles/index.css';
import { initBackButton } from './input/back-button.js';
import { mountCurrencyBars } from './ui/components/currencyBar.js';
import { mountIcons } from './ui/components/icons.js';
import { bindAsk } from './ui/modals/ask.js';
import { bindBoardInput } from './input/board-input.js';
import { loadSave } from './storage/save.js';
import { bindGameOver } from './ui/modals/gameover.js';
import { bindCloseButtons } from './ui/modals/modal.js';
import { bindSettings, openSettings } from './ui/modals/settings.js';
import { bindVictory } from './ui/modals/victory.js';
import { bindGameScreen } from './ui/screens/game.js';
import { bindHome, goHome } from './ui/screens/home.js';
import { bindLevels, openLevels } from './ui/screens/levels.js';
import { bindProfile, openProfile } from './ui/screens/profileScreen.js';
import { bindShop, openShop } from './ui/screens/shop/index.js';
import { mountBottomNav } from './ui/components/bottomNav.js';
import { startPlayClock } from './ui/screens/game.js';
import { bindBoosterBar } from './ui/screens/boosterBar.js';
import { applyTheme, watchSystemTheme } from './ui/theme.js';
import { $ } from './ui/dom.js';

/** App entry: load save, apply theme, wire every screen, show home. */
function boot() {
  mountIcons();
  loadSave();
  applyTheme();
  watchSystemTheme();
  bindBoardInput();
  bindGameScreen();
  bindBoosterBar();
  bindHome();
  bindLevels();
  bindShop();
  bindProfile();
  bindSettings();
  bindGameOver();
  bindVictory();
  bindAsk();
  bindCloseButtons();
  mountCurrencyBars();
  $('btn-home-settings').addEventListener('click', openSettings);
  mountBottomNav({
    'screen-home': goHome,
    'screen-levels': () => openLevels(true),
    'screen-shop': openShop,
    'screen-profile': openProfile,
  });
  startPlayClock();
  initBackButton();
  goHome();
}

boot();

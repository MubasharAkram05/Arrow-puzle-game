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
import { applyTheme, watchSystemTheme } from './ui/theme.js';
import { $ } from './ui/dom.js';
import { loadShapeLibrary } from './engine/index.js';
import { noteDailyOpen } from './game/rewards.js';
import { saveProgress } from './storage/save.js';
import { state } from './game/state.js';
import { toast } from './ui/components/toast.js';
import { maybeShowDaily } from './ui/modals/daily.js';
import { renderHome } from './ui/screens/home.js';

/** Removed boosters were paid back on load: say so once, then forget it. */
function announceRefund() {
  const r = state.pendingRefund;
  if (!r) return;
  const parts = [r.coins && `${r.coins} coins`, r.diamonds && `${r.diamonds} diamond${r.diamonds > 1 ? 's' : ''}`];
  toast(`Boosters removed, refunded ${parts.filter(Boolean).join(' / ')}`);
  state.pendingRefund = null;
  saveProgress();
}

/** App entry: load save, apply theme, wire every screen, show home. */
function boot() {
  mountIcons();
  loadSave();
  noteDailyOpen();
  saveProgress();
  applyTheme();
  watchSystemTheme();
  bindBoardInput();
  bindGameScreen();
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
  announceRefund();
  // back in front on a new day: the daily reward may be waiting
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    noteDailyOpen();
    saveProgress();
    if ($('screen-home').classList.contains('active')) {
      renderHome();
      maybeShowDaily();
    }
  });
  // the shape library is a separate chunk: fetch it once the home screen is up
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200));
  idle(() => loadShapeLibrary().catch(() => {}));
}

boot();

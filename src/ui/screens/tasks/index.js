/**
 * Tasks screen (3.23.0): one place for everything to claim, behind the Tasks tab in the bottom nav.
 * A segmented control switches between Weekly (the Weekly Quests) and Achievements (the permanent list,
 * moved here from Profile). Each tab has a red dot when it has something to claim; the nav icon too.
 */
import { taskDots } from '../../../game/taskDots.js';
import { achievementRows } from '../../../game/achievementList.js';
import { syncQuests } from '../../../game/questState.js';
import { achievementContext } from '../../../game/rewards.js';
import { state } from '../../../game/state.js';
import { saveProgress } from '../../../storage/save.js';
import { renderNavDots } from '../../components/bottomNav.js';
import { segmented } from '../../components/segmented.js';
import { $ } from '../../dom.js';
import { onReturn, openTab } from '../../navigation.js';
import { achievementsSkeleton, bindAchievements, renderAchievements } from './achievementsList.js';
import { bindQuests, renderQuests } from './weekly.js';

export const TASK_TABS = Object.freeze(['weekly', 'achievements']);

const seg = segmented({
  name: 'tasks',
  label: 'Task lists',
  tabs: [
    { id: 'weekly', label: 'Weekly' },
    { id: 'achievements', label: 'Achievements' },
  ],
  storeKey: 'arrowEscape:tasksTab',
  scrollId: 'tasks-body',
});

/** Tab dots and the nav dot. */
function renderDots() {
  const d = taskDots(state.quests, Date.now(), achievementRows(achievementContext(), state.claimed));
  seg.setDots({ weekly: d.weekly, achievements: d.achievements });
  renderNavDots();
}

/** Redraw both tabs. */
function renderTasks() {
  renderQuests();
  renderAchievements();
  renderDots();
}

/**
 * Open the Tasks tab.
 * @param {'weekly'|'achievements'} [tab] a tab to show (otherwise the last one used)
 */
export function openTasks(tab) {
  if (syncQuests()) saveProgress();
  seg.show(TASK_TABS.includes(tab) ? tab : seg.active());
  renderTasks();
  openTab('screen-tasks');
}

/** Build and wire the screen once. */
export function bindTasks() {
  $('tasks-body').innerHTML = seg.html({
    weekly: '<div id="weekly-body"></div>',
    achievements: achievementsSkeleton(),
  });
  seg.bind(() => renderDots());
  bindQuests(renderDots);
  bindAchievements(renderDots);
  onReturn('screen-tasks', renderTasks);
}

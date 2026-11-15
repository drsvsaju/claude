// The named screens shots.mjs takes. `run` is page-side code (the demo account is signed in unless loggedOut).
// Keep ids stable: before/after pairs are matched by id.
const tab = (t, extra = '') => `${extra} showTab('${t}');`;
const dlg = code => `${code}`;
export const SCREENS = [
  // ---------- logged out ----------
  { id: 'welcome', group: 'Welcome', title: 'Welcome page', loggedOut: true, fullPage: true, run: `window.scrollTo(0, 0);`, cap: 5200 },
  { id: 'welcome-signup', group: 'Welcome', title: 'Sign-up card', loggedOut: true, viewport: true, run: `if (typeof lpOpenAuth === 'function') lpOpenAuth('signup');` },
  { id: 'welcome-login', group: 'Welcome', title: 'Log-in card', loggedOut: true, viewport: true, run: `if (typeof lpOpenAuth === 'function') lpOpenAuth('login');` },
  // ---------- timer ----------
  { id: 'timer', group: 'Timer', title: 'Timer (idle)', run: tab('timer') },
  { id: 'timer-running', group: 'Timer', title: 'Timer (focus running)', viewport: true, fresh: true, run: `showTab('timer'); const t = S.timer; t.phase = 'focus'; t.status = 'idle'; startTimer();`, wait: 1800 },
  { id: 'timer-overtime', group: 'Timer', title: 'Timer (overtime)', viewport: true, fresh: true, run: `showTab('timer'); S.settings.overtime = true; const t = S.timer; t.phase = 'focus'; t.status = 'idle'; startTimer(); t.planned = 60000; t.focusStartedAt = Date.now() - 4 * 60000; t.endAt = Date.now() - 3 * 60000;`, wait: 2200 },
  { id: 'timer-break', group: 'Timer', title: 'Timer (break)', viewport: true, fresh: true, run: `showTab('timer'); const t = S.timer; t.phase = 'short'; t.status = 'idle'; renderTimer(); startTimer();`, wait: 1500 },
  { id: 'preset-manager', group: 'Timer', title: 'Preset manager', viewport: true, run: `showTab('timer'); $('#managePresets').click();` },
  { id: 'rank-ladder', group: 'Timer', title: 'Rank ladder', viewport: true, run: `showTab('timer'); openRankLadder();` },
  // ---------- reminders ----------
  { id: 'reminders', group: 'Reminders', title: 'Reminders', run: `S.ui.remView = 'rem'; showTab('reminders');` },
  { id: 'todo', group: 'Reminders', title: 'To-do', run: `S.ui.remView = 'todo'; showTab('reminders');` },
  { id: 'flashcards', group: 'Reminders', title: 'Flashcards', run: `S.ui.remView = 'cards'; showTab('reminders');` },
  { id: 'reminder-form', group: 'Reminders', title: 'New reminder', viewport: true, run: `S.ui.remView = 'rem'; showTab('reminders'); openRemForm();` },
  { id: 'todo-form', group: 'Reminders', title: 'New task', viewport: true, run: `S.ui.remView = 'todo'; showTab('reminders'); openTodoForm();` },
  { id: 'exams', group: 'Reminders', title: 'Exams', viewport: true, run: `showTab('timer'); openExams();` },
  { id: 'templates', group: 'Reminders', title: 'Subtask templates', viewport: true, run: `showTab('timer'); openTemplates();` },
  { id: 'plan', group: 'Reminders', title: 'Weekly plan', viewport: true, run: `showTab('stats'); openPlanDlg();` },
  { id: 'flashcard-review', group: 'Reminders', title: 'Flashcard review', viewport: true, run: `S.ui.remView = 'cards'; showTab('reminders'); startReview(S.decks[0] && S.decks[0].id);` },
  // ---------- stats ----------
  { id: 'stats-day', group: 'Stats', title: 'Stats · day', run: `S.ui.statsView = 'day'; showTab('stats');` },
  { id: 'stats-week', group: 'Stats', title: 'Stats · week', run: `S.ui.statsView = 'week'; showTab('stats');` },
  { id: 'stats-month', group: 'Stats', title: 'Stats · month', run: `S.ui.statsView = 'month'; showTab('stats');` },
  { id: 'stats-year', group: 'Stats', title: 'Stats · year', run: `S.ui.statsView = 'year'; showTab('stats');` },
  { id: 'wrapped', group: 'Stats', title: 'Wrapped', viewport: true, run: `showTab('stats'); openWrapped(0);`, after: `const w = document.getElementById('wrapped'); if (w && !w.classList.contains('hidden') && typeof closeWrapped === 'function') closeWrapped();` },
  // ---------- quests ----------
  { id: 'quests-boss', group: 'Quests', title: 'Quests · weekly boss', run: `S.ui.questView = 'boss'; showTab('quests');` },
  { id: 'quests-questline', group: 'Quests', title: 'Quests · questline', run: `S.ui.questView = 'quest'; showTab('quests');` },
  { id: 'quests-pass', group: 'Quests', title: 'Quests · Study Pass', run: `S.ui.questView = 'pass'; showTab('quests');` },
  { id: 'quests-board', group: 'Quests', title: 'Quests · quest board', run: `S.ui.questView = 'board'; showTab('quests');` },
  { id: 'squad', group: 'Quests', title: 'Squad dialog', viewport: true, run: `S.ui.questView = 'boss'; showTab('quests'); openSquad();` },
  // ---------- garden / room ----------
  { id: 'garden', group: 'Garden', title: 'Garden', run: `S.ui.gardenView = 'garden'; showTab('garden');` },
  { id: 'garden-harvests', group: 'Garden', title: 'Garden · harvests', run: `S.ui.gardenView = 'harvests'; showTab('garden');` },
  { id: 'garden-seeds', group: 'Garden', title: 'Garden · seed shop', run: `S.ui.gardenView = 'seeds'; showTab('garden');` },
  { id: 'garden-decor', group: 'Garden', title: 'Garden · looks and decor', run: `S.ui.gardenView = 'decor'; showTab('garden');` },
  { id: 'garden-plant', group: 'Garden', title: 'Plant dialog', viewport: true, run: `S.ui.gardenView = 'garden'; showTab('garden'); const p = garden().growing[0]; if (p) openPlantDlg(p.id);` },
  { id: 'garden-pets', group: 'Garden', title: 'Pets dialog', viewport: true, run: `S.ui.gardenView = 'garden'; showTab('garden'); openPetsDlg();` },
  { id: 'room', group: 'Garden', title: 'Pomeo’s room', run: tab('room') },
  // ---------- shop / bag ----------
  { id: 'shop', group: 'Shop', title: 'Shop', run: tab('shop') },
  { id: 'bag', group: 'Shop', title: 'Bag', run: tab('bag'), after: `showTab('timer');` },
  // ---------- social ----------
  { id: 'friends', group: 'Social', title: 'Friends', run: `S.ui.friendsView = 'friends'; showTab('friends');` },
  { id: 'friends-challenges', group: 'Social', title: 'Friends · challenges', run: `S.ui.friendsView = 'challenges'; showTab('friends');` },
  { id: 'friend-profile', group: 'Social', title: 'A friend’s profile', run: `S.ui.friendsView = 'friends'; showTab('friends'); await openFriend('demo_f1');`, wait: 1800 },
  { id: 'posts', group: 'Social', title: 'Posts', run: tab('posts'), wait: 1800 },
  { id: 'sessions', group: 'Social', title: 'Study sessions', run: tab('sessions'), wait: 1800 },
  { id: 'session-host', group: 'Social', title: 'Host a session', viewport: true, run: `showTab('sessions'); openHostSheet();` },
  { id: 'clan', group: 'Social', title: 'Clan', run: tab('clan'), wait: 2000 },
  { id: 'clan-schedule', group: 'Social', title: 'Clan · schedule a session', viewport: true, run: `showTab('clan'); openClanSched();` },
  { id: 'clan-shop', group: 'Social', title: 'Clan shop', viewport: true, run: `showTab('clan'); openClanShop();` },
  { id: 'clan-settings', group: 'Social', title: 'Clan settings', viewport: true, run: `showTab('clan'); openClanSettings();` },
  { id: 'leaderboard', group: 'Social', title: 'Leaderboard', run: tab('board'), wait: 2000 },
  // ---------- profile / settings ----------
  { id: 'profile', group: 'Profile', title: 'Profile', run: tab('profile'), cap: 4200 },
  { id: 'profile-card', group: 'Profile', title: 'Player card editor', viewport: true, run: `showTab('profile'); openCardDlg();` },
  { id: 'collection', group: 'Profile', title: 'Collection log', viewport: true, run: `showTab('profile'); openCollection();` },
  { id: 'settings', group: 'Settings', title: 'Settings', run: tab('settings'), cap: 6000 },
  { id: 'about', group: 'Settings', title: 'About / What’s new', run: tab('about'), cap: 2400 },
  // ---------- shell ----------
  { id: 'inbox', group: 'Shell', title: 'Inbox', viewport: true, run: `showTab('timer'); openInbox();` },
  { id: 'command-palette', group: 'Shell', title: 'Command palette', viewport: true, run: `showTab('timer'); openCmd();` },
  { id: 'shortcuts', group: 'Shell', title: 'Keyboard shortcuts', viewport: true, run: `showTab('timer'); $('#keysDlg').showModal();`, skip: ['phone'] },
  { id: 'login-reward', group: 'Shell', title: 'Daily reward', viewport: true, run: `showTab('timer'); openLoginDlg();` },
  { id: 'level-up', group: 'Shell', title: 'Level-up moment', viewport: true, run: `showTab('timer'); showLevelUp(11, 12);`, wait: 1800 },
  { id: 'reward-reveal', group: 'Shell', title: 'Reward reveal', viewport: true, run: `showTab('timer'); showRewardReveal({ kicker: 'Monsoon Study · quest 2 of 8', title: 'Rainy mornings', items: ['av_fox'], pal: ['#3a7ca5', '#2f8f83'] });`, wait: 1800 },
  { id: 'nav-more', group: 'Shell', title: 'More menu (phone)', viewport: true, run: `showTab('timer'); const m = document.getElementById('navMore'); if (m && m.offsetWidth) m.click(); else if (document.getElementById('navBurger') && document.getElementById('navBurger').offsetWidth) document.getElementById('navBurger').click();`, skip: ['d-dark', 'd-light'] },
  { id: 'tutorial', group: 'Shell', title: 'Tutorial', viewport: true, fresh: true, run: `showTab('timer'); startTutorial();`, wait: 1500 },
];

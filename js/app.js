'use strict';

// Router: the part of the address after # picks the screen, e.g. #/train/gym.
const App = (() => {
  const view = document.getElementById('view');
  const appbar = document.getElementById('appbar');
  const routes = {
    today: Screens.today,
    train: TrainScreens.train,
    ex: TrainScreens.exercise,
    library: TrainScreens.library,
    session: Session.session,
    history: Session.history,
    eat: EatScreens.eat,
    recipes: EatScreens.recipes,
    recipe: EatScreens.recipe,
    progress: ProgressScreens.progress,
    weights: ProgressScreens.weights,
    bests: ProgressScreens.bests,
    favourites: ProgressScreens.favourites,
    settings: Screens.settings,
  };

  document.querySelectorAll('[data-icon]').forEach(el => { el.outerHTML = UI.icon(el.dataset.icon); });

  function render({ keepScroll = false } = {}) {
    const [name, ...params] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    const key = routes[name] ? name : 'today';
    const screen = routes[key](...params);

    document.title = `${screen.title} · Train & Eat`;
    document.body.dataset.route = key; // lets CSS hide the tab bar during a workout
    appbar.innerHTML = `
      <div class="appbar-inner">
        ${screen.back ? `<a class="back" href="${screen.back.href}">${UI.icon('back')}${UI.esc(screen.back.label)}</a>` : ''}
        ${screen.subtitle ? `<p class="eyebrow">${UI.esc(screen.subtitle)}</p>` : ''}
        <div class="appbar-row">
          <h1>${UI.esc(screen.title)}</h1>
          ${key === 'settings' ? '' : `<a class="appbar-btn" href="#/settings" aria-label="Settings">${UI.icon('settings')}</a>`}
        </div>
      </div>`;

    // A fresh element per render, so old event listeners go away with it.
    const page = document.createElement('div');
    page.className = 'page';
    page.innerHTML = screen.html;
    view.replaceChildren(page);
    screen.mount?.(page);

    const tab = screen.tab || key;
    document.querySelectorAll('.tabbar a').forEach(a => {
      a.setAttribute('aria-current', a.dataset.route === tab ? 'page' : 'false');
    });
    if (!keepScroll) window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', () => render());

  // Redraw charts at the new width when the phone rotates.
  let resizeTimer;
  let lastWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth === lastWidth) return; // ignore the keyboard opening
      lastWidth = window.innerWidth;
      if (document.querySelector('.chart-box')) render({ keepScroll: true });
    }, 200);
  });

  // Offline support and Home Screen install. Needs https or localhost.
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  // Ask the browser not to clear saved data when space runs low.
  navigator.storage?.persist?.().catch(() => {});

  render();

  return { render, refresh: () => render({ keepScroll: true }) };
})();

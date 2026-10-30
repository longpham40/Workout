'use strict';

// Each screen returns { title, html } and optionally:
//   subtitle  small line above the title
//   back      { href, label } for a back link
//   tab       which tab to highlight (defaults to the route name)
//   mount     function(page) to wire up buttons after the HTML is shown
const Screens = (() => {
  const { icon, esc, stat, sectionTitle } = UI;

  // ---------- Shared pieces ----------

  function targetsCard(t) {
    return `
      <a class="card link-card" href="#/eat">
        <div>
          <p class="eyebrow">Daily targets · ${esc(t.goal.name)}</p>
          <div class="targets">
            <div><div class="big">${t.kcal.toLocaleString()}<small>kcal</small></div><div class="muted small">Calories</div></div>
            <div><div class="big">${t.protein}<small>g</small></div><div class="muted small">Protein</div></div>
          </div>
          <p class="muted small">Maintenance is about ${t.maintenance.toLocaleString()} kcal. All figures are rough estimates.</p>
        </div>
        ${icon('chevron', 'chev')}
      </a>`;
  }

  const setupCard = () => `
    <a class="card link-card accent-card" href="#/settings">
      <div>
        <h3>Set up your profile</h3>
        <p class="small">Add your age, height and weight to get daily calorie and protein targets.</p>
      </div>
      ${icon('chevron', 'chev')}
    </a>`;

  function installCard() {
    if (!UI.isIOS() || UI.isStandalone() || Store.state.ui.installDismissed) return '';
    return `
      <section class="card install">
        <h3>Add to your Home Screen</h3>
        <ol class="steps small">
          <li>Tap the Share button ${icon('share', 'inline')} in Safari.</li>
          <li>Choose <strong>Add to Home Screen</strong> ${icon('plusSquare', 'inline')}.</li>
          <li>Open Train &amp; Eat from its new icon. It works like an app, full screen.</li>
        </ol>
        <button class="btn small-btn" data-action="dismiss-install">Got it</button>
      </section>`;
  }

  function nextWorkoutCard() {
    const next = TrainScreens.nextWorkout();
    if (!next) {
      return `
        <a class="card link-card" href="#/train">
          <span class="type-icon" style="--c: var(--accent)">${icon('train')}</span>
          <div>
            <h3>Choose a program</h3>
            <p class="muted small">Pick a training style and level to get your weekly plan.</p>
          </div>
          ${icon('chevron', 'chev')}
        </a>`;
    }
    const { type, level, day, dayNum, week, weeks, done } = next;
    if (done) {
      return `
        <a class="card link-card note" href="#/train/${type.id}/${level.id}">
          <span class="type-icon" style="--c: var(--${type.id})">${icon('trophy')}</span>
          <div>
            <h3>Program complete</h3>
            <p class="muted small">${esc(type.name)} · ${esc(level.name)}. Start it again stronger, or move up a level.</p>
          </div>
          ${icon('chevron', 'chev')}
        </a>`;
    }
    return `
      <a class="card link-card" href="#/train/${type.id}/${level.id}/${dayNum}/${week}">
        <span class="type-icon" style="--c: var(--${type.id})">${icon(type.icon)}</span>
        <div>
          <p class="eyebrow">Next workout · Week ${week} of ${weeks} · Day ${dayNum}</p>
          <h3>${esc(day.name)}</h3>
          <p class="muted small">${esc(type.name)} · ${esc(level.name)} · ${day.main.length} exercise${day.main.length === 1 ? '' : 's'}</p>
        </div>
        ${icon('chevron', 'chev')}
      </a>`;
  }

  function recentBestsCard() {
    const bests = ProgressScreens.recentBests(3);
    if (!bests.length) return '';
    return `
      <a class="card link-card bests" href="#/bests">
        <div>
          <p class="eyebrow">${icon('trophy', 'inline')} Recent personal bests</p>
          <ul>${bests.map(b => `<li>${esc(b.name)}: <strong>${esc(b.label)}</strong> <span class="muted small">· ${Charts.shortDate(b.date)}</span></li>`).join('')}</ul>
        </div>
        ${icon('chevron', 'chev')}
      </a>`;
  }

  // ---------- Welcome: a few questions, then a recommended program ----------

  const WELCOME = {
    goal: {
      question: 'What’s your main goal?',
      options: [
        { id: 'muscle', name: 'Build muscle and strength', blurb: 'Get stronger and add some size.' },
        { id: 'lose', name: 'Lose fat', blurb: 'Drop weight while keeping your muscle.' },
        { id: 'fitness', name: 'Get fitter', blurb: 'More stamina for running, sport or everyday life.' },
        { id: 'health', name: 'Stay healthy', blurb: 'Feel good and keep moving, at a steady weight.' },
      ],
    },
    level: {
      question: 'How much have you trained before?',
      options: LEVELS.map(l => ({ id: l.id, name: l.name, blurb: l.blurb })),
    },
    kit: {
      question: 'What can you train with?',
      options: [
        { id: 'gym', name: 'A gym', blurb: 'Barbells, dumbbells and machines.' },
        { id: 'home', name: 'Home, little or no equipment', blurb: 'Your bodyweight, maybe dumbbells or a band.' },
        { id: 'bar', name: 'A pull-up bar or park bars', blurb: 'Bodyweight skills: pull-ups, dips, push-ups.' },
        { id: 'outdoors', name: 'Running shoes', blurb: 'Walking, running, or a bike or rower.' },
      ],
    },
  };
  const GOAL_TO_NUTRITION = { muscle: 'gain', lose: 'lose', fitness: 'maintain', health: 'maintain' };

  // Equipment decides the style; wanting fitness points to cardio unless you're set on lifting at a gym.
  function recommend({ goal, level, kit }) {
    if (!goal || !level || !kit) return null;
    let type = { gym: 'gym', home: 'home', bar: 'calisthenics', outdoors: 'cardio' }[kit];
    if (goal === 'fitness' && kit === 'home') type = 'cardio';
    const why = {
      gym: 'You have a gym, and weights are the most reliable way to build strength and muscle.',
      home: 'You can do it at home with little or no kit, and it builds strength and burns calories.',
      calisthenics: 'You have bars to train on, and bodyweight skills build real strength with no weights.',
      cardio: 'It builds your heart, lungs and stamina step by step, and it’s great for fat loss too.',
    }[type];
    return { type: TRAINING_TYPES.find(t => t.id === type), level: LEVELS.find(l => l.id === level), why };
  }

  const answers = {};

  function welcome() {
    const group = key => {
      const g = WELCOME[key];
      return `
        <fieldset class="choices">
          <legend class="section-title">${esc(g.question)}</legend>
          ${g.options.map(o => `
            <label class="choice">
              <input type="radio" name="${key}" value="${o.id}"${answers[key] === o.id ? ' checked' : ''}>
              <span><strong>${esc(o.name)}</strong><span class="muted small block">${esc(o.blurb)}</span></span>
            </label>`).join('')}
        </fieldset>`;
    };
    return {
      title: 'Welcome',
      subtitle: 'Train & Eat',
      tab: 'none',
      html: `
        <p class="lead pad-x">Three quick questions and we’ll suggest a program to start with. You can change it any time.</p>
        <form class="welcome" autocomplete="off">
          ${group('goal')}
          ${group('level')}
          ${group('kit')}
        </form>
        <div data-result></div>
        <button class="btn quiet" data-action="skip">Skip for now</button>`,
      mount(page) {
        const result = page.querySelector('[data-result]');
        const draw = () => {
          const rec = recommend(answers);
          if (!rec) {
            result.innerHTML = '';
            return;
          }
          const prog = PROGRAMS[rec.type.id][rec.level.id];
          const weeks = WEEK_PLANS[rec.type.id === 'cardio' ? 'cardio' : 'strength'][rec.level.id].length;
          result.innerHTML = `
            <section class="card stack recommend" style="--c: var(--${rec.type.id})">
              <p class="eyebrow">We recommend</p>
              <div class="rec-head">
                <span class="type-icon">${icon(rec.type.icon)}</span>
                <h2>${esc(rec.type.name)} · ${esc(rec.level.name)}</h2>
              </div>
              <div class="chips">
                <span class="chip">${weeks} weeks</span>
                <span class="chip">${prog.days.length} days a week</span>
                <span class="chip">${esc(prog.duration)}</span>
              </div>
              <p class="small">${esc(rec.why)} ${esc(prog.summary)}</p>
              <button class="btn primary" data-action="start">Start this program</button>
              <a class="btn quiet" href="#/train" data-action="browse">Look at all programs</a>
            </section>`;
          result.querySelector('.recommend').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        };
        const done = () => Store.update(s => {
          s.ui.onboarded = true;
          if (answers.goal) s.profile.goal = GOAL_TO_NUTRITION[answers.goal];
        });
        page.querySelector('.welcome').addEventListener('change', e => {
          answers[e.target.name] = e.target.value;
          draw();
        });
        page.addEventListener('click', e => {
          const action = e.target.closest('[data-action]')?.dataset.action;
          if (action === 'skip') {
            done();
            location.hash = '#/today';
          } else if (action === 'browse') {
            done();
          } else if (action === 'start') {
            const rec = recommend(answers);
            done();
            Store.update(s => { s.program = { type: rec.type.id, level: rec.level.id, next: 0, week: 1 }; });
            UI.toast('Program saved. You’re on week 1.');
            location.hash = '#/today';
          }
        });
        draw();
      },
    };
  }

  // First visit with nothing saved yet: show the welcome questions.
  function needsWelcome() {
    const s = Store.state;
    return !s.ui.onboarded && !s.program && !s.sessions.length && !s.profile.age;
  }

  // ---------- Today ----------

  function today() {
    const s = Store.state;
    const t = Nutrition.targets(s.profile);
    const weekStart = UI.startOfWeek();
    return {
      title: 'Today',
      subtitle: UI.longDate(),
      html: `
        ${installCard()}
        ${Session.activeCard()}
        ${t ? targetsCard(t) : setupCard()}
        <section class="stats">
          ${stat('This week', s.sessions.filter(x => x.date >= weekStart).length)}
          ${stat('Week streak', ProgressScreens.weekStreak())}
          ${stat('Goal', Nutrition.GOALS[s.profile.goal].short)}
        </section>
        ${s.active ? '' : nextWorkoutCard()}
        ${s.active ? '' : '<button class="btn quiet" data-action="free">+ Log my own workout</button>'}
        ${recentBestsCard()}`,
      mount(page) {
        page.addEventListener('click', e => {
          const action = e.target.closest('[data-action]')?.dataset.action;
          if (action === 'free') Session.startFree();
          if (action !== 'dismiss-install') return;
          Store.update(st => { st.ui.installDismissed = true; });
          App.refresh();
        });
      },
    };
  }

  // ---------- Settings ----------

  function settings() {
    const p = Store.state.profile;
    const imperial = p.units === 'imperial';
    const { ft, inch } = p.heightCm ? UI.cmToFtIn(p.heightCm) : { ft: '', inch: '' };
    const weight = p.weightKg ? UI.round1(imperial ? UI.kgToLb(p.weightKg) : p.weightKg) : '';
    const option = (value, label, current) =>
      `<option value="${value}"${value === current ? ' selected' : ''}>${esc(label)}</option>`;

    return {
      title: 'Settings',
      back: { href: '#/today', label: 'Today' },
      tab: 'none',
      html: `
        ${sectionTitle('Profile')}
        <form class="card form" id="profile" autocomplete="off">
          <div class="field">
            <span class="label">Units</span>
            <div class="segmented">
              <label><input type="radio" name="units" value="metric"${imperial ? '' : ' checked'}><span>kg · cm</span></label>
              <label><input type="radio" name="units" value="imperial"${imperial ? ' checked' : ''}><span>lb · ft</span></label>
            </div>
          </div>
          <div class="grid-2">
            <label class="field"><span class="label">Sex</span>
              <select name="sex">
                ${option('', 'Choose…', p.sex)}${option('female', 'Female', p.sex)}${option('male', 'Male', p.sex)}${option('other', 'Prefer not to say', p.sex)}
              </select>
            </label>
            <label class="field"><span class="label">Age</span>
              <input name="age" type="number" inputmode="numeric" min="13" max="100" value="${esc(p.age)}">
            </label>
          </div>
          <div class="grid-2">
            ${imperial ? `
              <div class="field"><span class="label">Height</span>
                <div class="split-input">
                  <label><input name="ft" type="number" inputmode="numeric" min="3" max="8" value="${ft}" aria-label="Feet"><span>ft</span></label>
                  <label><input name="inch" type="number" inputmode="numeric" min="0" max="11" value="${inch}" aria-label="Inches"><span>in</span></label>
                </div>
              </div>` : `
              <label class="field"><span class="label">Height (cm)</span>
                <input name="height" type="number" inputmode="decimal" min="100" max="250" value="${p.heightCm ? Math.round(p.heightCm) : ''}">
              </label>`}
            <label class="field"><span class="label">Weight (${imperial ? 'lb' : 'kg'})</span>
              <input name="weight" type="number" inputmode="decimal" step="0.1" min="30" value="${weight}">
            </label>
          </div>
          <label class="field"><span class="label">Activity, including workouts</span>
            <select name="activity">
              ${Object.entries(Nutrition.ACTIVITY).map(([id, a]) => option(id, a.label, p.activity)).join('')}
            </select>
          </label>
          <p class="hint">Used to estimate your calorie and protein targets. It stays on this phone, except that the basics go with your questions when you use Chat.</p>
        </form>

        <a class="btn quiet" href="#/welcome">Answer the setup questions again</a>

        ${sectionTitle('Your data')}
        <section class="card form">
          <p class="small muted">Everything is saved on this device. Export a backup now and then, and before you switch phones.</p>
          <button class="btn" data-action="export">Export backup</button>
          <label class="btn">Import backup<input type="file" name="import" accept=".json,application/json" hidden></label>
          <button class="btn danger" data-action="reset">Delete all data</button>
        </section>

        ${sectionTitle('About')}
        <section class="card">
          <p class="small muted">The training and nutrition guidance in this app is general information, not medical advice. Calories and protein are rough estimates. If you have an injury or a health condition, check with a doctor or physio before you start.</p>
          <p class="small muted credit">Exercise photos: <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noopener">free-exercise-db</a>, released into the public domain. Thank you to its contributors.</p>
        </section>`,
      mount: mountSettings,
    };
  }

  function mountSettings(page) {
    const form = page.querySelector('#profile');

    form.addEventListener('change', e => {
      const f = form.elements;
      const unitsChanged = e.target.name === 'units';
      Store.update(s => {
        const p = s.profile;
        if (unitsChanged) {
          p.units = e.target.value;
          return;
        }
        p.sex = f.sex.value;
        p.age = UI.posNum(f.age.value);
        p.activity = f.activity.value;
        if (p.units === 'imperial') {
          p.heightCm = UI.ftInToCm(f.ft.value, f.inch.value);
          p.weightKg = UI.lbToKg(f.weight.value);
        } else {
          p.heightCm = UI.posNum(f.height.value);
          p.weightKg = UI.posNum(f.weight.value);
        }
      });
      if (unitsChanged) App.refresh(); else UI.toast('Saved');
    });

    page.addEventListener('click', e => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'export') {
        Store.update(s => { s.ui.lastBackup = UI.isoDate(); });
        UI.download(`train-eat-backup-${UI.isoDate()}.json`, Store.exportJSON());
      } else if (action === 'reset') {
        if (!confirm("Delete your profile, workouts and favourites from this phone? This can't be undone.")) return;
        Store.reset();
        App.refresh();
        UI.toast('All data deleted');
      }
    });

    page.querySelector('input[name="import"]').addEventListener('change', async e => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        const text = await file.text();
        if (!confirm('Replace everything on this phone with this backup?')) return;
        Store.importJSON(text);
        App.refresh();
        UI.toast('Backup restored');
      } catch {
        alert("That file isn't a Train & Eat backup.");
      }
    });
  }

  return { today, settings, welcome, needsWelcome };
})();

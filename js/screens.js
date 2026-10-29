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
    const { type, level, day, dayNum } = next;
    return `
      <a class="card link-card" href="#/train/${type.id}/${level.id}/${dayNum}">
        <span class="type-icon" style="--c: var(--${type.id})">${icon(type.icon)}</span>
        <div>
          <p class="eyebrow">Next workout · Day ${dayNum}</p>
          <h3>${esc(day.name)}</h3>
          <p class="muted small">${esc(type.name)} · ${esc(level.name)} · ${day.main.length} exercise${day.main.length === 1 ? '' : 's'}</p>
        </div>
        ${icon('chevron', 'chev')}
      </a>`;
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
          ${stat('Workouts', s.sessions.length)}
          ${stat('Goal', Nutrition.GOALS[s.profile.goal].short)}
        </section>
        ${s.active ? '' : nextWorkoutCard()}
        ${s.active ? '' : '<button class="btn quiet" data-action="free">+ Log my own workout</button>'}`,
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
          <p class="hint">Used only to estimate your calorie and protein targets. It never leaves this phone.</p>
        </form>

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

  return { today, settings };
})();

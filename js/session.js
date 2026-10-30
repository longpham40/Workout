'use strict';

// Workouts you do: guided program days, your own logged workouts, and history.
//   #/session          the workout in progress
//   #/session/add      add an exercise to it
//   #/history/<id>     a finished workout (with /new right after you finish)
//
// The workout in progress is saved after every change, so closing the app doesn't lose it.
const Session = (() => {
  const { icon, esc, sectionTitle, stat } = UI;

  // ---------- What gets logged for each exercise ----------

  const HOLDS = new Set(['plank', 'side-plank', 'hollow-hold', 'wall-sit', 'dead-hang', 'l-sit', 'wall-handstand-hold']);
  const CARDIO = new Set(Object.keys(EXERCISES).filter(id => {
    const types = TrainScreens.typesFor(id);
    return types.size === 1 && types.has('cardio');
  }));
  // Rest used for exercises you add yourself (no program target).
  const DEFAULT_REST = { weight: 90, bw: 60, hold: 45, carry: 60, cardio: 0, rounds: 60 };

  //   weight  weight + reps     bw      reps only
  //   hold    seconds           carry   weight + metres
  //   cardio  minutes + distance        rounds  just tick each round
  function kindFor(exId, typeId, sets) {
    if (CARDIO.has(exId)) return typeId && sets > 1 ? 'rounds' : 'cardio';
    if (HOLDS.has(exId)) return 'hold';
    if (exId === 'farmer-carry') return 'carry';
    if (!exId) return 'weight';
    const gym = typeId ? typeId === 'gym' : TrainScreens.typesFor(exId).has('gym');
    return gym ? 'weight' : 'bw';
  }

  function fieldsFor(kind, unit) {
    return {
      weight: [{ key: 'weight', label: unit, mode: 'decimal' }, { key: 'reps', label: 'Reps', mode: 'numeric' }],
      bw: [{ key: 'reps', label: 'Reps', mode: 'numeric' }],
      hold: [{ key: 'secs', label: 'Seconds', mode: 'numeric' }],
      carry: [{ key: 'weight', label: unit, mode: 'decimal' }, { key: 'dist', label: 'Metres', mode: 'numeric' }],
      cardio: [{ key: 'mins', label: 'Minutes', mode: 'decimal' }, { key: 'dist', label: unit === 'lb' ? 'Miles' : 'km', mode: 'decimal' }],
      rounds: [],
    }[kind];
  }

  // Fields that tick-off fills from the target (e.g. "8–12" → 8). Weight is always yours to enter.
  const autoFills = (kind, key) => key !== 'weight' && !(kind === 'cardio' && key === 'dist');

  const firstNumber = text => parseFloat(String(text ?? '').match(/\d+(?:\.\d+)?/)?.[0]) || 0;
  const fmt = n => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  const currentUnit = () => (Store.state.profile.units === 'imperial' ? 'lb' : 'kg');
  const toKg = (w, unit) => (unit === 'lb' ? w / 2.20462 : w);
  const blankSet = (weight = '') => ({ weight, reps: '', secs: '', mins: '', dist: '', done: false });
  const isComplete = item => item.sets.length > 0 && item.sets.every(s => s.done);
  const restFor = item => (item.target ? item.target.rest : DEFAULT_REST[item.kind]);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function elapsed(a) {
    const s = Math.max(0, Math.floor((Date.now() - a.startedAt) / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = String(s % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
  }

  // Most recent finished workout that included this exercise.
  function lastFor(item) {
    const sessions = Store.state.sessions;
    for (let i = sessions.length - 1; i >= 0; i--) {
      const found = sessions[i].items.find(x => (item.ex ? x.ex === item.ex : x.name === item.name));
      if (found) return { session: sessions[i], item: found };
    }
    return null;
  }

  function summary(item, unit) {
    const sets = item.sets;
    const dist = unit === 'lb' ? 'mi' : 'km';
    switch (item.kind) {
      case 'rounds':
        return `${sets.length} round${sets.length === 1 ? '' : 's'}`;
      case 'bw':
        return `${sets.map(s => s.reps ?? '–').join(', ')} reps`;
      case 'hold':
        return sets.map(s => `${s.secs ?? '–'} s`).join(', ');
      case 'carry':
        return sets.map(s => `${s.weight ? `${fmt(s.weight)} ${unit} × ` : ''}${s.dist ?? '–'} m`).join(', ');
      case 'cardio':
        return sets.map(s => `${s.mins ?? '–'} min${s.dist ? ` · ${fmt(s.dist)} ${dist}` : ''}`).join(', ');
      default: {
        const weights = new Set(sets.map(s => s.weight || 0));
        if (weights.size === 1) {
          const w = sets[0].weight;
          return `${w ? `${fmt(w)} ${unit} × ` : ''}${sets.map(s => s.reps ?? '–').join(', ')}${w ? '' : ' reps'}`;
        }
        return sets.map(s => `${fmt(s.weight || 0)} × ${s.reps ?? '–'}`).join(', ') + ` (${unit})`;
      }
    }
  }

  function makeItem({ ex, name, typeId = null, target = null }, unit) {
    const count = target?.sets || (CARDIO.has(ex) ? 1 : 3);
    const kind = kindFor(ex, typeId, count);
    const item = { ex, name, kind, target, sets: [] };
    // Start from the weights you used last time.
    const last = lastFor(item);
    for (let i = 0; i < count; i++) {
      const prev = last?.item.sets[Math.min(i, last.item.sets.length - 1)];
      let weight = '';
      if (prev?.weight && (kind === 'weight' || kind === 'carry')) {
        const w = last.session.unit === unit ? prev.weight : (unit === 'lb' ? prev.weight * 2.20462 : prev.weight / 2.20462);
        weight = String(Math.round(w * 2) / 2);
      }
      item.sets.push(blankSet(weight));
    }
    return item;
  }

  // ---------- Starting and finishing ----------

  function begin(workout) {
    if (Store.state.active && !confirm('You already have a workout in progress. Discard it and start a new one?')) return false;
    Timer.stop();
    Store.update(s => {
      s.active = { id: uid(), startedAt: Date.now(), current: 0, rest: null, ...workout };
    });
    return true;
  }

  // Where a workout came from: { type, level, dayNum, week } for a program day, { area, type, level } for upper/lower.
  const sameSource = (a, b) => !!a && !!b &&
    a.type === b.type && a.level === b.level && a.dayNum === b.dayNum && a.area === b.area;

  function startFrom(source, name, workout) {
    if (sameSource(Store.state.active?.source, source)) {
      location.hash = '#/session';
      return;
    }
    const unit = currentUnit();
    const started = begin({
      name,
      source,
      unit,
      items: workout.main.map(rx => makeItem({ ex: rx.ex, name: EXERCISES[rx.ex].name, typeId: source.type, target: rx }, unit)),
    });
    if (started) location.hash = '#/session';
  }

  function startFromDay(typeId, levelId, dayNum, week = 1) {
    const day = TrainScreens.dayForWeek(typeId, levelId, dayNum, week);
    startFrom({ type: typeId, level: levelId, dayNum, week: day.weekNum }, day.name, day);
  }

  function startFromArea(areaId, typeId, levelId) {
    const area = BODY_AREAS.find(a => a.id === areaId);
    const type = TRAINING_TYPES.find(t => t.id === typeId);
    startFrom({ area: areaId, type: typeId, level: levelId }, `${area.name} · ${type.name}`, AREA_WORKOUTS[areaId][typeId][levelId]);
  }

  function startFree() {
    if (begin({ name: 'My workout', source: null, unit: currentUnit(), items: [] })) location.hash = '#/session/add';
  }

  function cleanSet(s, kind) {
    const out = {};
    for (const f of fieldsFor(kind, 'kg')) {
      const n = parseFloat(String(s[f.key]).replace(',', '.'));
      if (Number.isFinite(n) && n > 0) out[f.key] = n;
    }
    return out;
  }

  // Personal bests: heaviest weight, most reps (bodyweight) or longest hold, beating any earlier workout.
  const MEASURES = {
    weight: (s, unit) => (s.reps ? toKg(s.weight || 0, unit) : 0),
    carry: (s, unit) => toKg(s.weight || 0, unit),
    bw: s => s.reps || 0,
    hold: s => s.secs || 0,
  };

  function findBests(record) {
    const bests = [];
    for (const item of record.items) {
      const measure = MEASURES[item.kind];
      if (!measure) continue;
      const best = Math.max(...item.sets.map(s => measure(s, record.unit)));
      let previous = 0;
      for (const past of Store.state.sessions) {
        for (const x of past.items) {
          if (x.kind !== item.kind || (item.ex ? x.ex !== item.ex : x.name !== item.name)) continue;
          previous = Math.max(previous, ...x.sets.map(s => measure(s, past.unit)));
        }
      }
      // Only counts once there's an earlier workout to beat.
      if (previous > 0 && best > previous + 0.01) {
        const top = item.sets.find(s => measure(s, record.unit) === best);
        const label = item.kind === 'bw' ? `${top.reps} reps`
          : item.kind === 'hold' ? `${top.secs} s`
          : `${fmt(top.weight)} ${record.unit}`;
        bests.push({ name: item.name, label });
      }
    }
    return bests;
  }

  function finish() {
    const a = Store.state.active;
    const items = a.items
      .map(it => ({ ex: it.ex, name: it.name, kind: it.kind, sets: it.sets.filter(s => s.done).map(s => cleanSet(s, it.kind)) }))
      .filter(it => it.sets.length);
    if (!items.length) {
      if (confirm('No sets are ticked off yet, so there’s nothing to save. Discard this workout?')) discard();
      return;
    }
    const unticked = a.items.some(it => it.sets.some(s => !s.done));
    if (unticked && !confirm('Finish now? Only the sets you’ve ticked off will be saved.')) return;

    const record = {
      id: a.id,
      date: UI.isoDate(new Date(a.startedAt)),
      startedAt: a.startedAt,
      endedAt: Date.now(),
      name: a.name,
      source: a.source,
      unit: a.unit,
      items,
    };
    record.bests = findBests(record);
    Store.update(s => {
      s.sessions.push(record);
      s.active = null;
      // Move "My program" on to the day after this one.
      if (a.source?.dayNum && s.program?.type === a.source.type && s.program?.level === a.source.level) {
        s.program.next = a.source.dayNum;
        // Finishing the last day of your current week moves you on to the next week.
        const lastDay = PROGRAMS[a.source.type][a.source.level].days.length;
        if (a.source.dayNum === lastDay && (a.source.week || 1) === (s.program.week || 1)) s.program.week = (s.program.week || 1) + 1;
      }
    });
    Timer.stop();
    releaseWake();
    location.hash = `#/history/${record.id}/new`;
  }

  function discard() {
    Store.update(s => { s.active = null; });
    Timer.stop();
    releaseWake();
    location.hash = '#/today';
  }

  // ---------- Keep the screen on during a workout ----------

  let wakeLock = null;
  async function keepAwake() {
    try {
      if (!wakeLock && 'wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      }
    } catch {}
  }
  function releaseWake() {
    wakeLock?.release().catch(() => {});
    wakeLock = null;
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Store.state.active && location.hash.startsWith('#/session')) keepAwake();
  });

  // Updates the workout clock once a second, on whatever screen shows it.
  setInterval(() => {
    const a = Store.state.active;
    if (!a) return;
    document.querySelectorAll('[data-elapsed]').forEach(el => { el.textContent = elapsed(a); });
  }, 1000);

  // ---------- Workout screen ----------

  function session(sub) {
    const a = Store.state.active;
    if (!a) return noSession();
    if (sub === 'add') return addExercise();
    if (sub === 'swap') return swapExercise();
    if (!a.items.length) return emptySession(a);

    const index = Math.min(a.current, a.items.length - 1);
    const item = a.items[index];
    const ex = EXERCISES[item.ex];
    const fields = fieldsFor(item.kind, a.unit);
    const last = lastFor(item);
    const isLast = index === a.items.length - 1;
    const cols = Math.max(1, fields.length) + (item.kind === 'hold' ? 1 : 0);

    const headCells = item.kind === 'rounds'
      ? '<span>Each round</span>'
      : fields.map(f => `<span>${esc(f.label)}</span>`).join('') + (item.kind === 'hold' ? '<span>Timer</span>' : '');

    return {
      title: a.name,
      subtitle: `Exercise ${index + 1} of ${a.items.length}`,
      tab: 'none',
      back: { href: '#/today', label: 'Today' },
      html: `
        <div class="session-top">
          <span class="elapsed">${icon('clock', 'inline')} <span data-elapsed>${elapsed(a)}</span></span>
          <div class="ex-dots">
            ${a.items.map((it, j) => `<button class="ex-dot${j === index ? ' current' : ''}${isComplete(it) ? ' complete' : ''}${it.skipped ? ' skipped' : ''}" data-goto="${j}" aria-label="Exercise ${j + 1}: ${esc(it.name)}${it.skipped ? ', skipped' : ''}"></button>`).join('')}
          </div>
        </div>

        <section class="card stack">
          ${item.ex ? TrainScreens.photoFrame(item.ex, { compact: true }) : ''}
          <div>
            <h2 class="ex-title">${esc(item.name)}</h2>
            ${item.skipped ? '<p class="small muted">Skipped. Tick a set to do it after all.</p>' : ''}
            ${item.swappedFrom ? `<p class="small muted">Swapped in for ${esc(item.swappedFrom)}</p>` : ''}
            ${item.target ? `<p class="muted">${esc(TrainScreens.doseLine(item.target))}</p>` : ''}
            ${last ? `<p class="small last">Last time: ${esc(summary(last.item, last.session.unit))}</p>` : ''}
          </div>
          ${item.target?.note ? `<p class="note small">${esc(item.target.note)}</p>` : ''}
          ${ex ? `
            <details class="howto-toggle">
              <summary>How to do it safely</summary>
              <ol class="howto small">${ex.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
              <ul class="tips small">${ex.safety.map(t => `<li>${icon('shield', 'tip-icon')}<span>${esc(t)}</span></li>`).join('')}</ul>
            </details>` : ''}
        </section>

        <section class="card sets" style="--cols: ${cols}">
          <div class="set-row head"><span>${item.kind === 'rounds' ? 'Round' : 'Set'}</span>${headCells}<span></span></div>
          ${item.sets.map((s, j) => setRow(item, s, j, fields)).join('')}
          <div class="row-actions">
            <button class="btn small-btn" data-action="add-set">+ Add ${item.kind === 'rounds' ? 'round' : 'set'}</button>
            ${item.sets.length > 1 ? '<button class="btn small-btn quiet" data-action="remove-set">Remove last</button>' : ''}
          </div>
        </section>

        <div class="session-nav">
          <button class="btn" data-action="prev"${index === 0 ? ' disabled' : ''}>${icon('back', 'inline')} Back</button>
          ${isLast
            ? '<button class="btn primary" data-action="finish">Finish workout</button>'
            : `<button class="btn primary" data-action="next">Next exercise ${icon('chevron', 'inline')}</button>`}
        </div>

        <div class="session-tools">
          ${item.ex ? '<button class="btn" data-action="swap">' + icon('swap', 'inline') + ' Swap</button>' : ''}
          ${isLast ? '' : '<button class="btn" data-action="skip">Skip</button>'}
        </div>

        <div class="session-more">
          <button class="btn quiet" data-action="add-ex">+ Add an exercise</button>
          <button class="btn quiet" data-action="remove-ex">Remove this exercise</button>
          ${isLast ? '' : '<button class="btn quiet" data-action="finish">Finish workout now</button>'}
          <button class="btn danger" data-action="discard">Discard workout</button>
        </div>`,
      mount: mountSession,
    };
  }

  function setRow(item, s, j, fields) {
    const target = firstNumber(item.target?.reps);
    const cells = item.kind === 'rounds'
      ? `<span class="round-info">${esc(item.target?.reps || '')}</span>`
      : fields.map(f => `
          <input type="text" inputmode="${f.mode}" autocomplete="off" data-set="${j}" data-key="${f.key}"
            value="${esc(s[f.key])}" placeholder="${target && autoFills(item.kind, f.key) ? target : ''}"
            aria-label="${esc(f.label)}, set ${j + 1}">`).join('');
    const timerCell = item.kind === 'hold'
      ? (s.done ? '<span></span>' : `<button class="icon-btn" data-action="hold" data-set="${j}" aria-label="Start hold timer for set ${j + 1}">${icon('play')}</button>`)
      : '';
    return `
      <div class="set-row${s.done ? ' done' : ''}">
        <span class="set-num">${j + 1}</span>
        ${cells}${timerCell}
        <button class="check" data-action="tick" data-set="${j}" aria-pressed="${s.done}" aria-label="Set ${j + 1} done">${icon('check')}</button>
      </div>`;
  }

  function autofill(item, s) {
    const target = firstNumber(item.target?.reps);
    if (!target) return;
    for (const f of fieldsFor(item.kind, 'kg')) {
      if (s[f.key] === '' && autoFills(item.kind, f.key)) s[f.key] = String(target);
    }
  }

  function startRest(seconds) {
    if (!seconds) return;
    Store.update(st => { if (st.active) st.active.rest = { endAt: Date.now() + seconds * 1000, total: seconds * 1000 }; });
    Timer.start({ seconds, label: 'Rest' });
  }

  function mountSession(page) {
    const a = Store.state.active;
    keepAwake();
    TrainScreens.startPhotos(page);
    // Pick the rest timer back up if the app was closed during a rest.
    if (a.rest?.endAt > Date.now() && !Timer.running) {
      Timer.start({ seconds: a.rest.total / 1000, until: a.rest.endAt, label: 'Rest' });
    }

    page.addEventListener('input', e => {
      const el = e.target;
      if (!el.dataset.key) return;
      Store.update(() => { a.items[a.current].sets[Number(el.dataset.set)][el.dataset.key] = el.value.trim(); });
    });

    page.addEventListener('click', e => {
      const b = e.target.closest('[data-action], [data-goto]');
      if (!b) return;
      if (b.dataset.goto) {
        Store.update(() => { a.current = Number(b.dataset.goto); });
        App.render();
        return;
      }
      const item = a.items[a.current];
      const j = Number(b.dataset.set);
      switch (b.dataset.action) {
        case 'tick': {
          Timer.unlockSound();
          const s = item.sets[j];
          Store.update(() => {
            s.done = !s.done;
            if (s.done) {
              autofill(item, s);
              item.skipped = false;
            }
          });
          if (s.done && !a.items.every(isComplete)) startRest(restFor(item));
          App.refresh();
          break;
        }
        case 'hold': {
          Timer.unlockSound();
          const s = item.sets[j];
          const seconds = firstNumber(s.secs) || firstNumber(item.target?.reps) || 30;
          Timer.start({
            seconds,
            label: 'Hold',
            done: () => {
              Store.update(() => { s.secs = String(seconds); s.done = true; });
              if (location.hash === '#/session') App.refresh();
              if (Store.state.active && !Store.state.active.items.every(isComplete)) startRest(restFor(item));
            },
          });
          break;
        }
        case 'add-set':
          Store.update(() => { item.sets.push(blankSet(item.sets.at(-1)?.weight ?? '')); });
          App.refresh();
          break;
        case 'remove-set':
          Store.update(() => { item.sets.pop(); });
          App.refresh();
          break;
        case 'prev':
        case 'next':
          Store.update(() => { a.current += b.dataset.action === 'next' ? 1 : -1; });
          App.render();
          break;
        case 'add-ex':
          location.hash = '#/session/add';
          break;
        case 'swap':
          location.hash = '#/session/swap';
          break;
        case 'skip':
          Store.update(() => {
            item.skipped = !item.sets.some(s => s.done);
            a.current += 1;
          });
          App.render();
          break;
        case 'remove-ex':
          if (!confirm(`Remove ${item.name} from this workout?`)) return;
          Store.update(() => {
            a.items.splice(a.current, 1);
            a.current = Math.max(0, Math.min(a.current, a.items.length - 1));
          });
          App.render();
          break;
        case 'finish':
          finish();
          break;
        case 'discard':
          if (confirm('Discard this workout? Nothing from it will be saved.')) discard();
          break;
      }
    });
  }

  function emptySession(a) {
    return {
      title: a.name,
      tab: 'none',
      back: { href: '#/today', label: 'Today' },
      html: `
        <section class="card empty">
          <span class="type-icon" style="--c: var(--accent)">${icon('train')}</span>
          <h3>Add your first exercise</h3>
          <p class="muted small">Pick from the library or type your own. You can add as many as you like.</p>
          <a class="btn primary" href="#/session/add">Add an exercise</a>
        </section>
        <button class="btn danger" data-action="discard">Discard workout</button>`,
      mount(page) {
        page.querySelector('[data-action="discard"]').addEventListener('click', () => {
          if (confirm('Discard this workout?')) discard();
        });
      },
    };
  }

  function noSession() {
    const next = TrainScreens.nextWorkout();
    return {
      title: 'Workout',
      tab: 'none',
      back: { href: '#/today', label: 'Today' },
      html: `
        <section class="card empty">
          <h3>No workout in progress</h3>
          <p class="muted small">Start your next program day, or log a workout of your own.</p>
          ${next && !next.done ? `<a class="btn primary" href="#/train/${next.type.id}/${next.level.id}/${next.dayNum}/${next.week}">Next: ${esc(next.day.name)}</a>` : ''}
          <button class="btn" data-action="free">Log my own workout</button>
        </section>`,
      mount: page => page.querySelector('[data-action="free"]').addEventListener('click', startFree),
    };
  }

  // ---------- Add an exercise ----------

  let pickerQuery = '';

  function addExercise() {
    return {
      title: 'Add exercise',
      tab: 'none',
      back: { href: '#/session', label: 'Workout' },
      html: `
        <input type="search" class="search" placeholder="Search, or type your own" value="${esc(pickerQuery)}" aria-label="Search exercises">
        <div class="results"></div>`,
      mount(page) {
        const results = page.querySelector('.results');
        const draw = () => {
          const q = pickerQuery.trim();
          const lower = q.toLowerCase();
          const list = Object.entries(EXERCISES)
            .filter(([, ex]) => !lower || `${ex.name} ${ex.muscles}`.toLowerCase().includes(lower))
            .sort(([a, x], [b, y]) =>
              (Store.isFavourite('exercises', b) - Store.isFavourite('exercises', a)) || x.name.localeCompare(y.name));
          const exact = list.some(([, ex]) => ex.name.toLowerCase() === lower);
          results.innerHTML = `
            ${q && !exact ? `
              <div class="list">
                <button class="row-link as-button" data-custom>
                  <span class="row-main"><strong>Add “${esc(q)}”</strong><span class="muted small block">As your own exercise, logged with weight and reps</span></span>
                  ${icon('plusSquare', 'chev')}
                </button>
              </div>` : ''}
            <div class="list">${list.map(([id, ex]) => `
              <button class="row-link as-button" data-add="${id}">
                ${TrainScreens.thumb(id)}
                <span class="row-main"><strong>${esc(ex.name)}</strong><span class="muted small block">${esc(ex.muscles)}</span></span>
                ${Store.isFavourite('exercises', id) ? icon('heart', 'fav-mark') : ''}
              </button>`).join('')}</div>`;
        };
        const add = (ex, name) => {
          Store.update(s => {
            s.active.items.push(makeItem({ ex, name, typeId: s.active.source?.type }, s.active.unit));
            s.active.current = s.active.items.length - 1;
          });
          pickerQuery = '';
          location.hash = '#/session';
        };
        page.querySelector('.search').addEventListener('input', e => { pickerQuery = e.target.value; draw(); });
        results.addEventListener('click', e => {
          const b = e.target.closest('[data-add], [data-custom]');
          if (!b) return;
          if (b.dataset.add) add(b.dataset.add, EXERCISES[b.dataset.add].name);
          else {
            const name = pickerQuery.trim();
            add(null, name.charAt(0).toUpperCase() + name.slice(1));
          }
        });
        draw();
      },
    };
  }

  // ---------- Swapping an exercise ----------

  // Equipment each kind of workout can use. Calisthenics is bodyweight only.
  const GEAR_FOR = {
    calisthenics: new Set(['bodyweight']),
    home: new Set(['bodyweight', 'bands', 'dumbbell', 'other']),
  };

  // Coached exercises that work the same main muscles, best match first.
  function alternativesFor(item, typeId, exclude) {
    const tag = EXERCISE_TAGS[item.ex];
    if (!tag) return [];
    const allowed = GEAR_FOR[typeId];
    const count = item.sets.length;
    return Object.keys(EXERCISES)
      .filter(id => !exclude.has(id))
      .map(id => {
        const t = EXERCISE_TAGS[id];
        const shared = t.primary.filter(m => tag.primary.includes(m));
        const score = shared.length * 3 + t.secondary.filter(m => tag.primary.includes(m) || tag.secondary.includes(m)).length
          + (t.primary.length === tag.primary.length ? 1 : 0)
          + (TrainScreens.typesFor(id).has(typeId) ? 2 : 0); // already used in this kind of workout
        return { id, t, shared, score };
      })
      .filter(c => c.shared.length
        && (!allowed || allowed.has(c.t.gear))
        && (c.t.category || 'strength') === (tag.category || 'strength')
        && kindFor(c.id, typeId, count) === item.kind)
      .sort((x, y) => y.score - x.score || EXERCISES[x.id].name.localeCompare(EXERCISES[y.id].name))
      .slice(0, 8);
  }

  function swapExercise() {
    const a = Store.state.active;
    const item = a.items[Math.min(a.current, a.items.length - 1)];
    const typeId = a.source?.type || null;
    const options = alternativesFor(item, typeId, new Set(a.items.map(it => it.ex)));
    return {
      title: 'Swap exercise',
      subtitle: item.name,
      tab: 'none',
      back: { href: '#/session', label: 'Workout' },
      html: `
        <p class="muted pad-x">Exercises that work the same main muscles${GEAR_FOR[typeId] ? `, with the equipment for ${esc(TRAINING_TYPES.find(t => t.id === typeId).name.toLowerCase())}` : ''}. Your sets, reps and rest stay the same.</p>
        ${options.length ? `
          <div class="list">${options.map(o => `
            <button class="row-link as-button" data-swap="${o.id}">
              ${TrainScreens.thumb(o.id)}
              <span class="row-main">
                <strong>${esc(EXERCISES[o.id].name)}</strong>
                <span class="muted small block">Same: ${esc(ExerciseDB.muscleNames(o.shared))} · ${esc(ExerciseDB.gearName(o.t.gear))}</span>
              </span>
              ${icon('swap', 'chev')}
            </button>`).join('')}</div>`
          : '<section class="card empty"><p class="muted">No close matches for this one. You can add any exercise instead.</p><a class="btn" href="#/session/add">Add an exercise</a></section>'}`,
      mount(page) {
        page.addEventListener('click', e => {
          const id = e.target.closest('[data-swap]')?.dataset.swap;
          if (!id) return;
          if (item.sets.some(s => s.done) && !confirm(`Swap out ${item.name}? The sets you've ticked for it won't be saved.`)) return;
          Store.update(s => {
            const at = s.active.items.indexOf(item);
            const target = item.target ? { ...item.target, ex: id, note: undefined } : null;
            const next = makeItem({ ex: id, name: EXERCISES[id].name, typeId, target }, s.active.unit);
            next.swappedFrom = item.swappedFrom || item.name;
            s.active.items[at] = next;
          });
          UI.toast(`Swapped in ${EXERCISES[id].name}`);
          location.hash = '#/session';
        });
      },
    };
  }

  // ---------- History ----------

  function stats(record) {
    const minutes = Math.max(1, Math.round((record.endedAt - record.startedAt) / 60000));
    const sets = record.items.reduce((n, it) => n + it.sets.length, 0);
    const volume = record.items
      .filter(it => it.kind === 'weight')
      .reduce((v, it) => v + it.sets.reduce((t, s) => t + (s.weight || 0) * (s.reps || 0), 0), 0);
    return { minutes, sets, volume };
  }

  function history(id, flag) {
    if (!id) {
      return {
        title: 'All workouts',
        tab: 'progress',
        back: { href: '#/progress', label: 'Progress' },
        html: recentList(Infinity) || '<section class="card empty"><p class="muted">No workouts yet.</p></section>',
      };
    }
    const record = Store.state.sessions.find(s => s.id === id);
    if (!record) {
      return { title: 'Workout', back: { href: '#/progress', label: 'Progress' }, tab: 'progress', html: '<section class="card empty"><p class="muted">This workout was deleted.</p></section>' };
    }
    const isNew = flag === 'new';
    const { minutes, sets, volume } = stats(record);
    return {
      title: record.name,
      subtitle: new Date(record.startedAt).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
      tab: 'progress',
      back: isNew ? { href: '#/today', label: 'Today' } : { href: '#/progress', label: 'Progress' },
      html: `
        ${isNew ? `
          <section class="card done-hero">
            <span class="done-badge">${icon('check')}</span>
            <h2>Workout complete</h2>
            <p class="muted small">Great work. It’s saved on this phone.</p>
          </section>` : ''}
        ${record.bests?.length ? `
          <section class="card bests${isNew ? ' celebrate' : ''}">
            <h3>${icon('trophy', 'inline')} New personal best${record.bests.length > 1 ? 's' : ''}${isNew ? '!' : ''}</h3>
            <ul>${record.bests.map(b => `<li>${esc(b.name)}: <strong>${esc(b.label)}</strong></li>`).join('')}</ul>
          </section>` : ''}
        <section class="stats">
          ${stat('Minutes', minutes)}
          ${stat('Sets', sets)}
          ${volume ? stat(`Volume (${record.unit})`, Math.round(volume).toLocaleString()) : stat('Exercises', record.items.length)}
        </section>
        ${sectionTitle('Exercises')}
        <div class="list">
          ${record.items.map(it => `
            <div class="row-static">
              <strong>${esc(it.name)}</strong>
              <span class="muted small block">${esc(summary(it, record.unit))}</span>
            </div>`).join('')}
        </div>
        ${isNew ? '<a class="btn primary" href="#/today">Done</a>' : ''}
        <button class="btn danger" data-action="delete">Delete this workout</button>`,
      mount(page) {
        if (isNew && record.bests?.length) celebrate(page);
        page.querySelector('[data-action="delete"]').addEventListener('click', () => {
          if (!confirm('Delete this workout from your history?')) return;
          Store.update(s => { s.sessions = s.sessions.filter(x => x.id !== id); });
          location.hash = '#/progress';
          UI.toast('Workout deleted');
        });
      },
    };
  }

  // Confetti and a buzz when you set a personal best. Skipped if you've asked for less motion.
  function celebrate(page) {
    navigator.vibrate?.([40, 60, 120]);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colours = ['var(--accent)', 'var(--gym)', 'var(--home)', 'var(--cardio)', 'var(--calisthenics)', '#e0a800'];
    const burst = document.createElement('div');
    burst.className = 'confetti';
    burst.setAttribute('aria-hidden', 'true');
    burst.innerHTML = Array.from({ length: 36 }, (_, i) =>
      `<i style="--x: ${Math.round(Math.random() * 100)}%; --d: ${Math.round(Math.random() * 500)}ms; --r: ${Math.round(Math.random() * 720 - 360)}deg; background: ${colours[i % colours.length]}"></i>`).join('');
    page.append(burst);
    setTimeout(() => burst.remove(), 2600);
  }

  // ---------- Pieces for other screens ----------

  function activeCard() {
    const a = Store.state.active;
    if (!a) return '';
    const total = a.items.reduce((n, it) => n + it.sets.length, 0);
    const done = a.items.reduce((n, it) => n + it.sets.filter(s => s.done).length, 0);
    return `
      <a class="card link-card accent-card" href="#/session">
        <div>
          <p class="eyebrow on-accent">Workout in progress · <span data-elapsed>${elapsed(a)}</span></p>
          <h3>${esc(a.name)}</h3>
          <p class="small">${done} of ${total} sets done. Tap to carry on.</p>
        </div>
        ${icon('chevron', 'chev')}
      </a>`;
  }

  function recentList(limit = 30) {
    const list = (limit === Infinity ? Store.state.sessions.slice() : Store.state.sessions.slice(-limit)).reverse();
    if (!list.length) return '';
    return `
      <div class="list">
        ${list.map(r => {
          const { minutes } = stats(r);
          return `
            <a class="row-link" href="#/history/${r.id}">
              <span class="row-main">
                <strong>${esc(r.name)}</strong>
                <span class="muted small block">${esc(new Date(r.startedAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }))} · ${minutes} min · ${r.items.length} exercise${r.items.length === 1 ? '' : 's'}</span>
              </span>
              ${r.bests?.length ? icon('trophy', 'best-mark') : ''}
              ${icon('chevron', 'chev')}
            </a>`;
        }).join('')}
      </div>`;
  }

  return { session, history, startFromDay, startFromArea, sameSource, startFree, activeCard, recentList };
})();

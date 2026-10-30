'use strict';

// Train tab: training types → levels → program → day → exercise, plus the exercise library.
//   #/train
//   #/train/gym
//   #/train/gym/beginner
//   #/train/gym/beginner/1
//   #/ex/goblet-squat[/gym/beginner/1/0]   (the extra part shows that day's sets and reps)
//   #/area/upper                           upper or lower body workouts
//   #/area/upper/gym/beginner
//   #/ex/goblet-squat/area/upper/gym/beginner/0
//   #/library
//   #/x/Air_Bike                           an exercise from the full free-exercise-db library
const TrainScreens = (() => {
  const { icon, esc, sectionTitle } = UI;

  const findType = id => TRAINING_TYPES.find(t => t.id === id);
  const findLevel = id => LEVELS.find(l => l.id === id);
  const programFor = (typeId, levelId) => PROGRAMS[typeId]?.[levelId];
  const findArea = id => BODY_AREAS.find(a => a.id === id);
  const areaWorkout = (areaId, typeId, levelId) => AREA_WORKOUTS[areaId]?.[typeId]?.[levelId];

  function formatRest(seconds) {
    if (!seconds) return '';
    return seconds >= 120 && seconds % 60 === 0 ? `${seconds / 60} min rest` : `${seconds} s rest`;
  }
  const formatDose = item => (item.sets > 1 ? `${item.sets} × ${item.reps}` : item.reps);
  const doseLine = item => [formatDose(item), formatRest(item.rest)].filter(Boolean).join(' · ');

  const isMyProgram = (typeId, levelId) =>
    Store.state.program?.type === typeId && Store.state.program?.level === levelId;

  // Which training types and levels use each exercise, for the library filters.
  const typesByExercise = {};
  const levelByExercise = {};
  const LEVEL_RANK = { beginner: 0, intermediate: 1, advanced: 2 };
  function noteUse(exId, typeId, levelId) {
    (typesByExercise[exId] ||= new Set()).add(typeId);
    if (!(exId in levelByExercise) || LEVEL_RANK[levelId] < LEVEL_RANK[levelByExercise[exId]]) levelByExercise[exId] = levelId;
  }
  for (const [typeId, levels] of Object.entries(PROGRAMS)) {
    for (const [levelId, prog] of Object.entries(levels)) {
      for (const day of prog.days) for (const item of day.main) noteUse(item.ex, typeId, levelId);
    }
  }
  for (const types of Object.values(AREA_WORKOUTS)) {
    for (const [typeId, levels] of Object.entries(types)) {
      for (const [levelId, w] of Object.entries(levels)) for (const item of w.main) noteUse(item.ex, typeId, levelId);
    }
  }

  const bulletList = items => `<ul class="bullets">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;

  // ---------- Exercise photos ----------

  const photoSrc = (p, frame) => `images/exercises/${p.name}-${frame}.jpg`;

  // Start and finish photos stacked in one frame. They switch back and forth so you can see the movement.
  function photoFrame(id, { compact = false } = {}) {
    const p = EXERCISE_PHOTOS[id];
    if (!p) return '';
    return photoFigure((p.frames || [0, 1]).map(f => photoSrc(p, f)), EXERCISES[id]?.name || '', p.note, compact);
  }

  // srcs: the start photo, then the finish photo if there is one.
  function photoFigure(srcs, name, note = '', compact = false) {
    if (!srcs.length) return '';
    const imgs = srcs.map((src, k) => `
      <img src="${src}" alt="${esc(name)}, ${k ? 'finish' : 'start'} position" width="850" height="567"
        loading="lazy" decoding="async"${k === 0 ? ' class="on"' : ''}>`).join('');
    const toggle = srcs.length > 1
      ? `<div class="photo-toggle" role="group" aria-label="Show position">
           <button data-show="0" aria-pressed="true">Start</button>
           <button data-show="1" aria-pressed="false">Finish</button>
         </div>`
      : '';
    return `
      <figure class="ex-photo${compact ? ' compact' : ''}"${srcs.length > 1 ? ' data-cycle' : ''}>
        <div class="ex-photo-frame">${imgs}</div>
        ${toggle || note ? `<figcaption>${toggle}${note ? `<span class="muted small">${esc(note)}</span>` : ''}</figcaption>` : ''}
      </figure>`;
  }

  // Wires up the photo frames on a page: switches every 1.6 s until you tap Start or Finish.
  function startPhotos(page) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const fig of page.querySelectorAll('.ex-photo[data-cycle]')) {
      const imgs = fig.querySelectorAll('img');
      const buttons = fig.querySelectorAll('[data-show]');
      let shown = 0;
      const show = i => {
        shown = i;
        imgs.forEach((img, k) => img.classList.toggle('on', k === i));
        buttons.forEach((b, k) => b.setAttribute('aria-pressed', k === i));
      };
      const timer = reduceMotion ? null : setInterval(() => {
        if (!fig.isConnected) clearInterval(timer); // the page was replaced
        else show(1 - shown);
      }, 1600);
      fig.addEventListener('click', e => {
        const b = e.target.closest('[data-show]');
        if (!b) return;
        clearInterval(timer);
        show(Number(b.dataset.show));
      });
    }
  }

  // Small square picture for lists, or a plain icon when there's no photo.
  function thumb(id, number) {
    const p = EXERCISE_PHOTOS[id];
    return thumbFrom(p && photoSrc(p, (p.frames || [0, 1]).at(-1)), number);
  }

  function thumbFrom(src, number) {
    const badge = number ? `<span class="thumb-num">${number}</span>` : '';
    const inner = src ? `<img src="${src}" alt="" width="56" height="56" loading="lazy" decoding="async">` : icon('train');
    return `<span class="thumb${src ? '' : ' empty'}">${inner}${badge}</span>`;
  }

  // ---------- Train home ----------

  function train(typeId, levelId, dayNum) {
    const type = findType(typeId);
    const level = findLevel(levelId);
    if (type && level) {
      const day = programFor(type.id, level.id).days[Number(dayNum) - 1];
      return day ? trainDay(type, level, Number(dayNum)) : trainProgram(type, level);
    }
    if (type) return trainType(type);
    return trainHome();
  }

  function myProgramCard() {
    const mine = Store.state.program;
    const type = findType(mine?.type);
    const level = findLevel(mine?.level);
    if (!type || !level) return '';
    return `
      <a class="card link-card accent-card" href="#/train/${type.id}/${level.id}">
        <div>
          <p class="eyebrow on-accent">My program</p>
          <h3>${esc(type.name)} · ${esc(level.name)}</h3>
        </div>
        ${icon('chevron', 'chev')}
      </a>`;
  }

  function trainHome() {
    return {
      title: 'Train',
      html: `
        ${myProgramCard()}
        ${sectionTitle('By body area')}
        ${BODY_AREAS.map(a => `
          <a class="card link-card" href="#/area/${a.id}">
            <span class="type-icon" style="--c: var(--accent)">${icon(a.icon)}</span>
            <div>
              <h3>${esc(a.name)}</h3>
              <p class="muted small">${esc(a.blurb)} Gym, home or calisthenics, at every level.</p>
            </div>
            ${icon('chevron', 'chev')}
          </a>`).join('')}
        ${sectionTitle('Programs')}
        <p class="lead muted pad-x">Pick a training style. Each one has a beginner, intermediate and advanced program.</p>
        ${TRAINING_TYPES.map(t => `
          <a class="card link-card" href="#/train/${t.id}">
            <span class="type-icon" style="--c: var(--${t.id})">${icon(t.icon)}</span>
            <div>
              <h3>${esc(t.name)}</h3>
              <p class="muted small">${esc(t.blurb)}</p>
            </div>
            ${icon('chevron', 'chev')}
          </a>`).join('')}
        <a class="card link-card" href="#/library">
          <span class="type-icon" style="--c: var(--accent)">${icon('book')}</span>
          <div>
            <h3>Exercise library</h3>
            <p class="muted small">All ${Object.keys(EXERCISES).length} exercises with how-to steps and safety tips.</p>
          </div>
          ${icon('chevron', 'chev')}
        </a>
        <button class="card link-card as-button" data-action="free">
          <span class="type-icon" style="--c: var(--accent)">${icon('plusSquare')}</span>
          <div>
            <h3>Log my own workout</h3>
            <p class="muted small">Build a session from any exercises, outside your program.</p>
          </div>
          ${icon('chevron', 'chev')}
        </button>
        ${sectionTitle('Train safely')}
        <section class="card">
          <ul class="tips small">${SAFETY_TIPS.map(tip => `<li>${icon('shield', 'tip-icon')}<span>${esc(tip)}</span></li>`).join('')}</ul>
        </section>`,
      mount: page => page.querySelector('[data-action="free"]').addEventListener('click', () => Session.startFree()),
    };
  }

  // ---------- Type → choose a level ----------

  function trainType(type) {
    return {
      title: type.name,
      tab: 'train',
      back: { href: '#/train', label: 'Train' },
      html: `
        <section class="card type-hero" style="--c: var(--${type.id})">
          <span class="type-icon">${icon(type.icon)}</span>
          <p>${esc(type.blurb)}</p>
          <p class="muted small"><strong>Equipment:</strong> ${esc(type.equipment)}</p>
        </section>
        ${sectionTitle('Choose your level')}
        ${LEVELS.map(level => {
          const prog = programFor(type.id, level.id);
          return `
            <a class="card link-card" href="#/train/${type.id}/${level.id}">
              <div>
                <div class="level-head">
                  <h3>${esc(level.name)}</h3>
                  ${isMyProgram(type.id, level.id) ? '<span class="chip accent">My program</span>' : ''}
                </div>
                <p class="muted small">${esc(level.blurb)}</p>
                <div class="chips">
                  <span class="chip">${prog.days.length} days a week</span>
                  <span class="chip">${esc(prog.duration)}</span>
                </div>
              </div>
              ${icon('chevron', 'chev')}
            </a>`;
        }).join('')}`,
    };
  }

  // ---------- Program overview ----------

  function trainProgram(type, level) {
    const prog = programFor(type.id, level.id);
    const mine = isMyProgram(type.id, level.id);
    return {
      title: level.name,
      subtitle: type.name,
      tab: 'train',
      back: { href: `#/train/${type.id}`, label: type.name },
      html: `
        <section class="card stack">
          <p>${esc(prog.summary)}</p>
          <div class="chips">
            <span class="chip">${prog.days.length} days a week</span>
            <span class="chip">${esc(prog.duration)} per session</span>
          </div>
          ${mine
            ? `<p class="chosen">${icon('check', 'inline')} This is your program</p>`
            : '<button class="btn primary" data-action="choose">Make this my program</button>'}
        </section>

        ${sectionTitle('Your week')}
        <p class="muted small pad-x">${esc(prog.schedule)}</p>
        ${prog.days.map((day, i) => `
          <a class="card link-card" href="#/train/${type.id}/${level.id}/${i + 1}">
            <span class="day-num" style="--c: var(--${type.id})">${i + 1}</span>
            <div>
              <h3>${esc(day.name)}</h3>
              <p class="muted small">${esc(day.focus)} · ${day.main.length} exercise${day.main.length === 1 ? '' : 's'}</p>
            </div>
            ${icon('chevron', 'chev')}
          </a>`).join('')}

        ${sectionTitle('Coaching notes')}
        <section class="card coach">
          <div><h3>How hard to push</h3><p class="small">${esc(prog.effort)}</p></div>
          <div><h3>How to progress</h3><p class="small">${esc(prog.progression)}</p></div>
          <div><h3>Recovery weeks</h3><p class="small">${esc(prog.deload)}</p></div>
        </section>`,
      mount(page) {
        page.querySelector('[data-action="choose"]')?.addEventListener('click', () => {
          Store.update(s => { s.program = { type: type.id, level: level.id, next: 0 }; });
          App.refresh();
          UI.toast('Program saved');
        });
      },
    };
  }

  // ---------- One training day ----------

  // Warm-up, exercise list, cool-down and Start button. exPath is each exercise's address, minus its index.
  function workoutBody(typeId, workout, exPath, inProgress) {
    return `
        <p class="muted pad-x">${esc(workout.focus)}</p>
        ${workout.note ? `<section class="card note small">${esc(workout.note)}</section>` : ''}

        ${sectionTitle('Warm-up · 5–10 min')}
        <section class="card">${bulletList(WARMUPS[typeId])}</section>

        ${sectionTitle('Workout')}
        <div class="list">
          ${workout.main.map((item, i) => `
            <a class="row-link" href="#/ex/${item.ex}/${exPath}/${i}">
              ${thumb(item.ex, i + 1)}
              <span class="row-main">
                <strong>${esc(EXERCISES[item.ex].name)}</strong>
                <span class="muted small block">${esc(doseLine(item))}</span>
              </span>
              ${icon('chevron', 'chev')}
            </a>`).join('')}
        </div>

        ${sectionTitle('Cool-down · 5–10 min')}
        <section class="card">${bulletList([...COOLDOWNS.common, ...COOLDOWNS[typeId]])}</section>

        <button class="btn primary" data-action="start">${inProgress ? 'Carry on with this workout' : 'Start workout'}</button>
        <p class="hint center">Tick off each set as you go. A rest timer starts after every set.</p>`;
  }

  function trainDay(type, level, dayNum) {
    const day = programFor(type.id, level.id).days[dayNum - 1];
    return {
      title: day.name,
      subtitle: `${type.name} · ${level.name} · Day ${dayNum}`,
      tab: 'train',
      back: { href: `#/train/${type.id}/${level.id}`, label: level.name },
      html: workoutBody(type.id, day, `${type.id}/${level.id}/${dayNum}`, isInProgress({ type: type.id, level: level.id, dayNum })),
      mount(page) {
        page.querySelector('[data-action="start"]').addEventListener('click', () => Session.startFromDay(type.id, level.id, dayNum));
      },
    };
  }

  const isInProgress = source => Session.sameSource(Store.state.active?.source, source);

  // ---------- Upper and lower body ----------

  function area(areaId, typeId, levelId) {
    const a = findArea(areaId);
    if (!a) return trainHome();
    const type = findType(typeId);
    const level = findLevel(levelId);
    if (type && level && areaWorkout(a.id, type.id, level.id)) return areaDay(a, type, level);
    return areaHome(a);
  }

  function areaHome(a) {
    return {
      title: a.name,
      tab: 'train',
      back: { href: '#/train', label: 'Train' },
      html: `
        <section class="card type-hero" style="--c: var(--accent)">
          <span class="type-icon">${icon(a.icon)}</span>
          <p>${esc(a.blurb)} Choose where you train and your level.</p>
          <p class="muted small">${esc(a.plan)}</p>
        </section>
        ${AREA_TYPES.map(findType).map(type => `
          ${sectionTitle(type.name)}
          <div class="list">
            ${LEVELS.map(level => {
              const w = areaWorkout(a.id, type.id, level.id);
              return `
                <a class="row-link" href="#/area/${a.id}/${type.id}/${level.id}">
                  <span class="type-icon row-icon" style="--c: var(--${type.id})">${icon(type.icon)}</span>
                  <span class="row-main">
                    <strong>${esc(level.name)}</strong>
                    <span class="muted small block">${w.main.length} exercises · ${esc(w.duration)}</span>
                  </span>
                  ${isInProgress({ area: a.id, type: type.id, level: level.id }) ? '<span class="chip accent">In progress</span>' : ''}
                  ${icon('chevron', 'chev')}
                </a>`;
            }).join('')}
          </div>`).join('')}`,
    };
  }

  function areaDay(a, type, level) {
    const w = areaWorkout(a.id, type.id, level.id);
    return {
      title: a.name,
      subtitle: `${type.name} · ${level.name} · ${w.duration}`,
      tab: 'train',
      back: { href: `#/area/${a.id}`, label: a.name },
      html: workoutBody(type.id, w, `area/${a.id}/${type.id}/${level.id}`, isInProgress({ area: a.id, type: type.id, level: level.id })),
      mount(page) {
        page.querySelector('[data-action="start"]').addEventListener('click', () => Session.startFromArea(a.id, type.id, level.id));
      },
    };
  }

  // ---------- Exercise detail ----------

  // Which workout an exercise page was opened from, so it can show that workout's sets and reps.
  function workoutItem(params) {
    if (params[0] === 'area') {
      const [, areaId, typeId, levelId, index] = params;
      const item = areaWorkout(areaId, typeId, levelId)?.main[Number(index)];
      return item && { item, typeId, back: { href: `#/area/${areaId}/${typeId}/${levelId}`, label: findArea(areaId).name } };
    }
    const [typeId, levelId, dayNum, index] = params;
    const day = programFor(typeId, levelId)?.days[Number(dayNum) - 1];
    const item = day?.main[Number(index)];
    return item && { item, typeId, back: { href: `#/train/${typeId}/${levelId}/${dayNum}`, label: day.name } };
  }

  function exercise(id, ...params) {
    const ex = EXERCISES[id];
    if (!ex) return library();
    const { item, typeId, back } = workoutItem(params) || {};
    const fav = Store.isFavourite('exercises', id);
    // Calisthenics is bodyweight only, so show the no-weights version of the tips.
    const bw = typeId === 'calisthenics' ? ex.bodyweight || {} : {};
    const equipment = bw.equipment || ex.equipment;
    const harder = bw.harder || ex.harder;

    return {
      title: ex.name,
      tab: 'train',
      back: back || { href: '#/library', label: 'Exercises' },
      html: `
        ${photoFrame(id)}

        <section class="card facts">
          <div><span class="label">Works</span><span>${esc(ex.muscles)}</span></div>
          <div><span class="label">Equipment</span><span>${esc(equipment)}</span></div>
          <div><span class="label">Level</span><span>${esc(ExerciseDB.levelName(levelFor(id)))} and up</span></div>
        </section>

        ${item ? `
          <section class="dose${item.rest ? '' : ' no-rest'}">
            <div class="stat"><div class="stat-value">${item.sets}</div><div class="stat-label">${typeId === 'cardio' ? 'Rounds' : item.sets === 1 ? 'Set' : 'Sets'}</div></div>
            <div class="stat"><div class="stat-value text">${esc(item.reps)}</div><div class="stat-label">${typeId === 'cardio' ? 'Each round' : 'Reps or time'}</div></div>
            ${item.rest ? `<div class="stat"><div class="stat-value text">${esc(formatRest(item.rest).replace(' rest', ''))}</div><div class="stat-label">Rest</div></div>` : ''}
          </section>
          ${item.note ? `<section class="card note small">${esc(item.note)}</section>` : ''}` : ''}

        ${sectionTitle('How to do it')}
        <section class="card"><ol class="howto">${ex.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></section>

        ${sectionTitle('Safety tips')}
        <section class="card">
          <ul class="tips small">${ex.safety.map(t => `<li>${icon('shield', 'tip-icon')}<span>${esc(t)}</span></li>`).join('')}</ul>
        </section>

        ${sectionTitle('Adjust it')}
        <section class="card coach">
          <div><h3>Too hard?</h3><p class="small">${esc(ex.easier)}</p></div>
          <div><h3>Too easy?</h3><p class="small">${esc(harder)}</p></div>
        </section>

        <button class="btn fav" data-action="fav" aria-pressed="${fav}">
          ${icon('heart', 'inline')} ${fav ? 'Saved to favourites' : 'Save to favourites'}
        </button>`,
      mount(page) {
        startPhotos(page);
        page.querySelector('[data-action="fav"]').addEventListener('click', () => {
          const added = Store.toggleFavourite('exercises', id);
          App.refresh();
          UI.toast(added ? 'Saved to favourites' : 'Removed from favourites');
        });
      },
    };
  }

  // ---------- Exercise library ----------

  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'favourites', label: 'Favourites' },
    ...TRAINING_TYPES.map(t => ({ id: t.id, label: t.name.replace(' workouts', '').replace(' weights', '') })),
    { id: 'stretching', label: 'Stretching' },
  ];
  // Kept while the app is open, so going back to the library keeps your search.
  const lib = { type: 'all', q: '', muscle: '', gear: '', level: '', shown: 40 };
  const PAGE = 40;

  function filterSelect(name, label, options) {
    return `
      <select name="${name}" aria-label="${label}" class="${lib[name] ? 'set' : ''}">
        <option value="">${esc(label)}</option>
        ${options.map(o => `<option value="${o.id}"${lib[name] === o.id ? ' selected' : ''}>${esc(o.name)}</option>`).join('')}
      </select>`;
  }

  const coachedRow = e => `
    <a class="row-link" href="#/ex/${e.id}">
      ${thumb(e.id)}
      <span class="row-main">
        <strong>${esc(e.name)}</strong>
        <span class="muted small block">${esc(EXERCISES[e.id].muscles)}</span>
      </span>
      ${Store.isFavourite('exercises', e.id) ? icon('heart', 'fav-mark') : ''}
      ${icon('chevron', 'chev')}
    </a>`;

  const extraRow = e => `
    <a class="row-link" href="#/x/${encodeURIComponent(e.id)}">
      ${thumbFrom(ExerciseDB.photos(e).at(-1))}
      <span class="row-main">
        <strong>${esc(e.name)}</strong>
        <span class="muted small block">${esc(ExerciseDB.muscleNames(e.primary))} · ${esc(ExerciseDB.gearName(e.gear))} · ${esc(ExerciseDB.levelName(e.level))}</span>
      </span>
      ${icon('chevron', 'chev')}
    </a>`;

  function library() {
    return {
      title: 'Exercises',
      tab: 'train',
      back: { href: '#/train', label: 'Train' },
      html: `
        <input type="search" class="search" placeholder="Search by name or muscle" value="${esc(lib.q)}" aria-label="Search exercises">
        <div class="filters" role="group" aria-label="Workout type">
          ${FILTERS.map(f => `<button class="filter" data-filter="${f.id}" aria-pressed="${f.id === lib.type}">${esc(f.label)}</button>`).join('')}
        </div>
        <div class="filter-selects">
          ${filterSelect('muscle', 'Muscle', ExerciseDB.MUSCLE_GROUPS)}
          ${filterSelect('gear', 'Equipment', ExerciseDB.GEAR)}
          ${filterSelect('level', 'Level', LEVELS.map(l => ({ id: l.id, name: l.name })))}
        </div>
        <div class="results"></div>`,
      mount(page) {
        const results = page.querySelector('.results');
        const draw = () => {
          const query = { ...lib, q: lib.q.trim().toLowerCase() };
          const mine = ExerciseDB.coached().filter(e => ExerciseDB.matches(e, query)).sort((x, y) => x.name.localeCompare(y.name));
          const more = lib.type === 'favourites' ? [] : ExerciseDB.extra().filter(e => ExerciseDB.matches(e, query));
          const pending = !ExerciseDB.loaded() && lib.type !== 'favourites';
          const shown = more.slice(0, lib.shown);
          if (!mine.length && !more.length && !pending) {
            results.innerHTML = `<section class="card empty"><p class="muted">${lib.type === 'favourites' && !query.q
              ? 'No favourites yet. Tap “Save to favourites” on any exercise.'
              : 'No exercises match. Try clearing a filter.'}</p></section>`;
            return;
          }
          results.innerHTML = `
            ${mine.length ? `
              <p class="muted small pad-x"><strong>Coached</strong> · ${mine.length} with safety tips and easier/harder versions</p>
              <div class="list">${mine.map(coachedRow).join('')}</div>` : ''}
            ${more.length ? `
              <p class="muted small pad-x list-head"><strong>More exercises</strong> · ${more.length}</p>
              <div class="list">${shown.map(extraRow).join('')}</div>
              ${more.length > shown.length ? `<button class="btn quiet" data-action="more">Show more (${more.length - shown.length} left)</button>` : ''}` : ''}
            ${pending ? '<p class="muted small center" data-status>Loading more exercises…</p>' : ''}`;
        };
        const changed = () => { lib.shown = PAGE; draw(); };
        page.querySelector('.search').addEventListener('input', e => { lib.q = e.target.value; changed(); });
        page.querySelector('.filters').addEventListener('click', e => {
          const b = e.target.closest('[data-filter]');
          if (!b) return;
          lib.type = b.dataset.filter;
          page.querySelectorAll('.filter').forEach(f => f.setAttribute('aria-pressed', f === b));
          changed();
        });
        page.querySelector('.filter-selects').addEventListener('change', e => {
          lib[e.target.name] = e.target.value;
          e.target.classList.toggle('set', !!e.target.value);
          changed();
        });
        results.addEventListener('click', e => {
          if (!e.target.closest('[data-action="more"]')) return;
          lib.shown += PAGE;
          draw();
        });
        draw();
        if (!ExerciseDB.loaded()) {
          ExerciseDB.load()
            .then(() => { if (page.isConnected) draw(); })
            .catch(() => {
              const status = page.querySelector('[data-status]');
              if (status) status.textContent = "Couldn't load the full library. Check your signal and try again.";
            });
        }
      },
    };
  }

  // An exercise from free-exercise-db: photos, muscles and steps, plus general safety tips.
  function extraExercise(id) {
    const e = ExerciseDB.get(id);
    const back = { href: '#/library', label: 'Exercises' };
    if (!e) {
      return {
        title: 'Exercise',
        tab: 'train',
        back,
        html: '<section class="card empty"><p class="muted" data-status>Loading…</p></section>',
        mount(page) {
          const status = page.querySelector('[data-status]');
          if (ExerciseDB.loaded()) { status.textContent = 'Exercise not found.'; return; }
          ExerciseDB.load()
            .then(() => { if (page.isConnected) App.refresh(); })
            .catch(() => { status.textContent = "Couldn't load this exercise. Check your signal and try again."; });
        },
      };
    }
    return {
      title: e.name,
      tab: 'train',
      back,
      html: `
        ${photoFigure(ExerciseDB.photos(e), e.name)}

        <section class="card facts">
          <div><span class="label">Works</span><span>${esc(ExerciseDB.muscleNames(e.primary))}</span></div>
          ${e.secondary.length ? `<div><span class="label">Also works</span><span>${esc(ExerciseDB.muscleNames(e.secondary))}</span></div>` : ''}
          <div><span class="label">Equipment</span><span>${esc(ExerciseDB.gearName(e.gear))}</span></div>
          <div><span class="label">Level</span><span>${esc(ExerciseDB.levelName(e.level))}</span></div>
          <div><span class="label">Type</span><span>${esc(ExerciseDB.CATEGORY_NAMES[e.category] || e.category)}</span></div>
        </section>

        ${sectionTitle('How to do it')}
        <section class="card"><ol class="howto">${e.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></section>

        ${sectionTitle('Train safely')}
        <section class="card">
          <ul class="tips small">${SAFETY_TIPS.slice(0, 3).map(t => `<li>${icon('shield', 'tip-icon')}<span>${esc(t)}</span></li>`).join('')}</ul>
        </section>
        <p class="muted small pad-x credit">From free-exercise-db, public domain. Start light and learn the movement before adding effort.</p>`,
      mount: startPhotos,
    };
  }

  // The next session in "My program", for the Today screen.
  function nextWorkout() {
    const mine = Store.state.program;
    const type = findType(mine?.type);
    const level = findLevel(mine?.level);
    if (!type || !level) return null;
    const days = programFor(type.id, level.id).days;
    const index = (mine.next || 0) % days.length;
    return { type, level, day: days[index], dayNum: index + 1 };
  }

  const typesFor = id => typesByExercise[id] || new Set();
  const levelFor = id => levelByExercise[id] || 'beginner';

  return { train, area, exercise, extraExercise, library, nextWorkout, typesFor, levelFor, doseLine, photoFrame, startPhotos, thumb };
})();

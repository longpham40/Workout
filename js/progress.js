'use strict';

// Progress tab: weigh-ins, workout and strength charts, personal bests and favourites.
//   #/progress
//   #/weights       all weigh-ins
//   #/bests         personal bests for every exercise
//   #/favourites    saved exercises and recipes
const ProgressScreens = (() => {
  const { icon, esc, stat, sectionTitle } = UI;
  const { shortDate, parseDate } = Charts;

  const LB = 2.20462;
  const imperial = () => Store.state.profile.units === 'imperial';
  const weightUnit = () => (imperial() ? 'lb' : 'kg');
  const showWeight = kg => Math.round((imperial() ? kg * LB : kg) * 10) / 10;
  const toKg = (w, unit) => (unit === 'lb' ? w / LB : w);
  const fmt = n => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  const longDate = iso => parseDate(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  function mondayOf(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return UI.isoDate(d);
  }

  // ---------- Body weight ----------

  const weighIns = () => [...Store.state.bodyWeights].sort((a, b) => a.date.localeCompare(b.date));

  function saveWeight(value) {
    const n = parseFloat(String(value).replace(',', '.'));
    const kg = imperial() ? n / LB : n;
    if (!Number.isFinite(kg) || kg < 25 || kg > 350) {
      UI.toast('Enter your weight as a number');
      return false;
    }
    const today = UI.isoDate();
    Store.update(s => {
      s.bodyWeights = s.bodyWeights.filter(w => w.date !== today);
      s.bodyWeights.push({ date: today, kg: Math.round(kg * 100) / 100 });
      // Keep the profile in step so calorie targets follow your weight.
      const latest = [...s.bodyWeights].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
      s.profile.weightKg = latest.kg;
    });
    UI.toast('Weight saved. Your targets are updated.');
    return true;
  }

  const weighForm = () => `
    <form class="weigh-form" data-form="weigh">
      <label class="field">
        <span class="label">Today’s weight (${weightUnit()})</span>
        <input name="weight" type="text" inputmode="decimal" autocomplete="off" placeholder="${imperial() ? 'e.g. 176.4' : 'e.g. 80.2'}">
      </label>
      <button class="btn primary" type="submit">Save</button>
    </form>`;

  function wireWeighForm(page) {
    page.querySelector('[data-form="weigh"]')?.addEventListener('submit', e => {
      e.preventDefault();
      if (saveWeight(e.target.elements.weight.value)) App.refresh();
    });
  }

  function weightPoints(entries) {
    return entries.map(w => ({
      date: w.date,
      value: showWeight(w.kg),
      tip: `${shortDate(w.date)}: ${fmt(showWeight(w.kg))} ${weightUnit()}`,
    }));
  }

  function weightCard() {
    const all = weighIns();
    const unit = weightUnit();
    if (!all.length) {
      return `
        <section class="card stack">
          <h3>Body weight</h3>
          <p class="muted small">Weigh yourself first thing in the morning, 2–3 times a week. The trend matters more than any single day.</p>
          ${weighForm()}
        </section>`;
    }
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const recent = all.filter(w => w.date >= UI.isoDate(since));
    const shown = recent.length >= 2 ? recent : all.slice(-12);
    const latest = all.at(-1);
    const change = showWeight(latest.kg) - showWeight(shown[0].kg);
    return `
      <section class="card stack">
        <div class="card-head">
          <h3>Body weight</h3>
          <a class="small" href="#/weights">All weigh-ins</a>
        </div>
        <div class="headline">
          <span class="big">${fmt(showWeight(latest.kg))}<small>${unit}</small></span>
          ${shown.length > 1 ? `<span class="muted small">${change > 0 ? '+' : change < 0 ? '−' : '±'}${fmt(Math.abs(Math.round(change * 10) / 10))} ${unit} since ${shortDate(shown[0].date)}</span>` : ''}
        </div>
        ${shown.length > 1 ? '<div class="chart-box" data-chart="weight"></div>' : '<p class="muted small">Log a few more weigh-ins to see your trend.</p>'}
        ${weighForm()}
      </section>`;
  }

  // ---------- Workouts per week ----------

  function weeklyCounts(weeks = 8) {
    const starts = [];
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    for (let i = weeks - 1; i >= 0; i--) {
      const w = new Date(d);
      w.setDate(d.getDate() - i * 7);
      starts.push(UI.isoDate(w));
    }
    const counts = Object.fromEntries(starts.map(s => [s, 0]));
    for (const s of Store.state.sessions) {
      const week = mondayOf(parseDate(s.date));
      if (week in counts) counts[week] += 1;
    }
    return starts.map(s => ({ week: s, count: counts[s] }));
  }

  // Weeks in a row with at least one workout. This week counts once you train.
  function weekStreak() {
    const weeks = new Set(Store.state.sessions.map(s => mondayOf(parseDate(s.date))));
    const d = parseDate(mondayOf(new Date()));
    if (!weeks.has(UI.isoDate(d))) d.setDate(d.getDate() - 7);
    let streak = 0;
    while (weeks.has(UI.isoDate(d))) {
      streak += 1;
      d.setDate(d.getDate() - 7);
    }
    return streak;
  }

  // ---------- Strength and personal bests ----------

  // Estimated one-rep max (Epley formula). Only sets of 1–12 reps give a fair estimate.
  const e1rm = (s, unit) => (s.reps >= 1 && s.reps <= 12 && s.weight ? toKg(s.weight, unit) * (s.reps === 1 ? 1 : 1 + s.reps / 30) : 0);
  const E1RM = { name: 'Estimated one-rep max', value: e1rm, isWeight: true };

  const MEASURES = {
    weight: { name: 'Heaviest set', value: (s, unit) => (s.reps ? toKg(s.weight || 0, unit) : 0), isWeight: true },
    carry: { name: 'Heaviest carry', value: (s, unit) => toKg(s.weight || 0, unit), isWeight: true },
    bw: { name: 'Most reps in a set', value: s => s.reps || 0, suffix: ' reps' },
    hold: { name: 'Longest hold', value: s => s.secs || 0, suffix: ' s' },
  };

  const keyFor = item => (item.ex ? item.ex : `custom:${item.name}`);
  const showMeasure = (m, v) => (m.isWeight ? `${fmt(showWeight(v))} ${weightUnit()}` : `${fmt(v)}${m.suffix}`);

  // Every exercise you've logged that has something to measure, with its best per workout.
  function exerciseHistories() {
    const map = new Map();
    for (const session of Store.state.sessions) {
      for (const item of session.items) {
        const m = MEASURES[item.kind];
        if (!m) continue;
        const best = Math.max(...item.sets.map(s => m.value(s, session.unit)));
        if (!best) continue;
        const key = keyFor(item);
        if (!map.has(key)) map.set(key, { key, name: item.name, measure: m, points: [], e1rm: [] });
        map.get(key).points.push({ date: session.date, value: best });
        if (item.kind === 'weight') {
          const est = Math.max(...item.sets.map(s => e1rm(s, session.unit)));
          if (est) map.get(key).e1rm.push({ date: session.date, value: est });
        }
      }
    }
    return [...map.values()];
  }

  // The chosen exercise, and whether to chart its heaviest set or estimated 1RM.
  function chosenHistory() {
    const histories = exerciseHistories();
    if (!histories.length) return null;
    const chosenKey = Store.state.ui.progressExercise;
    // Default to the exercise you've logged most often.
    const h = histories.find(x => x.key === chosenKey) ||
      [...histories].sort((a, b) => b.points.length - a.points.length)[0];
    const useE1rm = Store.state.ui.progressMeasure === 'e1rm' && h.e1rm.length > 0;
    return { histories, h, measure: useE1rm ? E1RM : h.measure, points: useE1rm ? h.e1rm : h.points, useE1rm };
  }

  function strengthCard() {
    const c = chosenHistory();
    if (!c) return '';
    const { histories, h, measure, points, useE1rm } = c;
    const best = Math.max(...points.map(p => p.value));
    return `
      <section class="card stack">
        <h3>Strength progress</h3>
        <label class="field">
          <span class="label">Exercise</span>
          <select data-select="exercise">
            ${[...histories].sort((a, b) => a.name.localeCompare(b.name)).map(x =>
              `<option value="${esc(x.key)}"${x.key === h.key ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}
          </select>
        </label>
        ${h.e1rm.length ? `
          <div class="segmented" role="group" aria-label="What to chart">
            <label><input type="radio" name="measure" value="best"${useE1rm ? '' : ' checked'}><span>Heaviest set</span></label>
            <label><input type="radio" name="measure" value="e1rm"${useE1rm ? ' checked' : ''}><span>Estimated 1RM</span></label>
          </div>` : ''}
        <div class="headline">
          <span class="big">${esc(showMeasure(measure, best).replace(/ (kg|lb|reps|s)$/, ''))}<small>${esc(showMeasure(measure, best).match(/ (kg|lb|reps|s)$/)?.[1] || '')}</small></span>
          <span class="muted small">Best ${esc(measure.name.toLowerCase())}</span>
        </div>
        ${useE1rm ? '<p class="muted small">Worked out from your best set of 1–12 reps each workout. A guide, not a target to test.</p>' : ''}
        ${points.length > 1
          ? `<div class="chart-box" data-chart="strength"></div>
             ${Charts.table(['Date', measure.name], [...points].reverse().map(p => [longDate(p.date), showMeasure(measure, p.value)]))}`
          : `<p class="muted small">Logged once so far. Do it again to see a trend.</p>`}
      </section>`;
  }

  // ---------- Weekly volume ----------

  // Weight × reps for every weighted set, per week, in your units.
  function weeklyVolume(weeks = 8) {
    const counts = weeklyCounts(weeks);
    const totals = Object.fromEntries(counts.map(w => [w.week, 0]));
    for (const s of Store.state.sessions) {
      const week = mondayOf(parseDate(s.date));
      if (!(week in totals)) continue;
      for (const item of s.items) {
        if (item.kind !== 'weight') continue;
        for (const set of item.sets) totals[week] += showWeight(toKg(set.weight || 0, s.unit)) * (set.reps || 0);
      }
    }
    return counts.map(w => ({ week: w.week, volume: Math.round(totals[w.week]) }));
  }

  function volumeCard(vol) {
    if (!vol.some(w => w.volume)) return '';
    const unit = weightUnit();
    const thisWeek = vol.at(-1).volume;
    return `
      <section class="card stack">
        <h3>Weekly volume</h3>
        <div class="headline">
          <span class="big">${thisWeek.toLocaleString()}<small>${unit}</small></span>
          <span class="muted small">Lifted this week (weight × reps)</span>
        </div>
        <div class="chart-box" data-chart="volume"></div>
        ${Charts.table(['Week starting', `Volume (${unit})`], [...vol].reverse().map(w => [shortDate(w.week), w.volume.toLocaleString()]))}
      </section>`;
  }

  // ---------- Calendar ----------

  let calendarMonth = null; // first day of the month shown, 'YYYY-MM-01'

  function calendarCard() {
    const today = UI.isoDate();
    calendarMonth ||= `${today.slice(0, 7)}-01`;
    const first = parseDate(calendarMonth);
    const year = first.getFullYear();
    const month = first.getMonth();
    const daysIn = new Date(year, month + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7; // Monday first
    const byDate = {};
    for (const s of Store.state.sessions) (byDate[s.date] ||= []).push(s);
    const monthName = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const trained = Object.keys(byDate).filter(d => d.startsWith(calendarMonth.slice(0, 7))).length;
    const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(undefined, { weekday: 'narrow' }));
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<span></span>');
    for (let day = 1; day <= daysIn; day++) {
      const iso = UI.isoDate(new Date(year, month, day));
      const list = byDate[iso];
      const label = `${parseDate(iso).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}${list ? `: ${list.map(s => s.name).join(', ')}` : ''}`;
      cells.push(list
        ? `<a class="cal-day trained${iso === today ? ' today' : ''}" href="#/history/${list[0].id}" aria-label="${esc(label)}">${day}${list.length > 1 ? `<small>${list.length}</small>` : ''}</a>`
        : `<span class="cal-day${iso === today ? ' today' : ''}" aria-label="${esc(label)}">${day}</span>`);
    }
    const thisMonth = calendarMonth === `${today.slice(0, 7)}-01`;
    return `
      <section class="card stack calendar">
        <div class="card-head">
          <button class="icon-btn" data-cal="-1" aria-label="Previous month">${icon('back')}</button>
          <h3>${esc(monthName)}</h3>
          <button class="icon-btn" data-cal="1" aria-label="Next month"${thisMonth ? ' disabled' : ''}>${icon('chevron')}</button>
        </div>
        <div class="cal-grid" role="list">
          ${weekdays.map(w => `<span class="cal-head" aria-hidden="true">${esc(w)}</span>`).join('')}
          ${cells.join('')}
        </div>
        <p class="muted small">${trained ? `Trained on ${trained} day${trained === 1 ? '' : 's'} this month. Tap a day to see the workout.` : 'No workouts this month yet.'}</p>
      </section>`;
  }

  function recentBests(limit) {
    const list = [];
    for (const s of [...Store.state.sessions].reverse()) {
      for (const b of s.bests || []) list.push({ ...b, date: s.date });
      if (list.length >= limit) break;
    }
    return list.slice(0, limit);
  }

  // ---------- Progress screen ----------

  function progress() {
    const s = Store.state;
    const weeks = weeklyCounts();
    const vol = weeklyVolume();
    const favs = s.favourites.exercises.length + s.favourites.recipes.length;
    const bests = recentBests(3);
    const needsBackup = s.sessions.length >= 3 &&
      (!s.ui.lastBackup || (Date.now() - +parseDate(s.ui.lastBackup)) / 86400000 > 30);

    return {
      title: 'Progress',
      html: `
        <section class="stats">
          ${stat('Workouts', s.sessions.length)}
          ${stat('This week', weeks.at(-1).count)}
          ${stat('Week streak', weekStreak())}
        </section>

        ${needsBackup ? `
          <a class="card link-card note" href="#/settings">
            <div><h3>Back up your progress</h3><p class="small">Your history lives only on this phone. Export a backup in Settings now and then.</p></div>
            ${icon('chevron', 'chev')}
          </a>` : ''}

        ${s.sessions.length ? calendarCard() : ''}

        ${weightCard()}

        ${s.sessions.length ? `
          <section class="card stack">
            <h3>Workouts per week</h3>
            <div class="chart-box" data-chart="weeks"></div>
            ${Charts.table(['Week starting', 'Workouts'], [...weeks].reverse().map(w => [shortDate(w.week), String(w.count)]))}
          </section>` : ''}

        ${strengthCard()}

        ${volumeCard(vol)}

        ${bests.length ? `
          ${sectionTitle('Personal bests')}
          <section class="card bests">
            <ul>${bests.map(b => `<li>${esc(b.name)}: <strong>${esc(b.label)}</strong> <span class="muted small">· ${shortDate(b.date)}</span></li>`).join('')}</ul>
          </section>` : ''}
        ${exerciseHistories().length ? '<a class="btn quiet" href="#/bests">See all personal bests</a>' : ''}

        ${sectionTitle('Recent workouts')}
        ${s.sessions.length
          ? `${Session.recentList(5)}${s.sessions.length > 5 ? '<a class="btn quiet" href="#/history">See all workouts</a>' : ''}`
          : `<section class="card empty">
               <span class="type-icon" style="--c: var(--accent)">${icon('progress')}</span>
               <h3>No workouts yet</h3>
               <p class="muted small">Finish a workout and it will show up here, along with any personal bests.</p>
               <a class="btn primary" href="#/train">Start training</a>
             </section>`}

        <a class="card link-card" href="#/favourites">
          <span class="type-icon" style="--c: var(--cardio)">${icon('heart')}</span>
          <div><h3>Favourites</h3><p class="muted small">${favs ? `${favs} saved` : 'Exercises and recipes you save appear here.'}</p></div>
          ${icon('chevron', 'chev')}
        </a>`,
      mount(page) {
        wireWeighForm(page);
        const weightBox = page.querySelector('[data-chart="weight"]');
        if (weightBox) {
          const since = new Date();
          since.setDate(since.getDate() - 90);
          const all = weighIns();
          const recent = all.filter(w => w.date >= UI.isoDate(since));
          Charts.line(weightBox, { points: weightPoints(recent.length >= 2 ? recent : all.slice(-12)), label: 'Body weight', format: v => `${fmt(v)} ${weightUnit()}` });
        }
        const weeksBox = page.querySelector('[data-chart="weeks"]');
        if (weeksBox) {
          Charts.bars(weeksBox, {
            label: 'Workouts per week',
            bars: weeks.map(w => ({ label: shortDate(w.week), value: w.count, tip: `Week of ${shortDate(w.week)}: ${w.count} workout${w.count === 1 ? '' : 's'}` })),
          });
        }
        const strengthBox = page.querySelector('[data-chart="strength"]');
        if (strengthBox) {
          const { h, measure, points } = chosenHistory();
          Charts.line(strengthBox, {
            label: `${h.name}, ${measure.name.toLowerCase()}`,
            points: points.map(p => ({
              date: p.date,
              value: measure.isWeight ? showWeight(p.value) : p.value,
              tip: `${shortDate(p.date)}: ${showMeasure(measure, p.value)}`,
            })),
            format: v => (measure.isWeight ? `${fmt(v)} ${weightUnit()}` : `${fmt(v)}${measure.suffix}`),
          });
        }
        const volumeBox = page.querySelector('[data-chart="volume"]');
        if (volumeBox) {
          Charts.bars(volumeBox, {
            label: `Weekly volume in ${weightUnit()}`,
            bars: vol.map(w => ({ label: shortDate(w.week), value: w.volume, tip: `Week of ${shortDate(w.week)}: ${w.volume.toLocaleString()} ${weightUnit()}` })),
          });
        }
        page.querySelector('[data-select="exercise"]')?.addEventListener('change', e => {
          Store.update(s => { s.ui.progressExercise = e.target.value; });
          App.refresh();
        });
        page.querySelectorAll('input[name="measure"]').forEach(r => r.addEventListener('change', e => {
          Store.update(s => { s.ui.progressMeasure = e.target.value; });
          App.refresh();
        }));
        page.querySelector('.calendar')?.addEventListener('click', e => {
          const b = e.target.closest('[data-cal]');
          if (!b) return;
          const d = parseDate(calendarMonth);
          d.setMonth(d.getMonth() + Number(b.dataset.cal));
          calendarMonth = UI.isoDate(d);
          App.refresh();
        });
      },
    };
  }

  // ---------- All weigh-ins ----------

  function weights() {
    const all = weighIns();
    const unit = weightUnit();
    return {
      title: 'Weigh-ins',
      tab: 'progress',
      back: { href: '#/progress', label: 'Progress' },
      html: `
        <section class="card stack">
          ${all.length > 1 ? '<div class="chart-box" data-chart="all-weights"></div>' : ''}
          ${weighForm()}
        </section>
        ${all.length ? `
          ${sectionTitle(`${all.length} weigh-in${all.length === 1 ? '' : 's'}`)}
          <div class="list">
            ${[...all].reverse().map(w => `
              <div class="row-static row-flex">
                <span class="row-main"><strong>${fmt(showWeight(w.kg))} ${unit}</strong><span class="muted small block">${longDate(w.date)}</span></span>
                <button class="btn small-btn quiet" data-delete="${w.date}" aria-label="Delete weigh-in from ${longDate(w.date)}">Delete</button>
              </div>`).join('')}
          </div>` : '<p class="muted center">No weigh-ins yet.</p>'}`,
      mount(page) {
        wireWeighForm(page);
        const box = page.querySelector('[data-chart="all-weights"]');
        if (box) Charts.line(box, { points: weightPoints(all), label: 'Body weight', format: v => `${fmt(v)} ${unit}` });
        page.addEventListener('click', e => {
          const date = e.target.closest('[data-delete]')?.dataset.delete;
          if (!date || !confirm('Delete this weigh-in?')) return;
          Store.update(s => { s.bodyWeights = s.bodyWeights.filter(w => w.date !== date); });
          App.refresh();
        });
      },
    };
  }

  // ---------- All personal bests ----------

  function bests() {
    const list = exerciseHistories()
      .map(h => {
        const top = h.points.reduce((a, b) => (b.value > a.value ? b : a));
        return { ...h, top };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      title: 'Personal bests',
      tab: 'progress',
      back: { href: '#/progress', label: 'Progress' },
      html: list.length
        ? `<div class="list">${list.map(h => `
            <div class="row-static row-flex">
              <span class="row-main">
                <strong>${esc(h.name)}</strong>
                <span class="muted small block">${esc(h.measure.name)} · ${longDate(h.top.date)}</span>
              </span>
              <strong class="best-value">${esc(showMeasure(h.measure, h.top.value))}</strong>
            </div>`).join('')}</div>`
        : '<section class="card empty"><p class="muted">Log some workouts to see your bests.</p></section>',
    };
  }

  // ---------- Favourites ----------

  function favourites() {
    const { exercises, recipes } = Store.state.favourites;
    const exRows = exercises.filter(id => EXERCISES[id]);
    const recipeRows = recipes.filter(id => RECIPES[id]);
    return {
      title: 'Favourites',
      tab: 'progress',
      back: { href: '#/progress', label: 'Progress' },
      html: `
        ${sectionTitle('Exercises')}
        ${exRows.length
          ? `<div class="list">${exRows.map(id => `
              <a class="row-link" href="#/ex/${id}">
                <span class="row-main"><strong>${esc(EXERCISES[id].name)}</strong><span class="muted small block">${esc(EXERCISES[id].muscles)}</span></span>
                ${icon('chevron', 'chev')}
              </a>`).join('')}</div>`
          : '<p class="muted small pad-x">None yet. Tap “Save to favourites” on any exercise.</p>'}
        ${sectionTitle('Recipes')}
        ${recipeRows.length
          ? `<div class="list">${recipeRows.map(id => `
              <a class="row-link" href="#/recipe/${id}">
                <span class="row-main"><strong>${esc(RECIPES[id].name)}</strong><span class="muted small block">${RECIPES[id].kcal} kcal · ${RECIPES[id].protein} g protein</span></span>
                ${icon('chevron', 'chev')}
              </a>`).join('')}</div>`
          : '<p class="muted small pad-x">None yet. Tap “Save to favourites” on any recipe.</p>'}`,
    };
  }

  return { progress, weights, bests, favourites, recentBests, weekStreak };
})();

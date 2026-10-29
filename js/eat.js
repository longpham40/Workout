'use strict';

// Eat tab: your meal plan, meal swaps, and the recipe library.
//   #/eat                   meal plan for your goal
//   #/eat/swap/<slot>       pick another recipe for one meal
//   #/recipes               recipe library
//   #/recipe/<id>[/<n>]     a recipe, optionally scaled to n portions
const EatScreens = (() => {
  const { icon, esc, sectionTitle } = UI;

  const DAYS = 3;
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  const FRACTIONS = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
  function fraction(n) {
    const q = Math.round(n * 4) / 4;
    const whole = Math.floor(q);
    const part = FRACTIONS[q - whole] || '';
    return whole ? `${whole}${part}` : part || '0';
  }
  const portionText = n => `${fraction(n)} ${n <= 1 ? 'portion' : 'portions'}`;

  // ---------- Meal plan maths ----------

  function targetsFor() {
    const p = Store.state.profile;
    return Nutrition.targets(p) || { ...Nutrition.EXAMPLE_TARGETS[p.goal], goal: Nutrition.GOALS[p.goal], example: true };
  }

  // Rotates through the 3 sample days by date, unless you've picked one.
  function dayIndex() {
    const saved = Store.state.ui.mealDay;
    if (Number.isInteger(saved)) return saved % DAYS;
    const startOfYear = new Date(new Date().getFullYear(), 0, 0);
    return Math.floor((Date.now() - startOfYear) / 86400000) % DAYS;
  }

  const swapKey = (goal, day, slot) => `${goal}:${day}:${slot}`;

  function planFor(goal, day) {
    const swaps = Store.state.mealSwaps || {};
    const slots = MEAL_PLANS[goal][day].map(([label, original], slot) => {
      const swapped = swaps[swapKey(goal, day, slot)];
      const id = RECIPES[swapped] ? swapped : original;
      return { label, slot, id, original, swapped: id !== original };
    });
    const base = slots.reduce((t, s) => t + RECIPES[s.id].kcal, 0);
    const target = targetsFor();
    // Scale every portion in quarter steps so the day lands near your target.
    const factor = clamp(Math.round((target.kcal / base) * 4) / 4, 0.75, 2);
    return {
      slots,
      factor,
      target,
      kcal: Math.round(base * factor),
      protein: Math.round(slots.reduce((t, s) => t + RECIPES[s.id].protein, 0) * factor),
    };
  }

  // ---------- Meal plan screen ----------

  function meter(label, value, target, unit) {
    const pct = Math.min(100, Math.round((value / target) * 100));
    return `
      <div class="meter">
        <div class="meter-top"><span>${label}</span><span><strong>${value.toLocaleString()}</strong> / ${target.toLocaleString()} ${unit}</span></div>
        <div class="meter-bar" role="img" aria-label="${pct}% of target"><span style="width: ${pct}%"></span></div>
      </div>`;
  }

  function mealRow(s, factor) {
    const r = RECIPES[s.id];
    return `
      <div class="meal-row">
        <a class="meal-main" href="#/recipe/${s.id}/${factor}">
          <span class="eyebrow">${esc(s.label)}${s.swapped ? ' · swapped' : ''}</span>
          <strong class="block">${esc(r.name)}</strong>
          <span class="muted small block">${Math.round(r.kcal * factor)} kcal · ${Math.round(r.protein * factor)} g protein · ${r.minutes} min</span>
        </a>
        <a class="btn small-btn quiet swap-btn" href="#/eat/swap/${s.slot}" aria-label="Swap ${esc(r.name)}">${icon('swap', 'inline')}Swap</a>
      </div>`;
  }

  function eat(sub, slot) {
    if (sub === 'swap') return swap(slot);
    const goalId = Store.state.profile.goal;
    const day = dayIndex();
    const plan = planFor(goalId, day);
    const t = plan.target;

    return {
      title: 'Eat',
      html: `
        <section class="card stack">
          <div class="plan-head">
            <p class="eyebrow">Meal plan · ${esc(t.goal.name)}</p>
            <div class="day-pick" role="group" aria-label="Sample day">
              ${Array.from({ length: DAYS }, (_, i) => `<button class="filter" data-day="${i}" aria-pressed="${i === day}">Day ${i + 1}</button>`).join('')}
            </div>
          </div>
          ${meter('Calories', plan.kcal, t.kcal, 'kcal')}
          ${meter('Protein', plan.protein, t.protein, 'g')}
          <p class="hint">${t.example
            ? 'Using an example target. <a href="#/settings">Add your details</a> to get your own.'
            : plan.factor === 1
              ? 'Each meal is one portion, as written in the recipe.'
              : `Each meal is ${portionText(plan.factor)} to fit your target. Recipes open already scaled.`}</p>
        </section>

        <div class="list">${plan.slots.map(s => mealRow(s, plan.factor)).join('')}</div>
        ${plan.slots.some(s => s.swapped) ? '<button class="btn quiet" data-action="reset-swaps">Undo my swaps for this day</button>' : ''}

        <a class="card link-card" href="#/recipes">
          <span class="type-icon" style="--c: var(--home)">${icon('eat')}</span>
          <div>
            <h3>Recipe library</h3>
            <p class="muted small">All ${Object.keys(RECIPES).length} recipes, with calories, protein and step-by-step methods.</p>
          </div>
          ${icon('chevron', 'chev')}
        </a>

        ${sectionTitle('Your goal')}
        <div class="list" role="radiogroup" aria-label="Your goal">
          ${Object.entries(Nutrition.GOALS).map(([id, g]) => `
            <button class="row-option" role="radio" aria-checked="${goalId === id}" data-goal="${id}">
              <span><strong>${esc(g.name)}</strong><span class="muted small block">${esc(g.blurb)}</span></span>
              <span class="radio" aria-hidden="true"></span>
            </button>`).join('')}
        </div>

        ${sectionTitle('Nutrition tips')}
        <section class="card">
          <ul class="tips small">${[...NUTRITION_TIPS[goalId], ...NUTRITION_TIPS.all].map(tip => `<li>${icon('check', 'tip-icon')}<span>${esc(tip)}</span></li>`).join('')}</ul>
        </section>
        <p class="hint center">Calories and protein are estimates. Food labels and portion sizes vary.</p>`,
      mount(page) {
        page.addEventListener('click', e => {
          const b = e.target.closest('[data-day], [data-goal], [data-action]');
          if (!b) return;
          if (b.dataset.day) {
            Store.update(s => { s.ui.mealDay = Number(b.dataset.day); });
          } else if (b.dataset.goal) {
            Store.update(s => { s.profile.goal = b.dataset.goal; });
          } else if (b.dataset.action === 'reset-swaps') {
            Store.update(s => {
              for (const key of Object.keys(s.mealSwaps || {})) {
                if (key.startsWith(`${goalId}:${day}:`)) delete s.mealSwaps[key];
              }
            });
          }
          App.refresh();
        });
      },
    };
  }

  // ---------- Swap one meal ----------

  function swap(slotParam) {
    const goalId = Store.state.profile.goal;
    const day = dayIndex();
    const plan = planFor(goalId, day);
    const s = plan.slots[Number(slotParam)];
    if (!s) return eat();
    const current = RECIPES[s.id];
    const mealType = RECIPES[s.original].meal;
    const options = Object.entries(RECIPES)
      .filter(([id, r]) => r.meal === mealType && id !== s.id)
      .sort(([, a], [, b]) => Math.abs(a.kcal - current.kcal) - Math.abs(b.kcal - current.kcal));

    return {
      title: `Swap ${s.label.toLowerCase()}`,
      tab: 'eat',
      back: { href: '#/eat', label: 'Eat' },
      html: `
        <p class="muted pad-x">Instead of <strong>${esc(current.name)}</strong> (${Math.round(current.kcal * plan.factor)} kcal). Closest in calories first.</p>
        <div class="list">
          ${options.map(([id, r]) => `
            <button class="row-link as-button" data-pick="${id}">
              <span class="row-main">
                <strong>${esc(r.name)}${id === s.original ? ' <span class="chip">Original</span>' : ''}</strong>
                <span class="muted small block">${Math.round(r.kcal * plan.factor)} kcal · ${Math.round(r.protein * plan.factor)} g protein · ${r.minutes} min${r.tags.includes('vegetarian') ? ' · Vegetarian' : ''}</span>
              </span>
              ${Store.isFavourite('recipes', id) ? icon('heart', 'fav-mark') : ''}
            </button>`).join('')}
        </div>`,
      mount(page) {
        page.addEventListener('click', e => {
          const id = e.target.closest('[data-pick]')?.dataset.pick;
          if (!id) return;
          Store.update(st => {
            st.mealSwaps ||= {};
            const key = swapKey(goalId, day, s.slot);
            if (id === s.original) delete st.mealSwaps[key];
            else st.mealSwaps[key] = id;
          });
          location.hash = '#/eat';
          UI.toast('Meal swapped');
        });
      },
    };
  }

  // ---------- Recipe library ----------

  const FILTERS = [
    { id: 'all', label: 'All', test: () => true },
    { id: 'favourites', label: 'Favourites', test: (r, id) => Store.isFavourite('recipes', id) },
    { id: 'breakfast', label: 'Breakfast', test: r => r.meal === 'breakfast' },
    { id: 'lunch', label: 'Lunch', test: r => r.meal === 'lunch' },
    { id: 'dinner', label: 'Dinner', test: r => r.meal === 'dinner' },
    { id: 'snack', label: 'Snacks', test: r => r.meal === 'snack' },
    { id: 'vegetarian', label: 'Vegetarian', test: r => r.tags.includes('vegetarian') },
    { id: 'quick', label: '10 min or less', test: r => r.minutes <= 10 },
    { id: 'protein', label: '30 g+ protein', test: r => r.protein >= 30 },
  ];
  let libraryFilter = 'all';
  let libraryQuery = '';

  function recipes() {
    return {
      title: 'Recipes',
      tab: 'eat',
      back: { href: '#/eat', label: 'Eat' },
      html: `
        <input type="search" class="search" placeholder="Search recipes or ingredients" value="${esc(libraryQuery)}" aria-label="Search recipes">
        <div class="filters" role="group" aria-label="Filter">
          ${FILTERS.map(f => `<button class="filter" data-filter="${f.id}" aria-pressed="${f.id === libraryFilter}">${esc(f.label)}</button>`).join('')}
        </div>
        <div class="results"></div>`,
      mount(page) {
        const results = page.querySelector('.results');
        const draw = () => {
          const q = libraryQuery.trim().toLowerCase();
          const filter = FILTERS.find(f => f.id === libraryFilter);
          const list = Object.entries(RECIPES)
            .filter(([id, r]) => filter.test(r, id))
            .filter(([, r]) => !q || `${r.name} ${r.ingredients.map(i => i[2]).join(' ')}`.toLowerCase().includes(q))
            .sort(([, a], [, b]) => a.name.localeCompare(b.name));
          results.innerHTML = list.length
            ? `<p class="muted small pad-x">${list.length} recipe${list.length === 1 ? '' : 's'}</p>
               <div class="list">${list.map(([id, r]) => `
                 <a class="row-link" href="#/recipe/${id}">
                   <span class="row-main">
                     <strong>${esc(r.name)}</strong>
                     <span class="muted small block">${r.kcal} kcal · ${r.protein} g protein · ${r.minutes} min</span>
                   </span>
                   ${Store.isFavourite('recipes', id) ? icon('heart', 'fav-mark') : ''}
                   ${icon('chevron', 'chev')}
                 </a>`).join('')}</div>`
            : `<section class="card empty"><p class="muted">${libraryFilter === 'favourites' && !q
                ? 'No favourite recipes yet. Tap “Save to favourites” on any recipe.'
                : 'No recipes match.'}</p></section>`;
        };
        page.querySelector('.search').addEventListener('input', e => { libraryQuery = e.target.value; draw(); });
        page.querySelector('.filters').addEventListener('click', e => {
          const b = e.target.closest('[data-filter]');
          if (!b) return;
          libraryFilter = b.dataset.filter;
          page.querySelectorAll('.filter').forEach(f => f.setAttribute('aria-pressed', f === b));
          draw();
        });
        draw();
      },
    };
  }

  // ---------- One recipe ----------

  const TAG_LABELS = { vegetarian: 'Vegetarian', vegan: 'Vegan', 'no-cook': 'No cooking', batch: 'Batch-cook friendly', budget: 'Budget' };

  // [amount, unit, item] → text, scaled, in your units.
  function formatIngredient([amount, unit, item], portions, imperial) {
    if (amount == null) return esc(item);
    let n = amount * portions;
    let u = unit;
    if (imperial && u === 'g') { n /= 28.35; u = 'oz'; }
    if (imperial && u === 'ml') {
      if (n >= 60) { n /= 240; u = 'cup'; } else { n /= 15; u = 'tbsp'; }
    }
    let qty;
    if (u === 'g' || u === 'ml') qty = String(Math.max(5, Math.round(n / 5) * 5));
    else if (u === 'oz' && n >= 10) qty = String(Math.round(n));
    else if (u === '') qty = fraction(Math.max(0.5, Math.round(n * 2) / 2));
    else qty = fraction(Math.max(0.25, n));
    const plural = n > 1.01;
    const unitText = { cup: plural ? 'cups' : 'cup', scoop: plural ? 'scoops' : 'scoop' }[u] ?? u;
    return `<strong>${qty}${unitText ? ` ${unitText}` : ''}</strong> ${esc(item)}`;
  }

  function recipe(id, portionsParam) {
    const r = RECIPES[id];
    if (!r) return recipes();
    let portions = clamp(parseFloat(portionsParam) || 1, 0.5, 4);
    const fav = Store.isFavourite('recipes', id);
    const imperial = Store.state.profile.units === 'imperial';
    const tags = [
      { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' }[r.meal],
      `${r.minutes} min`,
      ...r.tags.map(t => TAG_LABELS[t]).filter(Boolean),
    ];

    return {
      title: r.name,
      tab: 'eat',
      back: portionsParam ? { href: '#/eat', label: 'Eat' } : { href: '#/recipes', label: 'Recipes' },
      html: `
        <div class="chips">${tags.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>

        <section class="card stack">
          <div class="portion-row">
            <span class="label">Portions</span>
            <div class="stepper">
              <button data-step="-0.25" aria-label="Fewer portions">−</button>
              <output class="portions" aria-live="polite"></output>
              <button data-step="0.25" aria-label="More portions">+</button>
            </div>
          </div>
          <div class="macros"></div>
        </section>

        ${sectionTitle('Ingredients')}
        <section class="card"><ul class="ingredients"></ul></section>

        ${sectionTitle('Method')}
        <section class="card"><ol class="howto">${r.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></section>

        ${sectionTitle('Chef’s tip')}
        <section class="card note small">${esc(r.tip)}</section>

        <button class="btn fav" data-action="fav" aria-pressed="${fav}">
          ${icon('heart', 'inline')} ${fav ? 'Saved to favourites' : 'Save to favourites'}
        </button>
        <p class="hint center">Nutrition figures are rough estimates for the portions shown.</p>`,
      mount(page) {
        const draw = () => {
          page.querySelector('.portions').textContent = fraction(portions);
          const macro = (value, label, unit = 'g') =>
            `<div class="stat"><div class="stat-value">${Math.round(value * portions)}<small>${unit}</small></div><div class="stat-label">${label}</div></div>`;
          page.querySelector('.macros').innerHTML =
            macro(r.kcal, 'Calories', '') + macro(r.protein, 'Protein') + macro(r.carbs, 'Carbs') + macro(r.fat, 'Fat');
          page.querySelector('.ingredients').innerHTML =
            r.ingredients.map(i => `<li>${formatIngredient(i, portions, imperial)}</li>`).join('');
        };
        page.addEventListener('click', e => {
          const step = e.target.closest('[data-step]')?.dataset.step;
          if (step) {
            portions = clamp(portions + Number(step), 0.5, 4);
            draw();
            return;
          }
          const favButton = e.target.closest('[data-action="fav"]');
          if (favButton) {
            // Updated in place so your portion choice stays put.
            const added = Store.toggleFavourite('recipes', id);
            favButton.setAttribute('aria-pressed', added);
            favButton.innerHTML = `${icon('heart', 'inline')} ${added ? 'Saved to favourites' : 'Save to favourites'}`;
            UI.toast(added ? 'Saved to favourites' : 'Removed from favourites');
          }
        });
        draw();
      },
    };
  }

  return { eat, recipes, recipe };
})();

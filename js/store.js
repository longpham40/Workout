'use strict';

// Everything you save lives in this browser's storage on your phone, as one JSON object.
const Store = (() => {
  const KEY = 'train-eat/v1';

  const defaults = () => ({
    version: 1,
    profile: {
      units: 'metric', // 'metric' (kg, cm) or 'imperial' (lb, ft)
      sex: '',
      age: '',
      heightCm: '',
      weightKg: '',
      activity: 'light',
      goal: 'maintain',
    },
    program: null,   // { type, level, next } — the program chosen in Train
    favourites: { exercises: [], recipes: [] },
    mealSwaps: {},   // { 'goal:day:slot': recipe id } — meals you swapped in the plan
    active: null,    // the workout in progress
    sessions: [],    // finished workouts
    bodyWeights: [], // { date, kg }
    chat: [],        // { role: 'user' | 'assistant', content } — your coach chat
    ui: {},          // small preferences, like hidden tips
    createdAt: new Date().toISOString(),
  });

  // Fills in any fields added in later versions of the app.
  function withDefaults(saved) {
    const d = defaults();
    return {
      ...d,
      ...saved,
      profile: { ...d.profile, ...saved.profile },
      favourites: { ...d.favourites, ...saved.favourites },
      ui: { ...d.ui, ...saved.ui },
    };
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved && saved.version === 1) return withDefaults(saved);
    } catch {}
    return defaults();
  }

  let state = load();

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  return {
    get state() { return state; },

    update(change) {
      change(state);
      return save();
    },

    isFavourite(kind, id) {
      return state.favourites[kind].includes(id);
    },

    toggleFavourite(kind, id) {
      const list = state.favourites[kind];
      const i = list.indexOf(id);
      if (i === -1) list.push(id); else list.splice(i, 1);
      save();
      return i === -1;
    },

    exportJSON() {
      return JSON.stringify(state, null, 2);
    },

    importJSON(text) {
      const data = JSON.parse(text);
      if (!data || data.version !== 1 || typeof data.profile !== 'object' || !Array.isArray(data.sessions)) {
        throw new Error('Not a Train & Eat backup');
      }
      state = withDefaults(data);
      save();
    },

    reset() {
      state = defaults();
      save();
    },
  };
})();

'use strict';

// The full exercise library: the app's own coached exercises plus 800+ more from
// free-exercise-db (public domain). The extra ones load from data/exercise-db.json
// the first time the library opens. Their photos come from the jsDelivr CDN and
// are saved for offline use once you've seen them.
const ExerciseDB = (() => {
  // Pinned to one version of the dataset, so photos always match data/exercise-db.json.
  const IMAGE_BASE = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5/exercises/';

  const MUSCLE_NAMES = {
    abdominals: 'Abs', abductors: 'Outer hips', adductors: 'Inner thighs', biceps: 'Biceps', calves: 'Calves',
    chest: 'Chest', forearms: 'Forearms', glutes: 'Glutes', hamstrings: 'Hamstrings', lats: 'Lats',
    'lower back': 'Lower back', 'middle back': 'Middle back', neck: 'Neck', quadriceps: 'Quads',
    shoulders: 'Shoulders', traps: 'Traps', triceps: 'Triceps',
  };

  // The muscle filter groups the dataset's muscles into everyday names.
  const MUSCLE_GROUPS = [
    { id: 'chest', name: 'Chest', muscles: ['chest'] },
    { id: 'back', name: 'Back', muscles: ['lats', 'middle back', 'traps'] },
    { id: 'lower-back', name: 'Lower back', muscles: ['lower back'] },
    { id: 'shoulders', name: 'Shoulders', muscles: ['shoulders'] },
    { id: 'biceps', name: 'Biceps', muscles: ['biceps'] },
    { id: 'triceps', name: 'Triceps', muscles: ['triceps'] },
    { id: 'forearms', name: 'Forearms', muscles: ['forearms'] },
    { id: 'core', name: 'Core', muscles: ['abdominals'] },
    { id: 'glutes', name: 'Glutes', muscles: ['glutes', 'abductors'] },
    { id: 'quads', name: 'Quads', muscles: ['quadriceps'] },
    { id: 'hamstrings', name: 'Hamstrings', muscles: ['hamstrings'] },
    { id: 'inner-thighs', name: 'Inner thighs', muscles: ['adductors'] },
    { id: 'calves', name: 'Calves', muscles: ['calves'] },
    { id: 'neck', name: 'Neck', muscles: ['neck'] },
  ];

  const GEAR = [
    { id: 'bodyweight', name: 'Bodyweight' },
    { id: 'dumbbell', name: 'Dumbbells' },
    { id: 'barbell', name: 'Barbell' },
    { id: 'kettlebell', name: 'Kettlebell' },
    { id: 'machine', name: 'Machine' },
    { id: 'cable', name: 'Cable' },
    { id: 'bands', name: 'Bands' },
    { id: 'other', name: 'Other' },
  ];

  const CATEGORY_NAMES = {
    strength: 'Strength', cardio: 'Cardio', plyometrics: 'Jumps and power', stretching: 'Stretching',
    powerlifting: 'Powerlifting', 'olympic weightlifting': 'Olympic lifting', strongman: 'Strongman',
  };

  const LEVEL_ORDER = ['beginner', 'intermediate', 'advanced'];
  const HEAVY_GEAR = new Set(['barbell', 'dumbbell', 'kettlebell', 'machine', 'cable']);
  const BARBELL_SPORTS = new Set(['powerlifting', 'olympic weightlifting', 'strongman']);

  // Which workout types an extra exercise suits, worked out from its equipment and category.
  function typesForExtra(e) {
    const types = new Set();
    if (e.category === 'stretching') types.add('stretching');
    else if (e.category === 'cardio') types.add('cardio');
    else {
      if (HEAVY_GEAR.has(e.gear) || BARBELL_SPORTS.has(e.category)) types.add('gym');
      if (e.gear === 'bodyweight' || e.gear === 'bands' || e.gear === 'dumbbell') types.add('home');
      if (e.gear === 'bodyweight') types.add('calisthenics');
    }
    return types;
  }

  // The coached exercises, in the same shape as the extra ones.
  let coachedList = null;
  function coached() {
    coachedList ||= Object.entries(EXERCISES).map(([id, ex]) => {
      const tag = EXERCISE_TAGS[id] || {};
      return {
        id,
        name: ex.name,
        coached: true,
        primary: tag.primary || [],
        secondary: tag.secondary || [],
        gear: tag.gear || 'other',
        category: tag.category || 'strength',
        level: TrainScreens.levelFor(id),
        types: TrainScreens.typesFor(id),
      };
    });
    return coachedList;
  }

  let extra = null;
  let byId = {};
  let loading = null;

  function load() {
    if (extra) return Promise.resolve(extra);
    loading ||= fetch('data/exercise-db.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(list => {
        // Skip the ones the app already coaches, so nothing is listed twice.
        const covered = new Set(Object.values(EXERCISE_TAGS).map(t => t.db).filter(Boolean));
        extra = list.filter(e => !covered.has(e.id)).map(e => ({ ...e, types: typesForExtra(e) }));
        byId = Object.fromEntries(extra.map(e => [e.id, e]));
        return extra;
      })
      .catch(err => {
        loading = null;
        throw err;
      });
    return loading;
  }

  const photos = e => Array.from({ length: Math.min(e.images || 0, 2) }, (_, i) => `${IMAGE_BASE}${e.id}/${i}.jpg`);

  function matches(e, { q, type, muscle, gear, level }) {
    if (type === 'favourites' && !(e.coached && Store.isFavourite('exercises', e.id))) return false;
    if (type && type !== 'all' && type !== 'favourites' && !e.types.has(type)) return false;
    if (gear && e.gear !== gear) return false;
    if (level && e.level !== level) return false;
    if (muscle) {
      const group = MUSCLE_GROUPS.find(g => g.id === muscle);
      if (!e.primary.some(m => group.muscles.includes(m))) return false;
    }
    if (q) {
      const words = [e.name, ...e.primary.map(m => MUSCLE_NAMES[m] || m), e.coached ? EXERCISES[e.id].muscles : ''].join(' ').toLowerCase();
      if (!q.split(/\s+/).every(w => words.includes(w))) return false;
    }
    return true;
  }

  const muscleNames = list => list.map(m => MUSCLE_NAMES[m] || m).join(', ');
  const gearName = id => GEAR.find(g => g.id === id)?.name || 'Other';
  const levelName = id => LEVELS.find(l => l.id === id)?.name || '';

  return {
    MUSCLE_GROUPS, GEAR, CATEGORY_NAMES, LEVEL_ORDER,
    load, loaded: () => !!extra, get: id => byId[id], coached, extra: () => extra || [],
    photos, matches, muscleNames, gearName, levelName,
  };
})();

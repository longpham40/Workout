// Checks the app's content for broken links between files.
//   Run:  node tools/check.js
// It loads the data files the same way the browser does and reports anything
// that points at a missing exercise, photo or recipe. No installs needed.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const DATA_FILES = [
  'data/workouts.js',
  'data/exercises.js',
  'data/exercise-photos.js',
  'data/programs.js',
  'data/body-areas.js',
  'data/recipes.js',
  'data/meal-plans.js',
];

// Top-level `const` in a browser script becomes a global; `var` does the same here.
const ctx = {};
vm.createContext(ctx);
for (const file of DATA_FILES) {
  const code = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/^const /gm, 'var ');
  vm.runInContext(code, ctx, { filename: file });
}
const { EXERCISES, EXERCISE_PHOTOS, PROGRAMS, BODY_AREAS, AREA_TYPES, AREA_WORKOUTS, TRAINING_TYPES, LEVELS, WARMUPS, COOLDOWNS, RECIPES, MEAL_PLANS } = ctx;

const problems = [];
const fail = msg => problems.push(msg);

// Every exercise has the fields the screens rely on.
for (const [id, ex] of Object.entries(EXERCISES)) {
  for (const key of ['name', 'muscles', 'equipment', 'steps', 'safety', 'easier', 'harder']) {
    if (!ex[key] || (Array.isArray(ex[key]) && !ex[key].length)) fail(`exercise ${id}: missing ${key}`);
  }
}

// Photos exist on disk.
for (const [id, p] of Object.entries(EXERCISE_PHOTOS)) {
  if (!EXERCISES[id]) fail(`photo for unknown exercise ${id}`);
  for (const f of p.frames || [0, 1]) {
    const file = path.join(ROOT, 'images/exercises', `${p.name}-${f}.jpg`);
    if (!fs.existsSync(file)) fail(`photo missing: images/exercises/${p.name}-${f}.jpg`);
  }
}

function checkWorkout(where, workout) {
  if (!workout?.main?.length) return fail(`${where}: no exercises`);
  workout.main.forEach((rx, i) => {
    if (!EXERCISES[rx.ex]) fail(`${where} #${i + 1}: unknown exercise "${rx.ex}"`);
    if (!(rx.sets >= 1)) fail(`${where} #${i + 1}: sets should be 1 or more`);
    if (!rx.reps) fail(`${where} #${i + 1}: missing reps`);
  });
}

// Programs: every type and level, every day.
for (const type of TRAINING_TYPES) {
  if (!WARMUPS[type.id] || !COOLDOWNS[type.id]) fail(`${type.id}: missing warm-up or cool-down`);
  for (const level of LEVELS) {
    const prog = PROGRAMS[type.id]?.[level.id];
    if (!prog) { fail(`program ${type.id}/${level.id} is missing`); continue; }
    for (const key of ['summary', 'duration', 'schedule', 'effort', 'progression', 'deload']) {
      if (!prog[key]) fail(`program ${type.id}/${level.id}: missing ${key}`);
    }
    prog.days.forEach((day, i) => checkWorkout(`program ${type.id}/${level.id} day ${i + 1}`, day));
  }
}

// Upper and lower body workouts.
for (const area of BODY_AREAS) {
  for (const typeId of AREA_TYPES) {
    for (const level of LEVELS) checkWorkout(`${area.id}/${typeId}/${level.id}`, AREA_WORKOUTS[area.id]?.[typeId]?.[level.id]);
  }
}

// Meal plans point at real recipes.
for (const [goal, days] of Object.entries(MEAL_PLANS)) {
  days.forEach((day, d) => {
    const slots = Array.isArray(day) ? day : day.meals || day.slots || [];
    for (const slot of slots) {
      const recipeId = Array.isArray(slot) ? slot[1] : slot.recipe;
      if (recipeId && !RECIPES[recipeId]) fail(`meal plan ${goal} day ${d + 1}: unknown recipe "${recipeId}"`);
    }
  });
}

// Every file the service worker saves for offline use exists.
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
for (const [, file] of sw.matchAll(/'\.\/([^']+)'/g)) {
  if (file && !fs.existsSync(path.join(ROOT, file))) fail(`sw.js lists a missing file: ${file}`);
}

// Every script in index.html exists and is saved for offline use.
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
for (const [, src] of html.matchAll(/<script src="([^"]+)"/g)) {
  if (!fs.existsSync(path.join(ROOT, src))) fail(`index.html loads a missing file: ${src}`);
  if (!sw.includes(`'./${src}'`)) fail(`${src} isn't in sw.js APP_FILES, so it won't work offline`);
}

const counts = `${Object.keys(EXERCISES).length} exercises, ${Object.keys(RECIPES).length} recipes`;
if (problems.length) {
  console.log(`Found ${problems.length} problem${problems.length === 1 ? '' : 's'} (${counts}):`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
}
console.log(`All good: ${counts}.`);
